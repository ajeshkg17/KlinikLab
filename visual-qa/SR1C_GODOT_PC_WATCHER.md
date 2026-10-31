## SR1D job07 — exact production six-case/seven-station native Godot milestone (1 November 2026)

**Job06 remains immutable** with confirmed RTX process 3D attribution, **not** independent pixel or full application acceptance. New job `pc-godot-clinic-20261101-job07`, schema 7, from pinned production source `f4d4d4151851a08342def08d9f2e461f5f5e7109`. It uses the same never-switched WinSta0 Godot Vulkan process and persistent Windows PDH GPU counters, requiring three distinct matching RTX 5060 3D periods, and publishes frontal/angled new native PNG evidence.

Job07 changes the *content and state*, not the host/network: the worker additionally builds SHA256-verified case/station metadata from the six CASES/seven STATIONS in production `app.js` using an isolated deterministic exporter. `sr1d-godot-case-workflow.gd` implements actual Godot case selector + station controls and a case16-to-case36 (endodontic/practical) transition during the local capture, recording original case and station IDs and verifying that unavailable FDI36 geometry is **not** replaced with a mislabeled FDI16. This is **still not the complete browser application**, a clinical assessment, or a physically tested Quest program. Missing case JSON, workflow changes, provenance or RTX GPU evidence fail closed.

After integration CI passes, obtain a new detached **worker SHA** from the integration branch, with the original `KLINIKLAB_GODOT_EXE` pointing to installed Godot 4.7.2 GUI. Use `node --test tests/sr1d_godot_cases.test.mjs`, `node visual-qa/godot-worker.mjs --validate`, then `node visual-qa/godot-worker.mjs --once` from that new worker checkout. The worker handles unique source worktree, preparation, private-desktop render and publication. No automated Quest streaming, firewall or Tailscale/Funnel changes. Evidence is visible only if the actual PC worker executes and successfully publishes it.

---

## LATEST job06 — invalid-PDH recovery + native clinic-workspace prototype (31 October 2026)

Job05 is **EVIDENCE_INCOMPLETE**; do not rerun its ID or treat a separate post-render PDH probe as process attribution. Fresh queued job: **`pc-godot-clinic-20261031-job06`**, schema **6**, original production source SHA **`f4d4d4151851a08342def08d9f2e461f5f5e7109`**. The executing worker SHA is recorded separately. This job is **NOT a complete port** of the browser KlinikLab application: it renders a labelled native clinical room/tray/chair/workbench preview surrounding unchanged source FDI16 before/cut geometry.

The dedicated WinSta0 unswitched desktop launcher, 42-second Godot Forward+ Vulkan orbit and two original native screenshot gates remain. The PC collector's single persistent 34-sample GPU Engine query now uses **`Get-Counter -ErrorAction Continue`**, records nonterminating PDH warning diagnostics plus rejected Godot-PID GPU 3D rows, and only counts finite, valid-status, in-range 3D samples for Godot's actual PID. Three distinct positive UTC collection periods must match independent DXGI RTX5060 adapter LUID. Valid samples are not thrown away because an unrelated GPU Engine instance is invalid. No samples, invalid samples, mismatched PID/LUID, absent PNG or missing original source remain **EVIDENCE_INCOMPLETE**, not accepted. Published data includes `godot-gpu-3d-counters.json` and `godot-gpu-pdh-diagnostics.json`.

The requester should use a **new detached checkout of the exact current integration worker SHA** after source/Windows CI passes. Set `KLINIKLAB_GODOT_EXE` to the installed 4.7.2 GUI executable and run, from that fresh checkout:
```powershell
node --test tests/sr1c_job06_clinic.test.mjs tests/sr1c_job05_pdh_orbit.test.mjs
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tests/sr1c_pdh_invalid_rows_windows.ps1
node visual-qa/godot-worker.mjs --validate
node visual-qa/godot-worker.mjs --once
```
The watcher handles unique detached source worktree, Godot private desktop, diagnostics, and publication to `visual-feedback`. It does **not** open Godot on the visible foreground, change firewall/Tailscale/Funnel, modify prior jobs or start Quest streaming. `--validate` is only preflight. Inspect the new `GODOT_PC_LATEST.md` and original new PNG pixels before any visual gate. The full browser app remains separately runnable in its existing PC browser and is not silently redefined as a native Godot application.

---

## LATEST: job05 persistent PDH/DXGI GPU and native orbit, 31 October 2026

This overrides older owner-PC job01–job04 instructions. NEW unique request: pc-godot-fdi16-20261031-job05, schema 5, original clinical functional source SHA f4d4d4151851a08342def08d9f2e461f5f5e7109. Job contract: native-orbit-frontal-occlusal, persistent-pdh-1hz-dxgi-luid-42s-orbit-v1. Old watchers reject schema 5. Do not rerun, overwrite or reuse prior IDs. XR worker remains untouched.

Job04 immutable reference: https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/runs/pc-godot-pc-godot-fdi16-20261031-job04-f4d4d4151851a08342def08d9f2e461f5f5e7109/README.md . Original native PNG SHA256 d8e92a28ab409f9f51ed279c8c6bcb3d53f25bfd663459ebccdbeddb700cc411 was personally inspected; two actual source-derived schematic molar bodies are visible, with pale crowns and tapered roots, but frontal view does not clearly demonstrate the simulated cavity. Source 14,856 BEFORE / 14,936 AFTER triangles and five visible native tissue groups each passed source submission. Godot reported RTX 5060 Forward+ Vulkan. However 54 GPU-engine counter ROWS belonged to only two independent collection periods (21:34:10 and 21:34:18 UTC) for Godot PID 8852; positive 3D readings 1.346% and 1.264%, both LUID 0x00000000_0x00013049. Therefore job04 remains EVIDENCE_INCOMPLETE and is NOT rerun.

Job05 Godot runs for 42 seconds with actively changing Camera3D orientation (slow 42-degree azimuth orbit, elevated toward top/occlusal view) on an unswitched WinSta0 private desktop. It saves two independently hashed original native GPU screenshots: godot-native-fdi16.png (frontal, around 3 seconds) and godot-native-fdi16-occlusal.png (raised angled view, around 32 seconds). Inspect original pixels: an elevated camera is a demonstration attempt, not automatically evidence that the simulated cut is visible. The original production OBJ is unchanged. No project manager, F12, headless dummy renderer or foreground activation is used.

Process GPU evidence: one Get-Counter invocation maintains one persistent Windows PDH query with SampleInterval 1 and MaxSamples 34. It records distinct collection UTC stamps, collection index, original Godot PID, 3D counter path, utilization, valid numeric flag and engine LUID. Requires at least three DISTINCT positive sampling periods (not three rows), each tied to original Godot PID. Independent native DXGI CreateDXGIFactory1 / IDXGIAdapter1.GetDesc1 enumeration must identify exactly one RTX 5060 adapter with VendorId 0x10DE and normalize its DXGI adapter LUID. At least three distinct positive 3D readings must match that exact adapter LUID. Source must still be 14,856/14,936 triangles and five tissue groups, runtime Godot must report RTX 5060 Vulkan Forward+, both PNGs and 40–45s native orbit must exist. Missing/invalid PDH values, missing DXGI LUID match, process mismatch or failed images remain EVIDENCE_INCOMPLETE. No self-approval of original pixels or clinical fidelity. Hosted Windows CI validated the DXGI interop and original job04 LUID parser and a single persistent three-timestamp PDH query; hosted runner had only Microsoft Basic Render adapters, not the owner RTX 5060.

Owner Windows run: stop old Godot watcher, keep KLINIKLAB_GODOT_EXE set to the actual installed Godot 4.7.2 GUI executable. Use NEW FULL INTEGRATION SHA from the latest response for one fresh detached watcher checkout. From that checkout, run the source-contract tests, node visual-qa/godot-worker.mjs --validate, then node visual-qa/godot-worker.mjs --once. The watcher itself takes care of the uniquely timestamped exact source worktree and native project. Check the published visual-feedback/GODOT_PC_LATEST.md pointer for original PNGs and machine-readable process/GPU results. Never mark accepted until original image pixels and LUID-matched process evidence are independently verified. Quest streaming remains later.

---

## CURRENT: job04 and recovered Win32 CreateDesktopW / Windows PowerShell JSON contract (31 October 2026)

This section overrides the older job01/job02/job03 foreground F12 instructions below. The current unique pending job is **pc-godot-fdi16-20261031-job04**, schema **4**, with exact functional source SHA **f4d4d4151851a08342def08d9f2e461f5f5e7109**. New desktopApiContract is **raw-utf16-createdesktopw-bom-safe-recovery**, so old schema-v3 watchers must reject the new job. No owner Godot render, original PNG or RTX 5060 process evidence has yet passed.

**Confirmed Win32 87 root:** Real hosted Windows smoke tests reproduced CreateDesktopW Win32 87 with the original managed-string P/Invoke, with full and minimal access masks and shorter names. The SAME Windows smoke test **succeeded with a raw UTF-16 LPCWSTR pointer** (Marshal.StringToHGlobalUni) to CreateDesktopW, reserved arguments NULL, no desktop switching and 0xC3 minimal rights. Production now uses this exact successful call and frees the unmanaged name pointer. It also checks the current process WinSta0 and fails closed on any other error. Passing this OS desktop-creation test does NOT establish Godot Vulkan raster or process GPU proof.

**PowerShell JSON:** Windows PowerShell 5.1 Set-Content -Encoding UTF8 emits a BOM; Node JSON.parse failed on that original report and left job02/job03 ledgers executing. The newer collector writes owner and GPU counter JSON using UTF8Encoding(false), while the watcher tolerates an initial BOM when reading historical reports, original source JSON, ledger, GitHub job, and publication result. Malformed JSON is never accepted.

**Old evidence / no rerun:** Job01 remains published EVIDENCE_INCOMPLETE. Job02 and job03 were attempted and their original worktrees/evidence must remain untouched. The new watcher has an explicit **--recover-incomplete** mode, restricted to those two old IDs and their exact source SHA: it reads original reports (including BOM), writes a missing terminal diagnostic once without overwriting original files, publishes EVIDENCE_INCOMPLETE to visual-feedback, and updates the ledger. It NEVER invokes Godot, exporter, capture, or a prior worktree. Run this first, then validate and run the fresh job04 separately.

**Owner PC commands:** first stop any previous Godot watcher and ensure KLINIKLAB_GODOT_EXE points to the actual Godot 4.7.2 Windows GUI executable. Replace SHA placeholder below only with the new full integration commit SHA supplied after the current Windows tests pass.

    $ErrorActionPreference='Stop'
    $repo='C:\Users\ajesh\OneDrive\study and learn\coworker\KlinikLab'
    $sha='<NEW_FULL_INTEGRATION_SHA_FROM_CHAT>'
    if (-not (Test-Path -LiteralPath $env:KLINIKLAB_GODOT_EXE)) { throw 'Godot executable missing' }
    git -C $repo fetch origin integration/single-chat-validation-2026-10-30
    if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
    $stamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
    $watcherDir="C:\klab-godot-watcher-$($sha.Substring(0,8))-$stamp"
    git -C $repo worktree add --detach $watcherDir $sha
    if ($LASTEXITCODE -ne 0) { throw 'Watcher worktree failed' }
    Push-Location $watcherDir
    try {
      node --test .\tests\sr1c_windows_private_desktop_bom.test.mjs .\tests\sr1c_godot_private_desktop.test.mjs
      if ($LASTEXITCODE -ne 0) { throw 'No-foreground and BOM regressions failed' }
      node .\visual-qa\godot-worker.mjs --recover-incomplete
      if ($LASTEXITCODE -ne 0) { throw 'Old-job diagnostics recovery failed; preserve originals' }
      node .\visual-qa\godot-worker.mjs --validate
      if ($LASTEXITCODE -ne 0) { throw 'Job04 validation failed' }
      node .\visual-qa\godot-worker.mjs --once
    } finally { Pop-Location }

The Godot process must stay entirely on a separate **unswitched WinSta0 desktop**: no foreground activation, Project Manager/editor, manual F12 or headless dummy rendering. It must report native Forward+ Vulkan NVIDIA RTX 5060, produce an original image, preserve 14,856 BEFORE /14,936 AFTER source triangles and five tissue surfaces per tooth, and register nonzero 3D engine utilization tied to the Godot PID. A missing/invalid counter or blank GPU image is an incomplete result, never a pass. Quest streaming remains deferred. Original XR worker and job queue untouched.

---

## NEW binding owner instruction (31 October 2026): background-only Godot job03, no foreground activation

**Highest-priority replacement for all F12/game-window instructions further down this historical document.** User has prohibited any Godot Project Manager, editor, or game coming to the active desktop foreground. The active GitHub request is **`pc-godot-fdi16-20261031-job03`**, schema **3**, source pinned **`f4d4d4151851a08342def08d9f2e461f5f5e7109`**, with `backgroundContract=private-winsta0-vulkan-autocapture-no-foreground` and `capture=native-background-before-after`. A prior schema-v2 watcher **rejects** this job. **Job01** is published EVIDENCE_INCOMPLETE and **job02** has owner-PC local prepared evidence with no accepted render; do not alter, delete, reuse, or rerender either ID. The existing XR watcher and XR queue are untouched.

**Actual technique:** The dedicated PC watcher uses `visual-qa/sr1c-private-desktop.ps1` to create a newly named **private WinSta0 desktop** via Windows `CreateDesktopW`, then native `CreateProcessW` with `STARTUPINFO.lpDesktop` pointing exclusively to that new desktop, plus `SW_SHOWNOACTIVATE`. **It never calls SwitchDesktop, SetForegroundWindow, ShowWindow on the user's active desktop, SendKeys, or F12.** The Godot binary uses `--rendering-method forward_plus --rendering-driver vulkan` and a fixed approved `--script res://sr1c-godot-background-capture.gd`. It does **not** use Godot `--headless` or a dummy renderer; those disable GPU rendering. The Godot SceneTree autonomously loads original `main.tscn`, checks original source five-tissue 14,856/14,936 triangle parity, registers an additional off-screen output to prevent the render loop being skipped, waits until `RenderingServer.frame_post_draw`, reads the original GPU viewport texture and saves an original numbered PNG. The PC collector additionally requires the native Godot renderer to report Vulkan Forward+ plus NVIDIA RTX 5060 and sufficient nonzero **same-Godot-PID** GPU Engine 3D counter samples. Missing/private-desktop-unavailable GPU evidence or no image remains `EVIDENCE_INCOMPLETE`; no Linux/headless fallback, no independent pixel acceptance without examining original bytes. Private desktop GPU feasibility must still be confirmed by actual owner PC results, not CI.

**PC run (PowerShell 7, interactive login, but no application activation):**

~~~powershell
$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\ajesh\OneDrive\study and learn\coworker\KlinikLab'
$watcherSha = '<FRESH_EXACT_INTEGRATION_SHA_FROM_CHAT>'
git -C $repo fetch origin integration/single-chat-validation-2026-10-30
if ($LASTEXITCODE -ne 0) { throw 'Git fetch failed' }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
$watcherDir = "C:\klab-godot-watcher-$($watcherSha.Substring(0,8))-$stamp"
git -C $repo worktree add --detach $watcherDir $watcherSha
if ($LASTEXITCODE -ne 0) { throw 'Watcher worktree failed' }
# Preserve your correctly configured installed Godot 4.7.2 GUI .exe path:
if (-not (Test-Path -LiteralPath $env:KLINIKLAB_GODOT_EXE)) {
  throw 'Set KLINIKLAB_GODOT_EXE to the full installed Godot 4.7.2 GUI .exe path'
}
Push-Location $watcherDir
try {
  node --test .\tests\sr1c_godot_private_desktop.test.mjs
  if ($LASTEXITCODE -ne 0) { throw 'No-foreground contract regression failed' }
  node .\visual-qa\godot-worker.mjs --validate
  node .\visual-qa\godot-worker.mjs --once
}
finally { Pop-Location }
Get-Content "$env:LOCALAPPDATA\KlinikLabGodotWorker\godot-heartbeat.json" -Raw
Get-Content "$env:LOCALAPPDATA\KlinikLabGodotWorker\godot-ledger.json" -Raw
~~~

The Godot private process runs without activating the user's visible desktop; **no manual F12, opening Godot editor/Project Manager or mouse action is needed**. The result is published only if the PC watcher actually executes; check `visual-feedback/GODOT_PC_LATEST.md` and the new job03 immutable `runs/pc-godot-...` path. Original GUI screenshot and process-specific RTX 5060 verification are **not yet claimed**. Do not advance Quest streaming until native pixel and GPU evidence pass.

---

> **31 October 2026 job02 recovery (NEW):** Owner-PC job01 `pc-godot-fdi16-20261031-job01` is already **PUBLISHED EVIDENCE_INCOMPLETE** at [its immutable result](https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/runs/pc-godot-pc-godot-fdi16-20261031-job01-f4d4d4151851a08342def08d9f2e461f5f5e7109/godot-job-result.json). Its manifest successfully retained source exact SHA `f4d4d4151851a08342def08d9f2e461f5f5e7109` and before/after **14,856/14,936** original triangles, but **did not create a native Godot project, image or GPU evidence**: WinPS 5.1 child unexpectedly could not resolve `Get-FileHash`. **Root cause:** PowerShell 7.6.5 -> Node -> Windows PowerShell 5.1 inherits PS7 `PSModulePath`; shared `Microsoft.PowerShell.Utility` resolves to incompatible version, suppressing cmdlet autoload. Microsoft [documents this exact intermediary-process problem](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_psmodulepath). The dedicated watcher now removes inherited `PSModulePath` **only in the launched Windows PowerShell child**, checks actual WinPS `Get-FileHash` against Node SHA256 *before starting the job*, then launches both known `-STA -File` scripts with the same clean environment and retains child stderr in failure records. **Active replacement job** is `pc-godot-fdi16-20261031-job02`, **schema v2** requiring `launcherContract=winps51-clear-psmodulepath-sha256-preflight`, so an old schema-v1 watcher rejects the job instead of consuming it. The actual Godot source SHA remains **f4d4d4151851a08342def08d9f2e461f5f5e7109**. **You MUST launch the NEW watcher checkout/process after the fixing integration commit; do not reuse job01 or the older watcher process.** Windows CI tests both polluted PSModulePath -> cleaned real `-Command` and `-STA -File` hashing. Source/CI success is NOT native PC image acceptance. Quest remains later.

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
