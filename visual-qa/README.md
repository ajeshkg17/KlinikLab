# KlinikLab — single-chat visual QA and owner-PC XR worker

The only active development coordination is **this chat**. Do not contact or revive deleted worker chats. GitHub hosts code, bounded JSON test requests, and uploaded results. **Routine browser/XR rendering runs on the owner's PC, not on GitHub-hosted runners.** GitHub's integration workflow retains source/unit/static/build checks. Historical CI screenshots and previous gallery files remain in Git history; they are not current visual acceptance evidence.

## XR workflow (Phase 3, before Phase 4)

**Job request:** [jobs/xr-current.json](./jobs/xr-current.json), on the integration branch. Exactly one fixed ten-checkpoint suite `quest2-phase3`, a 40-character integration commit SHA, a unique 4–64-character job ID, graphics `default` or explicit `software`, and a bounded 15–120 s collection deadline. No commands, URLs, arbitrary JavaScript or selectors can be supplied by jobs. The worker fetches the current integration job from GitHub every 10 seconds, verifies the SHA is an ancestor of the integration branch, then creates a **detached worktree at that exact SHA**. It starts its own loopback source server on **port 8891** (never alters ports 8787, 8790 or 8791), installs pinned IWER/Playwright dependencies, and launches fresh-profile desktop Chrome. It never reuses the owner's signed-in Chrome profile.

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

### Phase 4 catalog (30 October 2026)

The in-VR `TOOLS` tab opens a five-instrument catalog. Left and right controller trigger rays can select a named item and read its purpose. Selection is highlighted. `RETURN` restores the currently selected **unheld** tool to its own table home location (it does not duplicate or teleport a held instrument); `RESET` releases/restores all tools; `CLOSE` hides the panel. Normal grip/squeeze picks a reachable table instrument, and release returns it to the tray. The existing top `?` tutorial remains opt-in and grip-independent. The catalog is closed on entry and does not replace the visible central instrument tray.

PC test request `pc-xr-phase4-catalog-20261030-01` pins `286834f6fced58c17d7a92e37e0fa776751cf79e`. It extends the eight known-good stereo checkpoints with `09-tool-catalog-open.png` and `10-tool-catalog-closed.png`, checks left/right synthetic ray selection, controlled return, reset, close, and preserves earlier tool/guide checks. Synthetic rays do not constitute physical Touch controller acceptance. The fixed catalog does **not** provide unlimited duplicate instances or procedural treatment mechanics; its controlled spawn action reactivates an existing unique tray tool.

PC local run: `node .\\visual-qa\\xr-worker.mjs --validate`, then `node .\\visual-qa\\xr-worker.mjs --once` in the updated integration checkout. Do not use an old processed job ID. Routine hosted XR rendering remains disabled.

### Reliable Windows owner-PC watcher setup

The XR watcher is **not assumed to be running** just because a test request exists. Install Node.js 22+, Git for Windows with **Git Credential Manager**, Google Chrome, and the repository checkout. A GitHub CLI (`gh`) installation is **not required**. Sign in using the Git Credential Manager flow in a regular interactive terminal (for example `git ls-remote https://github.com/ajeshkg17/KlinikLab.git HEAD`); ensure the credential has write access to the `visual-feedback` branch. The watcher does not print or store the credential and performs a no-prompt GitHub API write-permission preflight before starting Chrome. Do not paste access tokens into commands or logs.

Run from an updated integration checkout in an ordinary PowerShell terminal:

```powershell
git fetch origin integration/single-chat-validation-2026-10-30
git switch integration/single-chat-validation-2026-10-30
git pull --ff-only
node .\visual-qa\xr-worker.mjs --validate
node .\visual-qa\xr-worker.mjs --watch
```

The **running process** and the freshly updated `$env:LOCALAPPDATA\KlinikLabVisualWorker\xr-heartbeat.json` file are evidence of activity (not evidence of successful upload). `xr-completed.json` tracks `rendering`, `rendered`, `publish-pending`, `published`, and `failed`. Completed PNGs and `result.json` are retained in `xr-evidence\<jobId>` before the checkout is removed; diagnostic output is kept separately. A publication error leaves `publish-pending` and the watcher retries upload on its next poll **without rerendering**. An interrupted render is not automatically replayed. No earlier screenshot collection is checked out or downloaded.

For automatic startup after this has been verified interactively, create a Windows Task Scheduler task running `node.exe` with arguments `C:\path\to\KlinikLab\visual-qa\xr-worker.mjs --watch`, using the same signed-in Windows user and appropriate working directory. Set **Run only when user is logged on** for interactive/headed Chrome, and enable the task; do not reuse the previously disabled task without checking its executable and arguments. Check heartbeat freshness and the running `node.exe` command line after login. No automatic task is created by the repository.

A `published` ledger entry alone is not definitive verification: confirm `PC_XR_LATEST.md` and the job-specific `README.md` on `visual-feedback` before asserting a gallery exists.
