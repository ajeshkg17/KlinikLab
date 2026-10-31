# KlinikLab - Development and SR1 Replacement-Chat Handoff
**Snapshot:** 31 October 2026, Europe/Berlin. **Evidence-first document; do not interpret plans as completed work.**
**Authoritative repository:** https://github.com/ajeshkg17/KlinikLab
**Active integration branch:** `integration/single-chat-validation-2026-10-30`
**Source snapshot immediately before this handoff publication:** `3cd4f90a923c8667b0351845612df5437700535d`
**Handoff publication commit:** the successor commit containing this Markdown and PDF. Obtain its exact SHA from the branch, not from this self-referential PDF.
**Authoritative documents:** `visual-qa/PHASE_ROADMAP.md` and `visual-qa/SERVER_RENDERING_ARCHITECTURE.md`. Read their current versions before taking action.

## 1. Why the project exists
KlinikLab is a research/development platform for dental education, procedural training, dental anatomy and exam preparation (including FSP/KP contexts), with desktop and experimental XR interaction. The long-term target is credible clinical-education visuals, interactive FDI tooth selection and instrument workflows, a server-owned tooth/procedure simulation, high-quality detailed materials, and Meta Quest 2 viewing/interaction. The current application is a functioning browser/WebGL/WebXR prototype, not a clinically certified device or a production remote-rendered headset service. Its technical and clinical acceptance gates must be kept separate.

## 2. User's non-negotiable instructions
- Continue autonomous development in this single ChatGPT conversation when possible. Use existing context and source docs; do not routinely ask the user to repeat earlier decisions or redirect them to another assistant. Coordinate source using the integration branch and source-verified GitHub tools.
- The **target** has a dedicated workstation/server GPU rendering the dental scene, authoritative tooth/cut/tool state and stereo frames, plus a **hardware video encoder**. Quest/browser becomes tracking and controller input plus video decode/display/compositor. Do not run clinical scene meshes/shaders/simulation on viewer in this target. Headset decoding/compositor remains inherently device-side.
- **No CPU rendering, integrated GPU, software encoder or automatic low-quality asset/detail fallback** in the target streaming mode. If hardware/latency gates fail, report NO-GO and resolve hardware/transport rather than silently lowering clinical visual fidelity.
- The workstation PC and Quest 2 are on the same Wi-Fi 7 router. This does not prove the Quest radio negotiated Wi-Fi 7 or any actual latency, throughput or comfort.
- **Unreal Engine 5 Pixel Streaming 2 VR** is the first candidate, with Epic's VR feature explicitly experimental. Prove secure, low-latency, perspective-correct 6DoF stereo on a physical Quest 2 with a *small prototype* before migrating KlinikLab. Evaluate a native Quest streaming receiver only if browser presentation cannot meet requirements.
- Photorealistic online dental assets must have provenance, rights and redistribution terms recorded. The existing Dundee School of Dentistry *left* maxillary first molar is only a license/provenance candidate, not automatically valid right-side FDI16 anatomy or an approved shipped asset. Qualified dental expert review is mandatory before claiming clinical correctness.
- Keep generated image **design concepts** clearly separate from source-generated XR frame evidence. User wants a genuine Playwright-captured in-app procedure sequence/video, not substitute AI-drawn steps; label any simulated dental technique illustrative until clinically reviewed.
- Preserve failed job IDs and evidence. Never re-run a processed XR job ID. The owner-PC watcher maintains current browser/IWER regression pipeline; development chat personally inspects actual stereo PNG pixels and video where available. CI is source/build verification only.
- Never state that mere Unreal installation, GPU shader pipeline initialization, valid file hashes or browser/IWER screenshots prove workstation GPU raster, Pixel Streaming 2, a server render, hardware encoding, Quest 2 or dental expert validation.

## 3. GitHub state, branch, important commit history
Canonical repository: `ajeshkg17/KlinikLab`. Active development: `integration/single-chat-validation-2026-10-30`; gallery/results: `visual-feedback` branch. Current job pointer: `visual-qa/jobs/xr-current.json`. The job was left at `pc-xr-procedure-fdi16-20261031-10`, pinned to exact `49f921f0a09983ac27d89d8df0c5dec67c9fb5f5`, not moved for SR1 work.
Recent exact commits leading into this handoff:
- `3cd4f90a923c8667b0351845612df5437700535d` - fix attach-script source tests and include Unreal Editor WindowsEditor screenshots.
- `eac51b4dc7908b32ad5def5cfb92e57dfa9fe9ee` - report external blank UE58 project and add attach-to-existing-project workstation collector, roadmap and architecture status.
- `0955b6b265e941fc54bfda7d49d174674ca0d10d` - previous non-VR UE5.8 smoke scaffold and D3D12 workstation launch check.
- `49794f9b0e6b238b297e05b8695865688a4f1e72` - record UE5.8 installation files and add minimal .uproject descriptor.
- `b530c6d006d962e481dfaab739fee0ba6edda6a9` - cross-check exact source, dedicated NVIDIA GPU/NVENC and reject identical stereo evidence.
- `70ba8f45fd1f445b38a5d1847c22169197ffced8` - add SR1 offline evidence integrity tool, only ready for human review.
- `7bef499cf95052d0a2814458bbda705acbda58b4` - fail-closed NVIDIA/NVENC preflight, experimental UE5 Pixel Streaming 2 VR guide and asset register.
- `165a20f11613be64b98fe3465e797cb1eb28a715` - inspect published browser/IWER procedure job10 screenshots and explicitly reject video decoding.
- `a5ad60c4d33e152c225970d8e25f28571b54f717` and `513ee43e1bafb57f2c6811adf872b47b18c76707` - user-required dedicated GPU / high-detail target direction.
- `f1ca0fb4ea564ee7d9407831ccacce6000ca50e5` - code-path audit demonstrating current render location and LAN SR0-SR6 architecture plan.
Check `git log` or GitHub commits for any new successor commits; avoid guessing at current HEAD.

## 4. Current rendering architecture: what is actually running
`server/server.mjs` is a Node HTTP file/API server, including `/api/health` and optional `/api/ai`. It normally binds loopback `127.0.0.1`; a LAN proxy/tunnel may serve it remotely, but **it has no checked-in GPU renderer, stereo encoder or remote controller simulation**.
`engine.js` / `public/engine.js` execute in browser, acquire `webgl2`/WebGL context, build shaders/meshes and call `gl.drawArrays`. For XR they use `navigator.xr.requestSession('immersive-vr')`, `XRWebGLLayer` and per-eye browser GPU framebuffers. `volumetric-lab.js` and `xr-procedure.js` perform browser-side tooth meshing/cutting and interaction. Owner-PC `test-support/webxr-test/smoke.mjs` uses Meta IWER on Chrome and `gl.readPixels` to capture XR eyes. These are **owner-PC browser-rendered** images; running server process elsewhere does not make them server frames.
Target architecture remains unimplemented: authoritative dental simulation and GPU stereo rendering on workstation, hardware encode, encrypted low-latency WebRTC media, controller pose/trigger/grip event uplink to server, authenticated HTTPS/WSS signaling, input ACKs, IDs/timestamps and measured latency, Quest browser or native receiver providing tracking/decoding/compositing. Physical Quest 2 browser stereo VR might be insufficient due to projection/reprojection API limitations, so SR1 must decide before migration.

## 5. SR0-SR6 gate status (read roadmap for complete acceptance language)
**SR0 - render-location audit:** Source-level audit and negative regression tests completed. Actual deployed server GPU/Quest runtime trace absent.
**SR1 - feasibility and tiny UE5 PS2 VR prototype:** Active. Dedicated GPU/NVENC source-only preflight tool exists; offline evidence validator exists; Unreal installation and blank project have been reported on owner PC, but a trustworthy native viewport screenshot, selected GPU identity, **workstation-run NVENC**, actual UE host render trace, installed Pixel Streaming 2 prototype, Quest receiver, encrypted stream and measured latency are all pending. No automatic success.
**SR2 - server simulation + dedicated GPU renderer + photorealistic licensed assets:** Not implemented. No accepted Unreal-rendered KlinikLab anatomy. Asset register is candidate/provenance data only.
**SR3 - hardware encode/WebRTC stereo stream/Quest presentation:** Not implemented or verified.
**SR4 - authoritative controller/head pose and event uplink with server cuts/tools:** Not implemented or verified.
**SR5 - actual Quest 2 p50/p95/p99 latency, stereo correctness, safety/comfort/reconnect tests:** Not performed. Example p95 <50 ms and 72 Hz are proposed thresholds, not achieved measurements.
**SR6 - migration/release with fail-closed explicit server mode and separate legacy regression:** Not implemented. Do not silently fallback to current browser renderer when a remote stream is requested.
The source-backed constraints apply at *every* gate: dedicated GPU/hardware encode; no CPU, integrated-GPU or quality fallback; secure LAN pairing; no unapproved patient data or unlicensed dental assets.

## 6. Unreal workstation: observed facts versus pending proof
**Earlier 2026-10-31 ~14:23 observation:** `UE_5.8` ToolComplete marker; populated `Engine`, `FeaturePacks`, `Templates`; `UnrealEditor.exe` present, length 513,464 bytes. At that inspection, no coworker-workspace .uproject and no running editor were detected. These are installation observations only.
**New later 2026-10-31 observation from user:** Blank UE 5.8 project at:
`C:\\Users\\ajesh\\OneDrive\\Documents\\Unreal Projects\\UE58_RenderSmokeTest`.
Native Unreal log reportedly shows built-in **OpenWorld** loading, D3D12 and path-tracing shader pipeline initialization; editor remains responsive. Therefore a separate blank project and running/editor-loaded context are **reported**, superseding the earlier 'no project/no process' state. This is **not** a KlinikLab Unreal scene or Pixel Streaming render. **No genuine native screenshot or confirmed dedicated GPU adapter/NVENC evidence has been independently inspected in this chat.**
No direct Windows workstation command execution or GUI access from this GitHub-only development chat was available. Never imply the new check was run on that PC.
Prior source-only scaffold: `visual-qa/ue5_8-gpu-probe/KlinikLab_SR1_GPUProbe.uproject`; a minimal non-VR descriptor, not the external blank project or an installed Pixel Streaming VR template.
**Next concrete workstation step:** use `visual-qa/sr1-check-existing-unreal.ps1` (commit `3cd4f90...`) against the existing blank directory; discover its exact single .uproject rather than guessing filename; take native visible OpenWorld viewport screenshot from the editor via High Resolution Screenshot / `HighResShot 1920x1080`. Then run the attached collector with exact Git SHA and a **new unique** ignored `visual-qa/evidence-local/...` directory; it checks UE Build.version and process-to-project command line, retains original native Unreal log and original PNG with hashes, records selected D3D12 adapter evidence and runs the actual **dedicated NVIDIA H.264 NVENC hardware preflight**. If adapter, native picture, process identity or encoder cannot be verified, report incomplete and preserve diagnostics. Any valid files must be independently reviewed for real rendered pixels and GPU engine attribution.
Recommended PowerShell from the checked-out repo root:
```powershell
$sha=(git rev-parse HEAD).Trim()
$run="visual-qa/evidence-local/ue58-attach-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"
.\\visual-qa\\sr1-check-existing-unreal.ps1 -ProjectDirectory 'C:\\Users\\ajesh\\OneDrive\\Documents\\Unreal Projects\\UE58_RenderSmokeTest' -ExpectedSha $sha -GpuIndex 0 -EvidenceDir $run
```
The default engine root is `C:\\Program Files\\Epic Games\\UE_5.8`; override `-EngineRoot` if installed elsewhere. Node.js, NVIDIA driver, `nvidia-smi` and a real FFmpeg build with `h264_nvenc` must be available. A live editor log with shader compilation alone is *insufficient* to claim GPU raster. The collector does not launch a second editor and cannot approve physical GPU work by itself.

## 7. UE5 Pixel Streaming 2 VR small feasibility prototype - planned, not built
See `visual-qa/SR1_UE5_PS2_VR_PROTOTYPE.md`. After verifying local editor + real dedicated GPU/NVENC, create a **separate actual UE5 VR template project**, select exact installed engine version and matching Epic PixelStreamingInfrastructure version; enable Pixel Streaming 2 and follow Epic's experimental VR workflow, which documents disabling OpenXR in server VR template. First render a generic scene with explicit LEFT/RIGHT eye identity, depth-separated boxes and hand/controller markers. Do not port dental meshes before stereo/controls are proven.
Serve Quest-facing frontend with trusted HTTPS; protect signaling and use encrypted media/data. Record real physical Quest 2 browser release, negotiated Wi-Fi connection, full 6DoF parallax during head movement, controller trigger/grip return path, distinct per-eye decoded frames, network jitter/loss, server GPU/render/encoder process metrics, actual video latency and human comfort. A flat 360 video or PC-only IWER run is NOT enough.
`visual-qa/SR1_PROTOTYPE_RESULT_TEMPLATE.json` defaults all acceptance fields to false; `visual-qa/sr1-evidence-gate.mjs` checks locally collected hashes and internal agreement with the preflight but cannot authenticate fabricated internally consistent data or grant go-live approval.

## 8. Legacy XR worker and FDI16 procedure evidence
Owner-PC watcher runs a **single immutable, exact-commit pinned** Playwright/Meta IWER request from `visual-qa/jobs/xr-current.json`, on a detached worktree; standard ten checkpoints, optional six FDI16 true XR eye screenshots and video sidecars. It must preserve failed output/ledger and never reuse a processed ID. `visual-feedback/PC_XR_LATEST.md` currently points to `pc-xr-procedure-fdi16-20261031-10` source `49f921f0a09983ac27d89d8df0c5dec67c9fb5f5`.
Job10 published genuine **browser-rendered** stereo frames `01-select-fdi16.png` to `06-switchback.png`. Development chat personally inspected all six stereo pixel images and independently checked all six SHA-256 hashes. FDI16 educational saved cut increased from 0 to 1, original mesh changed, and identical-pose before/after changed pixels were **[1233 left, 1197 right]** (RGB L1 >55); post-cut remained after FDI16->36->16 switch. The simulated cavity is visible. This is a **source/GPU-in-browser educational visual pass**, *not* a dentist performing a real procedure, not clinical validation and not server-rendered Quest video.
Known defects: wide procedure images have clipped peripheral text; 02/04/06 show a dark isolated model, not a continuous operator motion sequence. Short `actual-app-stereo-steps.webm` was 52,329 bytes but failed browser decode with `decoded:false`, no derived preview and no nonblank/distinct-stage verification. Full-session viewport WebM 1,848,615 bytes existed but independent playback was not established. Do not call either video an accepted procedure movie. No qualified dentist signed off.
Gallery: `visual-feedback/runs/pc-xr-pc-xr-procedure-fdi16-20261031-10-49f921f0a09983ac27d89d8df0c5dec67c9fb5f5/`.
Clinical review acceptance and pending signoff: `visual-qa/PROCEDURE_REVIEW_RUBRIC.md`. Keep browser/IWER regression labels distinct from future UE5 workstation server-render acceptance.

## 9. Never rerun processed IDs; failure/repair chronology
**Exact failed IDs to preserve, never rerun:**
- `pc-xr-phase8-catalog-readable-20261031-02`: stereo catalog panel/action clipping failure at smoke.mjs around line 607. Fixed with geometry/frustum changes; later unique job03 passed.
- `pc-xr-procedure-fdi16-20261031-07`: live target-ray never intersected FDI16, 18-second timeout; only two storyboard frames and partial full WebM. Fixed by probing targetRaySpace inside active XRFrame and calibrating controller origin/orientation.
- `pc-xr-procedure-fdi16-20261031-08`: ray intersection and cut counter passed but before/after pixels were **[0,0]**; four partial frames/1.33 MB viewport WebM not accepted. Fixed with mesh/visibility/camera diagnostics, supported model bur radius and oblique viewer.
**Other historical IDs must not be reused even if they were functionally successful or visually rejected:** `pc-xr-phase9-clinical-focus-20261031-05` passed functional checks but left cartoon patient visible; `pc-xr-phase9-room-focus-20261031-06` corrected and passed, `pc-xr-phase9-controllers-lighting-20261031-04` passed; `pc-xr-procedure-fdi16-20261031-09` was a distinct previously published request and must not be reused regardless of final watcher state; `pc-xr-procedure-fdi16-20261031-10` completed screenshot gate. Owner-PC ledger and GitHub history are authoritative for exact individual statuses.
When any regression fails, inspect the existing ledger, original images and stack trace, correct real source/assumption, and create a **fresh unique ID and exact 40-char pinned source**. Never rerender under an old job ID or substitute generated imagery.

## 10. Evidence taxonomy: do not conflate
- **GitHub CI source tests:** Node/unit/build/schema/static validation in hosted runners; cannot prove workstation GPU, NVENC, UE viewport, Quest browser or dental accuracy. Snapshot after attach script: commit `3cd4f90...` had green GitHub CI; verify successor commit in new chat.
- **Owner-PC IWER:** genuine local Chrome WebGL/WebXR framebuffer images under emulated Quest poses, not a physical headset and not LAN server rendering. Job10 six original screenshot hashes and pixel inspection are usable as legacy dental-program regression.
- **UE 5.8 file installation / responsive blank editor:** reported local observations; no selected adapter or native pixel frame has yet been verified in chat.
- **Native Unreal GPU render proof:** needs original native UE screenshot visibly depicting lit OpenWorld/scene plus actual UE process's D3D12 selected dedicated GPU trace and a separately matched NVIDIA hardware preflight. Screenshot + adapter log still require human pixel/process review.
- **Actual Pixel Streaming 2 render + encode:** requires dedicated UE host GPU/encoder attribution and stream stats in an actual running session; **NOT yet built**.
- **Physical Quest 2 stereo + interactive latency:** requires real headset, secure local pairing, decoder, 6DoF perspective, control round-trip and p50/p95/p99 measurements; **NOT tested**.
- **Clinical validation:** a named qualified dentist checks FDI anatomy, technique and educational claims, recorded in review rubric; **NOT obtained**.
- **AI-generated concepts:** allowed only as clearly labeled design references, never app evidence.
- **PDF/Markdown handoff:** documentation only. This handoff cannot substitute any of the above measurements.

## 11. Principal technical files and direct navigation
- Roadmap: https://github.com/ajeshkg17/KlinikLab/blob/integration/single-chat-validation-2026-10-30/visual-qa/PHASE_ROADMAP.md
- LAN architecture: https://github.com/ajeshkg17/KlinikLab/blob/integration/single-chat-validation-2026-10-30/visual-qa/SERVER_RENDERING_ARCHITECTURE.md
- UE existing-project collector: `visual-qa/sr1-check-existing-unreal.ps1`
- Workstation instructions: `visual-qa/SR1_UE5_8_WORKSTATION_GPU_CHECK.md`
- Earlier repository-only smoke scaffold: `visual-qa/ue5_8-gpu-probe/KlinikLab_SR1_GPUProbe.uproject`
- Dedicated GPU/NVENC gate: `visual-qa/sr1-dedicated-gpu-preflight.mjs`
- Experimental UE5 VR prototype: `visual-qa/SR1_UE5_PS2_VR_PROTOTYPE.md`
- Future evidence schema: `visual-qa/SR1_PROTOTYPE_RESULT_TEMPLATE.json`
- Offline bundle check: `visual-qa/sr1-evidence-gate.mjs`
- Asset license/provenance: `visual-qa/dental-asset-register.json`
- Remote receiver read-only capability probe: `visual-qa/lan-stream-viewer-probe.mjs`
- XR job pointer: `visual-qa/jobs/xr-current.json`
- Worker operation: `visual-qa/xr-worker.mjs` and `visual-qa/README.md`
- Actual XR procedure harness: `test-support/webxr-test/procedure-sequence.mjs`
- XR procedure capture instructions: `test-support/webxr-test/PROCEDURE_CAPTURE.md`
- Browser-owned renderer: `engine.js`, `public/engine.js`; mesh/cut: `volumetric-lab.js`, `xr-procedure.js`
- Clinic dental review: `visual-qa/PROCEDURE_REVIEW_RUBRIC.md`
- Latest gallery index: https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/PC_XR_LATEST.md
- Experimental Epic VR feature documentation: https://dev.epicgames.com/documentation/unreal-engine/experimental-pixel-streaming-features
- Epic Pixel Streaming infrastructure: https://github.com/EpicGames/PixelStreamingInfrastructure
- Unreal local UE project: `C:\\Users\\ajesh\\OneDrive\\Documents\\Unreal Projects\\UE58_RenderSmokeTest`
- Ignored workstation evidence: `visual-qa/evidence-local/`. Never commit private logs, passwords, pairing credentials or patient data.

## 12. Active blockers and prioritized work
**P0 - workstation native evidence:** Confirm exact UE5.8 engine root, sync latest repo, take original HighResShot of the visibly rendered OpenWorld project, then run attach collector with new unique evidence directory. Check NVIDIA model/driver and actual FFmpeg h264_nvenc execution; compare process command line/project, D3D12 selected adapter, screenshot bytes/hash and pixel content. Do not claim GPU verified until this is done.
**P1 - actual UE5 Pixel Streaming 2 VR prototype:** After P0, create actual UE5 VR template; match Epic infrastructure versions; enable experimental PS2 VR pathway per current docs; test secure local video+pose/trigger round trip on physical Quest 2. No KlinikLab dental migration until a documented GO decision.
**P2 - photographically plausible licensed anatomy/material assets:** retain source/attribution/usage licenses, hashes and dental expert review. Do not silently lower detail for latency.
**P3 - existing app's optional short WebM decoder failure:** diagnose real browser recording/codec pipeline separately; preserve six verified app-eye PNGs; no fabricated video.
**P4 - unclipped periphery in wide XR screenshots and clinic realism:** code change, fresh unique owner-PC job and direct pixel review; these remain a *legacy browser* track.
**P5 - remote SR2-SR6 only after real Quest feasibility:** implement dedicated server GPU scene, synchronized per-eye encoding, secure WebRTC and authoritative controller actions with measured latency/comfort; maintain explicit no-fallback mode.

## 13. Short exact resume checklist for replacement chat
1. Open this handoff **and read current** `visual-qa/PHASE_ROADMAP.md` and `visual-qa/SERVER_RENDERING_ARCHITECTURE.md` from `integration/single-chat-validation-2026-10-30`. Fetch branch HEAD and inspect `git log`/commit statuses, do not treat snapshot SHA as eternally current.
2. Confirm owner PC Unreal observation only: external `UE58_RenderSmokeTest` blank OpenWorld loads D3D12 pipelines and editor is responsive; no accepted native screenshot, GPU/NVENC, Quest or PS2 stream yet.
3. Do **not** launch a second blank editor. Use `visual-qa/sr1-check-existing-unreal.ps1` on Windows with actual `-ProjectDirectory` and `-EngineRoot`; ensure native `HighResShot 1920x1080` was captured, run exact-source NVIDIA/NVENC preflight and collect native log/screenshot/process information into a fresh ignored evidence directory.
4. Inspect **actual screenshot pixels and actual RHI GPU adapter selection**; distinguish evidence file hashes from genuine physical proof; if blocked, record precise missing command output/path rather than asking general repeated questions. Never claim Unreal server rendering or Pixel Streaming until demonstrated.
5. Only after P0, build a separate true UE5 VR template + experimental Pixel Streaming 2 prototype, pair Quest 2 via HTTPS and test perspective-correct real 6DoF stereo and returned controller input with measurements.
6. Preserve existing browser/IWER job pointer and gallery; **never reuse job07/job08/job09/job10 or other processed IDs**. CI ? hardware/clinical signoff. Continue one bounded change at a time and record tests, hardware limitations and acceptance status.
7. Keep this Markdown editable beside the PDF at `visual-qa/handoffs/KLINIKLAB_DEVELOPMENT_SR1_HANDOFF_2026-10-31`. Update both together after material changes.

## 14. Handoff provenance and caveat
This text consolidates authoritative current repository roadmap/architecture, GitHub branch and commit history, published IWER evidence and the user's current owner-PC observations as of 31 October 2026. It is **not** a new workstation inspection, clinical review, remote-stream test or measured GPU benchmark. All status assertions explicitly distinguish code/source reports, personally reviewed browser images, user-reported local Unreal logs, and unperformed hardware gates.
