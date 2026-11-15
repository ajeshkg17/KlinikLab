#!/usr/bin/env node
// Local, loopback-only Gemini API gateway. It never stores or logs API keys.
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';

const HOST = '127.0.0.1';
const PORT = 8787;
const GOOGLE_HOST = 'generativelanguage.googleapis.com';
const MAX_PER_MINUTE = 5;
const WINDOW_MS = 60_000;
const MIN_GAP_MS = 12_100;
const STARTUP_QUIET_MS = 60_000;
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const MAX_PENDING_REQUESTS = 8;
const UPSTREAM_TIMEOUT_MS = 10 * 60_000;
const MODEL_PATHS = ['/v1beta/models', '/v1alpha/models', '/v1/models'];
const STATUS_PATH = '/_rate_limit/status';

const stateRoot = process.env.LOCALAPPDATA || process.env.APPDATA || path.join(os.homedir(), '.local', 'state');
const stateDirectory = path.join(stateRoot, 'KlinikLabGeminiRateGate');
const stateFile = path.join(stateDirectory, 'dispatch-window.json');

let dispatchTimes = [];
let runtimeDispatchTimes = [];
let lastDispatchAt = 0;
let upstreamCooldownUntil = performance.now();
let startupQuietUntil = performance.now() + STARTUP_QUIET_MS;
let queued = [];
let receivingBodies = 0;
let dispatching = false;
let inFlight = null;
let pumpTimer = null;
let failClosed = false;
let stopping = false;

function json(res, status, value, extraHeaders = {}) {
  if (res.destroyed || res.headersSent) return;
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function isLoopback(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function isGeminiModelPath(pathname) {
  return MODEL_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function recentDispatches(now = performance.now()) {
  return runtimeDispatchTimes.filter((timestamp) => Number.isFinite(timestamp) && timestamp > now - WINDOW_MS);
}

function nextAllowedAt(now = performance.now()) {
  const recent = recentDispatches(now);
  const spacingAt = lastDispatchAt > 0 ? lastDispatchAt + MIN_GAP_MS : now;
  const rollingWindowAt = recent.length >= MAX_PER_MINUTE
    ? recent[0] + WINDOW_MS + 100
    : now;
  return Math.max(now, startupQuietUntil, upstreamCooldownUntil, spacingAt, rollingWindowAt);
}

function statusSnapshot() {
  const now = performance.now();
  const recent = recentDispatches(now);
  return {
    host: HOST,
    port: PORT,
    maxRequestsPerMinute: MAX_PER_MINUTE,
    minimumGapMs: MIN_GAP_MS,
    recentDispatches: recent.length,
    queuedRequests: queued.length,
    receivingBodies,
    inFlight: Boolean(inFlight),
    failClosed,
    nextDispatchInMs: inFlight || dispatching ? null : Math.max(0, nextAllowedAt(now) - now),
    startupQuietRemainingMs: Math.max(0, startupQuietUntil - now),
    upstreamCooldownRemainingMs: Math.max(0, upstreamCooldownUntil - now),
  };
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      length += chunk.length;
      if (length > MAX_BODY_BYTES) {
        settled = true;
        chunks.length = 0;
        reject(Object.assign(new Error('Request body exceeds the local limit.'), { code: 'BODY_TOO_LARGE' }));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });

    req.once('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks, length));
    });

    req.once('aborted', () => {
      if (settled) return;
      settled = true;
      reject(Object.assign(new Error('Client aborted request.'), { code: 'CLIENT_ABORTED' }));
    });

    req.once('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

async function loadState() {
  try {
    const parsed = JSON.parse(await readFile(stateFile, 'utf8'));
    if (parsed.version !== 1 || !Array.isArray(parsed.dispatchTimes)) {
      throw new Error('Invalid rate-limit state format.');
    }
    const wallNow = Date.now();
    dispatchTimes = parsed.dispatchTimes
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp > wallNow - WINDOW_MS)
      .slice(-MAX_PER_MINUTE);
    // Runtime throttling uses the monotonic clock. A full startup quiet window
    // makes pre-restart dispatches expire before this process sends any request.
    runtimeDispatchTimes = [];
    lastDispatchAt = 0;
  } catch (error) {
    if (error.code === 'ENOENT') {
      dispatchTimes = [];
      lastDispatchAt = 0;
      return;
    }
    // A corrupt/unreadable ledger must stop the proxy; starting empty could exceed quota.
    throw new Error(`Cannot safely load rate-limit state (${error.code || 'invalid state'}); no API calls will be forwarded.`);
  }
}

async function persistState(times) {
  await mkdir(stateDirectory, { recursive: true });
  const temporaryFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporaryFile, JSON.stringify({ version: 1, dispatchTimes: times }), { encoding: 'utf8', mode: 0o600 });
    await rename(temporaryFile, stateFile);
  } catch (error) {
    try { await unlink(temporaryFile); } catch { /* best effort cleanup */ }
    throw error;
  }
}

function replyHopByHopHeaders(headers) {
  const clean = {};
  const blocked = new Set([
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'proxy-connection', 'transfer-encoding', 'upgrade',
  ]);
  for (const [name, value] of Object.entries(headers)) {
    if (!blocked.has(name.toLowerCase()) && value !== undefined) clean[name] = value;
  }
  return clean;
}

function requestHeaders(incoming, bodyLength) {
  const clean = { ...incoming };
  for (const name of [
    'host', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'proxy-connection', 'transfer-encoding', 'upgrade', 'expect',
  ]) delete clean[name];
  clean.host = GOOGLE_HOST;
  clean['content-length'] = String(bodyLength);
  return clean;
}

function retryDelayMs(header) {
  if (header == null) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 24 * 60 * 60_000);
  const date = Date.parse(String(header));
  return Number.isFinite(date) ? Math.max(0, Math.min(date - Date.now(), 24 * 60 * 60_000)) : 0;
}

function log(message) {
  // Never log query strings, headers, request bodies, or API error bodies.
  process.stdout.write(`[gemini-rate-gate] ${message}\n`);
}

function forwardToGoogle(item, dispatchAt) {
  const { req, res } = item;
  const queueWaitMs = Math.max(0, dispatchAt - item.receivedAt);
  let completed = false;
  let upstreamRequest;

  const finish = () => {
    if (completed) return;
    completed = true;
    if (inFlight === item) inFlight = null;
    if (!stopping) schedulePump();
  };

  const responseHeaders = (headers) => ({
    ...replyHopByHopHeaders(headers),
    'x-kliniklab-rate-gate-wait-ms': String(queueWaitMs),
  });

  upstreamRequest = https.request({
    protocol: 'https:',
    hostname: GOOGLE_HOST,
    port: 443,
    method: item.method,
    path: item.upstreamPath,
    headers: requestHeaders(item.headers, item.body.length),
    timeout: UPSTREAM_TIMEOUT_MS,
  }, (upstreamResponse) => {
    const statusCode = upstreamResponse.statusCode || 502;
    if (statusCode === 429) {
      const requestedWait = retryDelayMs(upstreamResponse.headers['retry-after']);
      upstreamCooldownUntil = Math.max(upstreamCooldownUntil, performance.now() + Math.max(WINDOW_MS, requestedWait));
    }
    log(`${item.method} ${item.pathname} -> ${statusCode}; queue wait ${queueWaitMs} ms`);
    if (!res.destroyed) res.writeHead(statusCode, responseHeaders(upstreamResponse.headers));
    upstreamResponse.on('end', finish);
    upstreamResponse.on('error', () => {
      if (!res.destroyed && !res.headersSent) json(res, 502, { error: 'Google response stream failed.' });
      else if (!res.destroyed) res.destroy();
      finish();
    });
    upstreamResponse.pipe(res);
  });

  upstreamRequest.setTimeout(UPSTREAM_TIMEOUT_MS, () => upstreamRequest.destroy(Object.assign(new Error('Upstream timeout.'), { code: 'ETIMEDOUT' })));
  upstreamRequest.once('error', (error) => {
    log(`upstream connection failed (${error.code || 'network error'})`);
    if (!res.destroyed && !res.headersSent) json(res, 502, { error: 'Could not reach the Gemini API.' });
    else if (!res.destroyed) res.destroy();
    finish();
  });

  res.once('close', () => {
    if (!res.writableEnded) {
      upstreamRequest.destroy();
      finish();
    }
  });
  upstreamRequest.end(item.body);
}

function rejectQueued(status, message) {
  for (const item of queued.splice(0)) {
    if (!item.res.destroyed) json(item.res, status, { error: message }, { 'retry-after': '60' });
  }
}

function schedulePump() {
  if (stopping || failClosed || dispatching || inFlight || pumpTimer) return;
  queued = queued.filter((item) => !item.cancelled && !item.req.aborted && !item.res.destroyed);
  if (queued.length === 0) return;

  const now = performance.now();
  const waitMs = Math.max(0, nextAllowedAt(now) - now);
  if (waitMs > 0) {
    pumpTimer = setTimeout(() => {
      pumpTimer = null;
      schedulePump();
    }, waitMs);
    pumpTimer.unref?.();
    return;
  }

  const item = queued.shift();
  if (!item) return;
  dispatching = true;
  const reservedAt = Date.now();
  const updatedTimes = [...dispatchTimes.filter((timestamp) => timestamp > reservedAt - WINDOW_MS), reservedAt].slice(-MAX_PER_MINUTE);

  void persistState(updatedTimes).then(() => {
    dispatchTimes = updatedTimes;
    // Anchor in-process spacing at the monotonic dispatch time, after the
    // durable reservation, so wall-clock adjustments cannot create a burst.
    const actualDispatchAt = performance.now();
    runtimeDispatchTimes = [...recentDispatches(actualDispatchAt), actualDispatchAt].slice(-MAX_PER_MINUTE);
    lastDispatchAt = actualDispatchAt;
    dispatching = false;
    if (item.cancelled || item.req.aborted || item.res.destroyed) {
      // The reserved slot is kept in the ledger. Over-counting is safer than bursting.
      schedulePump();
      return;
    }
    inFlight = item;
    forwardToGoogle(item, actualDispatchAt);
  }).catch((error) => {
    dispatching = false;
    failClosed = true;
    log(`could not persist quota ledger (${error.code || 'storage error'}); forwarding disabled`);
    if (!item.res.destroyed) json(item.res, 503, { error: 'Rate-limit state could not be saved; request was not sent.' });
    rejectQueued(503, 'Rate-limit state could not be saved; no queued requests were sent.');
  });
}

async function handle(req, res) {
  if (!isLoopback(req.socket.remoteAddress)) {
    json(res, 403, { error: 'Loopback clients only.' });
    return;
  }

  let url;
  try {
    url = new URL(req.url || '/', `http://${HOST}`);
  } catch {
    json(res, 400, { error: 'Invalid request URL.' });
    return;
  }

  if (url.pathname === STATUS_PATH && req.method === 'GET') {
    json(res, 200, statusSnapshot());
    return;
  }

  if (stopping || failClosed) {
    json(res, 503, { error: 'Rate gate is not accepting requests.' }, { 'retry-after': '60' });
    return;
  }

  if (!['GET', 'POST'].includes(req.method)) {
    json(res, 405, { error: 'Only GET and POST are supported.' }, { allow: 'GET, POST' });
    return;
  }
  if (!isGeminiModelPath(url.pathname)) {
    json(res, 404, { error: 'Only Gemini model API paths are forwarded.' });
    return;
  }

  const pending = queued.length + receivingBodies + Number(Boolean(dispatching)) + Number(Boolean(inFlight));
  if (pending >= MAX_PENDING_REQUESTS) {
    req.resume();
    json(res, 503, { error: 'Local request queue is full; retry later.' }, { 'retry-after': '12' });
    return;
  }

  receivingBodies += 1;
  let body;
  try {
    body = await collectBody(req);
  } catch (error) {
    receivingBodies -= 1;
    if (!res.destroyed) {
      const tooLarge = error.code === 'BODY_TOO_LARGE';
      json(res, tooLarge ? 413 : 400, { error: tooLarge ? 'Request body exceeds the local 16 MiB limit.' : 'Could not read request body.' });
    }
    return;
  }
  receivingBodies -= 1;

  if (req.aborted || res.destroyed) return;
  if (queued.length + Number(Boolean(dispatching)) + Number(Boolean(inFlight)) >= MAX_PENDING_REQUESTS) {
    json(res, 503, { error: 'Local request queue is full; retry later.' }, { 'retry-after': '12' });
    return;
  }

  const item = {
    req,
    res,
    method: req.method,
    headers: req.headers,
    body,
    pathname: url.pathname,
    upstreamPath: `${url.pathname}${url.search}`,
    receivedAt: performance.now(),
    cancelled: false,
  };
  req.once('aborted', () => { item.cancelled = true; schedulePump(); });
  res.once('close', () => {
    if (!res.writableEnded) {
      item.cancelled = true;
      schedulePump();
    }
  });
  queued.push(item);
  log(`queued ${item.method} ${item.pathname}; ${queued.length} waiting`);
  schedulePump();
}

async function main() {
  await loadState();
  const server = http.createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.destroyed && !res.headersSent) json(res, 500, { error: 'Rate gate internal error.' });
      else if (!res.destroyed) res.destroy();
    });
  });

  server.requestTimeout = UPSTREAM_TIMEOUT_MS;
  server.headersTimeout = 60_000;
  server.keepAliveTimeout = 10_000;

  server.on('error', (error) => {
    log(`server failed (${error.code || 'startup error'}); no API calls forwarded`);
    process.exitCode = 1;
  });

  server.listen(PORT, HOST, () => {
    log(`listening at http://${HOST}:${PORT}`);
    log(`strict cap ${MAX_PER_MINUTE} requests per rolling 60 seconds; minimum spacing ${MIN_GAP_MS} ms`);
    log(`startup quiet period ${STARTUP_QUIET_MS} ms; state file ${stateFile}`);
    log(`status: http://${HOST}:${PORT}${STATUS_PATH}`);
  });

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    if (pumpTimer) clearTimeout(pumpTimer);
    pumpTimer = null;
    rejectQueued(503, 'Rate gate is shutting down; retry with the proxy running.');
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error) => {
  log(error.message || 'startup failed; no API calls forwarded');
  process.exitCode = 1;
});
