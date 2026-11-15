#!/usr/bin/env node
// Read-only second-opinion MCP tool for Gemini 4 Hydrogen.
// Media is read only from this Unreal project or named Codex clipboard attachments.
// API keys are inherited from the process environment and are never logged.

import { createInterface } from 'node:readline';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = await realpath(path.resolve(SCRIPT_DIR, '..'));
const WORKSPACE_ROOT = await realpath(path.resolve(PROJECT_ROOT, '..', '..'));
const TEMP_ROOT = process.env.TEMP || process.env.TMP || '';
const PROXY_URL = 'http://127.0.0.1:8787/v1beta/models/gemini-4-hydrogen:generateContent';
const SERVER_INFO = { name: 'kliniklab-gemini-hydrogen-consult', version: '1.0.0' };
const MAX_IMAGE_COUNT = 3;
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 15 * 1024 * 1024;
const MAX_QUESTION_CHARS = 12_000;
const MAX_CONTEXT_CHARS = 30_000;
const MIME_BY_EXT = new Map([
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.heic', 'image/heic'], ['.heif', 'image/heif'],
  ['.mp4', 'video/mp4'], ['.mpeg', 'video/mpeg'], ['.mpg', 'video/mpg'],
  ['.mov', 'video/quicktime'], ['.avi', 'video/avi'], ['.flv', 'video/x-flv'],
  ['.webm', 'video/webm'], ['.wmv', 'video/wmv'], ['.3gp', 'video/3gpp'],
]);

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function rpcError(id, code, message) {
  writeMessage({ jsonrpc: '2.0', id, error: { code, message } });
}

function toolResult(text, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function readAllowedMedia(inputPath, expectedKind) {
  if (typeof inputPath !== 'string' || inputPath.length === 0 || inputPath.length > 2048) {
    throw new Error('A valid media path is required.');
  }

  const absolutePath = path.resolve(inputPath);
  const actualPath = await realpath(absolutePath);
  const inProject = isWithin(WORKSPACE_ROOT, actualPath);
  const inTemp = Boolean(TEMP_ROOT) && isWithin(await realpath(TEMP_ROOT), actualPath);
  const baseName = path.basename(actualPath);
  const ext = path.extname(actualPath).toLowerCase();
  const mimeType = MIME_BY_EXT.get(ext);
  if (!inProject && !(inTemp && /^codex-clipboard-[a-f0-9-]+\./i.test(baseName))) {
    throw new Error('Media must be inside the KlinikLab workspace or a codex-clipboard attachment in the system temp folder.');
  }
  if (!mimeType || (expectedKind === 'image' && !mimeType.startsWith('image/')) || (expectedKind === 'video' && !mimeType.startsWith('video/'))) {
    throw new Error(`Unsupported ${expectedKind} file type.`);
  }

  const bytes = await readFile(actualPath);
  if (bytes.length === 0 || bytes.length > MAX_MEDIA_BYTES) {
    throw new Error(`Each media file must be between 1 byte and ${MAX_MEDIA_BYTES / (1024 * 1024)} MB.`);
  }
  return { bytes, mimeType, name: baseName };
}

async function consult(args) {
  const question = typeof args.question === 'string' ? args.question.trim() : '';
  const context = typeof args.context === 'string' ? args.context : '';
  if (!question || question.length > MAX_QUESTION_CHARS) {
    throw new Error(`question is required and must be at most ${MAX_QUESTION_CHARS} characters.`);
  }
  if (context.length > MAX_CONTEXT_CHARS) throw new Error(`context must be at most ${MAX_CONTEXT_CHARS} characters.`);

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY is not available to this Codex process. Set it in the Windows user environment and restart the Codex host.');

  const parts = [{ text: `${context ? `PROJECT / TASK CONTEXT\n${context}\n\n` : ''}QUESTION\n${question}\n\nYou are an advisory reviewer. Return observations and suggested changes only. Do not claim direct editor access, do not claim a check passed unless evidence is supplied, and do not imply clinical validity.` }];
  const imagePaths = args.image_paths === undefined ? [] : args.image_paths;
  if (!Array.isArray(imagePaths) || imagePaths.length > MAX_IMAGE_COUNT) {
    throw new Error(`image_paths may contain at most ${MAX_IMAGE_COUNT} paths.`);
  }

  let mediaBytes = 0;
  const attachmentNames = [];
  for (const imagePath of imagePaths) {
    const media = await readAllowedMedia(imagePath, 'image');
    mediaBytes += media.bytes.length;
    attachmentNames.push(media.name);
    parts.push({ inline_data: { mime_type: media.mimeType, data: media.bytes.toString('base64') } });
  }
  if (args.video_path !== undefined && args.video_path !== null && args.video_path !== '') {
    const media = await readAllowedMedia(args.video_path, 'video');
    mediaBytes += media.bytes.length;
    attachmentNames.push(media.name);
    parts.push({ inline_data: { mime_type: media.mimeType, data: media.bytes.toString('base64') } });
  }
  if (mediaBytes > MAX_MEDIA_BYTES) throw new Error(`Combined media must not exceed ${MAX_MEDIA_BYTES / (1024 * 1024)} MB.`);

  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 6000 },
  });
  if (Buffer.byteLength(body, 'utf8') > MAX_REQUEST_BYTES) throw new Error('Encoded request exceeds the local proxy body limit. Use smaller media files.');

  let response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body,
      signal: AbortSignal.timeout(6 * 60 * 1000),
    });
  } catch {
    throw new Error('Could not reach the local Gemini rate-limit proxy at 127.0.0.1:8787.');
  }

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`Gemini proxy returned a non-JSON response (HTTP ${response.status}).`); }
  if (!response.ok) {
    const apiMessage = String(data?.error?.message || data?.error || `HTTP ${response.status}`).replaceAll(apiKey, '[redacted]').slice(0, 1200);
    throw new Error(`Gemini request failed: ${apiMessage}`);
  }

  const candidate = data?.candidates?.[0];
  const answer = (candidate?.content?.parts || []).map((part) => part.text || '').filter(Boolean).join('\n').trim();
  if (!answer) throw new Error(`Hydrogen returned no review text (finishReason: ${candidate?.finishReason || 'unknown'}). Try a shorter question or lower-output request.`);

  const usage = data?.usageMetadata;
  const footer = [
    `Model: ${data.modelVersion || 'gemini-4-hydrogen'}`,
    attachmentNames.length ? `Media sent: ${attachmentNames.join(', ')}` : 'Media sent: none',
    usage?.totalTokenCount ? `Reported total tokens: ${usage.totalTokenCount}` : '',
    'Advisory only. No files or Unreal actions were changed.',
  ].filter(Boolean).join('\n');
  return `${answer}\n\n---\n${footer}`;
}

const tool = {
  name: 'ask_gemini_hydrogen',
  description: 'Ask Gemini 4 Hydrogen for a read-only second opinion on KlinikLab Unreal work. Can include project text, up to three local images, and one local video. Uses the existing five-per-minute local proxy. Returns advice only; it cannot edit files or operate Unreal.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      question: { type: 'string', minLength: 1, maxLength: MAX_QUESTION_CHARS, description: 'Specific question for Hydrogen.' },
      context: { type: 'string', maxLength: MAX_CONTEXT_CHARS, description: 'Optional concise project facts or relevant excerpts.' },
      image_paths: { type: 'array', maxItems: MAX_IMAGE_COUNT, items: { type: 'string' }, description: 'Optional paths to images inside the KlinikLab workspace or codex-clipboard image attachments in the system temp folder.' },
      video_path: { type: 'string', description: 'Optional path to one supported video inside the KlinikLab workspace or a codex-clipboard attachment in the system temp folder.' },
    },
    required: ['question'],
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
};

async function handle(message) {
  const { id, method, params } = message || {};
  if (typeof method !== 'string') return;
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
  if (method === 'initialize') {
    writeMessage({ jsonrpc: '2.0', id, result: {
      protocolVersion: params?.protocolVersion || '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
      instructions: 'ask_gemini_hydrogen is an optional external second opinion. Only the question, context, and explicitly supplied image/video files go to Google through the local five-per-minute rate gate. Results are unverified advice; do not apply code or claim tests passed without independent review.',
    } });
    return;
  }
  if (method === 'ping') { writeMessage({ jsonrpc: '2.0', id, result: {} }); return; }
  if (method === 'tools/list') { writeMessage({ jsonrpc: '2.0', id, result: { tools: [tool] } }); return; }
  if (method === 'tools/call') {
    if (params?.name !== tool.name) {
      writeMessage({ jsonrpc: '2.0', id, result: toolResult(`Unknown tool: ${String(params?.name || '')}`, true) });
      return;
    }
    try {
      writeMessage({ jsonrpc: '2.0', id, result: toolResult(await consult(params.arguments || {})) });
    } catch (error) {
      writeMessage({ jsonrpc: '2.0', id, result: toolResult(error instanceof Error ? error.message : 'Hydrogen consultation failed.', true) });
    }
    return;
  }
  if (id !== undefined) rpcError(id, -32601, `Method not found: ${method}`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
for await (const line of input) {
  if (!line.trim()) continue;
  let message;
  try { message = JSON.parse(line); } catch { rpcError(null, -32700, 'Parse error.'); continue; }
  await handle(message);
}
