# SR1C — bounded owner-PC Godot GitHub watcher

**Current status:** A new Godot job is submitted in the integration branch, but **no proof exists that the Windows watcher is running or that any Godot native PNG/GPU evidence was returned**. Old xr-worker.mjs accepts ONLY quest2-phase3 and launches Chrome/IWER. Old worker.mjs accepts browser-only scenes. Neither accepts Godot. The new **independent opt-in watcher** does not modify old job files, XR watchers, results or Unreal evidence.

## Exact supported GitHub handoff

New request: visual-qa/jobs/godot-current.json. Its validator: visual-qa/godot-job-core.mjs, bound to source exact SHA f4d4d4151851a08342def08d9f2e461f5f5e7109, suite sr1c-fdi16-before-after, graphics forward_plus-vulkan, fixed native-f12-before-after capture, and unique PC job ID. No shell commands, custom scripts, arbitrary paths/URLs, tokens or unapproved suites may be injected into job JSON.

Windows worker: visual-qa/godot-worker.mjs. It polls the GitHub integration branch, verifies SHA ancestry and at-most-once job identity, checks Git Credential Manager write permission to visual-feedback, creates a unique detached exact-SHA source checkout and evidence folder, and executes ONLY the known sr1c-build-godot-local.ps1 and sr1c-capture-godot-pc.ps1 scripts. This is real owner Windows execution, NOT GitHub Actions/Linux. It publishes original native PNG (when available), JSON reports, Godot logs, SHA256 hashes and raw Godot-PID GPU Engine 3D counter samples to an immutable new folder on visual-feedback. It creates a latest pointer GODOT_PC_LATEST.md. Failed/incomplete evidence is still published as EVIDENCE_INCOMPLETE, never relabeled as success.

The strict FDI16 source geometry contract is unchanged: BEFORE 14,856 triangles (enamel 10,320, dentin 112, pulp 207, cementum 4,105, caries 112); AFTER 14,936 (enamel 10,308, dentin 205, pulp 207, cementum 4,105, caries 111). Five native material-specific surfaces for each tooth; original runtime image must show two teeth, and source submissions alone are NOT visual acceptance.

GPU: collector targets the actual running Godot GAME PID, requires nonzero numeric Windows engtype_3D samples and an explicitly logged native Vulkan NVIDIA RTX 5060 renderer. Missing/invalid counters, missing PNG, no window, absent original source JSON or renderer log are hard INCOMPLETE evidence gates. A Windows GPU engine LUID-to-physical NVIDIA adapter proof remains separate from combined PID-counter/renderer-log corroboration. It never claims independent original pixel review; user or assistant must inspect actual uploaded PNG before advancing.

## Precise one-time Windows PC setup, unlocked interactive desktop

Use PowerShell as the logged-in user; **do not lock/minimize the desktop during capture**. Godot 4.7.2 is reportedly installed but its actual EXE path is not known to GitHub. Find it:

~~~powershell
Get-Command Godot* -ErrorAction SilentlyContinue | Select-Object Source, Name
Get-Process Godot* -ErrorAction SilentlyContinue | Select-Object Id, Path, ProcessName
~~~

If unknown, check the Project Manager shortcut Properties > Target. Specify the ACTUAL installed native 4.7.2 GUI binary (example below is a placeholder, not a claimed discovered path):

~~~powershell
$env:KLINIKLAB_GODOT_EXE = 'C:\FULL\ACTUAL\PATH\Godot_v4.7.2-stable_win64.exe'
Test-Path -LiteralPath $env:KLINIKLAB_GODOT_EXE
~~~

The check MUST return True. Use the GUI binary so Windows focus/F12 targets the native game window. Do not send private GitHub tokens in chat or job JSON. Sign in through configured Git Credential Manager with write access to visual-feedback.

Use the EXACT integration watcher SHA supplied after CI passes; it differs from the f4d4 pinned clinical SOURCE SHA. The worker automatically checks out the latter for execution:

~~~powershell
$repo = 'C:\Users\ajesh\OneDrive\study and learn\coworker\KlinikLab'
$watcherSha = '<LATEST_EXACT_GODOT_WATCHER_INTEGRATION_SHA>'
git -C $repo fetch origin integration/single-chat-validation-2026-10-30
if ($LASTEXITCODE -ne 0) { throw 'Git fetch failed' }
$watcherDir = "C:\klab-godot-watcher-$($watcherSha.Substring(0,8))"
git -C $repo worktree add --detach $watcherDir $watcherSha
if ($LASTEXITCODE -ne 0) { throw 'Watcher checkout failed' }
Push-Location $watcherDir
node --test .\tests\sr1c_godot_pc_watcher.test.mjs
node .\visual-qa\godot-worker.mjs --validate
node .\visual-qa\godot-worker.mjs --once
~~~

An interactive desktop is required to give Godot a foreground window and F12 input. The script will refuse reused run IDs/folders. After the run, check the machine heartbeat and ledger, then the published GitHub pointer:

~~~powershell
Get-Content "$env:LOCALAPPDATA\KlinikLabGodotWorker\godot-heartbeat.json" -Raw
Get-Content "$env:LOCALAPPDATA\KlinikLabGodotWorker\godot-ledger.json" -Raw
~~~

Published pointer: https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/GODOT_PC_LATEST.md .

Local immutable evidence: %LOCALAPPDATA%\KlinikLabGodotWorker\godot-evidence\<unique-job-id>-<source-SHA-prefix>\Captures . The watcher does not run simply because GitHub contains a job file. **Until the Windows worker is explicitly started and evidence uploaded, no PC image or RTX process result exists.** For a future queue, --watch polls every 10 seconds only after the user explicitly starts it.

Prior Unreal 5.8.4 failures, rejected 1920x1080 native screenshot and incomplete GPU counters remain unchanged. Dundee LEFT molar FBX is not the production RIGHT FDI16 source, and clinical validity remains unverified. Quest streaming is later.
