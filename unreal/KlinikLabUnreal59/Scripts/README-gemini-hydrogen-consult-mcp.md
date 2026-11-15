# Gemini Hydrogen consultation tool for Codex

`gemini-hydrogen-consult-mcp.mjs` exposes one read-only MCP tool, `ask_gemini_hydrogen`, so a local Codex/Luna assistant can request an independent review from Gemini 4 Hydrogen.

## What the tool can do

- Send a question and optional text context to Gemini Hydrogen.
- Include up to three images and one video, read from the KlinikLab workspace or from a `codex-clipboard-*` file in the Windows temp folder.
- Return Hydrogen's advice as text for the coding assistant to compare with its own review.
- Route every request through `127.0.0.1:8787`, the existing five-requests-per-minute Gemini rate gate.

The tool has no file-writing, Unreal Editor, shell, or patch-application capability. It does not automatically send project files: the calling assistant must provide explicit media paths and context. Keep future consultation prompts focused and share only material needed for that review. Hydrogen's findings are suggestions, not test results or clinical guidance.

## This workstation's Codex registration

Codex's global `config.toml` now launches this script as the `gemini_hydrogen_consult` stdio MCP server. The config forwards only the `GOOGLE_API_KEY` environment variable name; it does not store the key value. The MCP tool has a 390-second timeout to allow for multimodal analysis.

After changing Codex's MCP configuration, restart the Codex host/extension or start a fresh assistant session so the tool catalog reloads. In a local Codex chat, ask it to use `ask_gemini_hydrogen` and provide the exact question and any selected image/video paths.

## Media limits

- PNG, JPEG, WebP, HEIC, and HEIF images; up to three images per request.
- MP4, MPEG, MPG, MOV, AVI, FLV, WebM, WMV, and 3GP video; up to one video per request.
- Combined raw media is limited to 10 MB, and the encoded request must fit the local proxy's body limit.
- Paths are checked after resolving symlinks and must remain inside the KlinikLab workspace, or be a named `codex-clipboard-*` attachment in the temp folder.

No image/video payloads, API keys, or Hydrogen request bodies are written to logs by this tool. The proxy logs the API path, HTTP status, and queue delay, but not request bodies, headers, or keys.
