# KlinikLab — single-chat visual QA and owner-PC XR worker

The only active development coordination is **this chat**. Do not contact or revive deleted worker chats. GitHub hosts code, bounded JSON test requests, and uploaded results. **Routine browser/XR rendering runs on the owner's PC, not on GitHub-hosted runners.** GitHub's integration workflow retains source/unit/static/build checks. Historical CI screenshots and previous gallery files remain in Git history; they are not current visual acceptance evidence.

## XR workflow (Phase 3, before Phase 4)

**Job request:** [jobs/xr-current.json](./jobs/xr-current.json), on the integration branch. Exactly one fixed eight-checkpoint suite `quest2-phase3`, a 40-character integration commit SHA, a unique 4–64-character job ID, graphics `default` or explicit `software`, and a bounded 15–120 s collection deadline. No commands, URLs, arbitrary JavaScript or selectors can be supplied by jobs. The worker fetches the current integration job from GitHub every 10 seconds, verifies the SHA is an ancestor of the integration branch, then creates a **detached worktree at that exact SHA**. It starts its own loopback source server on **port 8891** (never alters ports 8787, 8790 or 8791), installs pinned IWER/Playwright dependencies, and launches fresh-profile desktop Chrome. It never reuses the owner's signed-in Chrome profile.

### Local startup (PowerShell; owner-PC monitoring chat may run these)

```powershell
# Run from a Git checkout of KlinikLab; do not switch the service's active branch.
git fetch origin integration/single-chat-validation-2026-10-30
git worktree add --detach "$env:USERPROFILE\\KlinikLab-XR-Agent" origin/integration/single-chat-validation-2026-10-30
Set-Location "$env:USERPROFILE\\KlinikLab-XR-Agent"
node --version
git --version
node --test .\visual-qa\tests\xr-job.test.mjs
node .\visual-qa\xr-worker.mjs --validate
node .\visual-qa\xr-worker.mjs --watch
```

Requirements: Node.js 22+, installed Google Chrome, Git, **GitHub CLI (`gh`) with `gh auth login`**, network access and GitHub write permission to `visual-feedback`. The worker requests an in-memory token using `gh auth token`; never put credentials in job JSON or chat. Keep the watcher terminal open. No Windows service restart is required. Do not run the legacy `worker.mjs` simultaneously unless the old desktop screenshot workflow is intentionally needed.

The watcher has a separate repository and state under `%LOCALAPPDATA%\KlinikLabVisualWorker`. `xr-completed.json` records each job ID **before** rendering starts and marks it published/failed afterward. Failed jobs are not retried automatically; issue a new unique job ID for an intentional retry. An upload failure may leave a failed record; inspect logs and the branch before reissuing a new job. **The worker publishes new files through the GitHub git-data API, fetching result-branch commit/tree metadata but **not checking out or downloading previous screenshot PNGs**. The source clone uses Git's partial-clone blob filter. It does not download old screenshot results**: it fetches only the source/code and the remote result-branch tree required to publish new results.

Published results: [PC XR latest gallery](https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/PC_XR_LATEST.md), with separate commit-named subdirectories, PNGs, SHA-256 hashes, result.json and README. The **historical hosted emulator gallery** is [PHASE3_LATEST](https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/PHASE3_LATEST.md); it contains known duplicate frames and must not be mistaken for PC output.

### Visual capture and limits

The revised WebXR harness captures a **fresh XR eye framebuffer after a new application draw** rather than a stale Chrome page screenshot. This code path is pending owner-PC verification. A blocked WebGL framebuffer readback produces a failed job instead of silently relabeling a viewport screenshot. State checks still require the original 120 real IWER viewer poses, 120 submitted app frames, eye/world stability and actual tool-grip actions. The published SHA-256 hashes flag identical images; **pixel differences alone do not establish that every requested object is visibly well framed**. Inspect the gallery before declaring image-level acceptance. IWER is not a physical Quest 2 headset, and does not verify comfort, haptics or performance.

### Legacy desktop visual worker

`visual-qa/worker.mjs`, `worker-core.mjs` and `jobs/current.json` are retained **only** for reproducible desktop visual comparisons (old 8787 workflow). They are not the current XR development workflow; do not start them by default. This avoids deleting still-relevant desktop test coverage or historical evidence. The superseded desktop-only `setup.ps1` installer was removed from the current branch (still available in Git history); this document replaces its XR setup instructions.

Run source/helper checks without a browser using `node --test visual-qa/tests/*.test.mjs`. No patient data or secrets may be included in public screenshot uploads.

### Current XR workspace/help acceptance request

Job `pc-xr-help-workspace-20261030-01` pins tested application revision `d820deac825b715115528cdab1c99daadb912c09`. Its eight screenshot checkpoints cover the near-field tool tray, both Quest 2 Touch-style controllers, left hover, left/right tool pickup, grip release/return, the closed workspace after pressing Close, and the tutorial opened from the `?` control. Each capture reads a **new stereo XR eye framebuffer** and records per-eye projections of all five tool centers; baseline collection rejects any tool center outside either rendered view frustum. This is not by itself a depth-occlusion or human-legibility guarantee. The help tests use an explicit synthetic controller ray passed to the actual in-session guide hit-test; they do not prove a physical Touch trigger can conveniently target the button. The owner-PC worker must be run for actual screenshots. GitHub will not render them automatically.

### Phase 3 held-tool clearance follow-up (30 October 2026)

Current local request: `pc-xr-held-tool-clearance-20261030-02`, pinned to `abf634a1a31ae246a885e9f1998293c40ea3d2db`. The grasped mirror and composite shafts are now aligned approximately 25 cm in front of the controller grip, with a small left/right pinch offset. During possession, the controller's oversized schematic tracking ring is hidden and its body narrowed; trigger controls, aim ray and other hand indicators remain separate. The central table tray and explicit top `?`/Close controls remain unchanged.

The local IWER acceptance must inspect **both eyes** for: five clearly distinguishable table tools in the initial view, both controller cues, hover, each held working end unobstructed, left/right grip ownership, proper return, help hidden on entry/re-entry, explicit `?` opening, closing, and no grip-initiated help. The script asserts tool-center stereo frustum inclusion, ring suppression, and a fresh XR framebuffer for screenshots; it cannot automatically prove human-recognizable tips, physical ergonomics or controller ease of reach. A human should review the new gallery before accepting the appearance.

Do not rerun the previous job ID after a failure: the worker tracks IDs as at-most-once and requires a new declarative request for an explicit retry.
