# Gemini API rate-limit proxy

This local Node.js script queues Gemini model API requests so this computer sends at most five per rolling 60-second window.

## What it does

- Listens only on `127.0.0.1:8787` and only forwards Gemini model paths to Google's fixed API host over HTTPS.
- Sends one request at a time, with at least 12.1 seconds between upstream request starts. This leaves a small safety margin under a five-per-minute limit.
- Keeps request-start timestamps in `%LOCALAPPDATA%\KlinikLabGeminiRateGate\dispatch-window.json` so a restart does not immediately forget recent calls. The file contains timestamps only, never the API key.
- Waits 60 seconds after startup before forwarding the first request, giving calls made outside the proxy time to leave the previous quota window.
- Preserves streaming responses and passes API errors back to the client. A Google `429` adds at least a 60-second cooldown.
- Does not print request headers, query strings, request bodies, API keys, or Google error bodies.
- Rejects requests from non-loopback clients, oversized bodies, and requests outside the Gemini model API paths. The queue holds at most eight requests including the active request.

## Start it

Use Node.js 18 or newer. From the Unreal project folder, run this in a PowerShell window and leave it open:

```powershell
node .\Scripts\gemini-rate-limit-proxy.mjs
```

The first minute is intentionally a quiet period. The local status endpoint shows the remaining wait and queue size:

```text
http://127.0.0.1:8787/_rate_limit/status
```

Stop the proxy with `Ctrl+C`. Keep one instance running; the fixed port prevents a second copy from silently starting alongside it.

## Point a Gemini client at it

For Antigravity CLI, set the base URL and API-key variable in the same PowerShell window that starts the client. The existing key can be passed from `GOOGLE_API_KEY` without printing or saving it:

```powershell
$env:GEMINI_API_KEY = $env:GOOGLE_API_KEY
$env:GOOGLE_GEMINI_BASE_URL = 'http://127.0.0.1:8787'
agy
```

The Antigravity CLI must be configured for Gemini API-key authentication and have Gemini 4 Hydrogen selected. These variables affect only that PowerShell process and its child process; do not put the key in this project or an MCP configuration file.

Unreal MCP is a separate connection. In the Gemini client's MCP configuration, add Unreal's local MCP endpoint (normally `http://127.0.0.1:8000/mcp`) while keeping its server bound to loopback. Start Unreal Editor and verify its MCP server is listening before connecting.

## Limits and scope

Google applies RPM quotas per Google Cloud project, not per API key. This proxy enforces the five-per-minute limit only for traffic routed through it. To keep the whole project under five RPM, point every Gemini client using that project at this proxy and avoid direct Gemini API calls from other programs. Requests rejected by Google's quota still count as attempts in this proxy's schedule. This is a local rate gate, not a quota increase or a replacement for Google's own limits.
