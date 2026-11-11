# KlinikLab complete-application migration — Godot-first

**Status: native application foundation implemented, whole application NOT migrated.** This is a separately runnable Godot 4.7.2 desktop project built from the full browser application's exact-Git educational source content. The *existing browser application* remains the fully featured functional reference. Do not confuse a clinic render, a Godot shell, or even a successful source parse with full feature parity.

## Build and open on Windows

From a clean KlinikLab checkout (Node 22+, Git and Godot 4.7.2 installed), run the local launcher in PowerShell:

```powershell
& .\native-godot\launch-local.ps1
```

It locates Godot 4.7.2 using `KLINIKLAB_GODOT_EXE`, versioned or generic executables on `PATH`, or the WinGet install folder. It checks versions and the clean source state, builds into a **new unique** folder under `%LOCALAPPDATA%`, then **waits for `--headless --editor --import` to finish** and checks for the imported CC0 whole-clinic PackedScene before launching the desktop app. A failed import or an app process exiting within five seconds raises an error. New `launcher-logs` record stdout/stderr, exact source SHA, executable, import status and PID. Pass `-OpenEditor` for the editor or `-GodotExecutable` for a custom executable. Existing folders are never overwritten; no captures, watchers or uploads are triggered. **Launch from the actual unrestricted interactive Windows desktop session**, as a restricted/private session may have an invisible window handle.

The equivalent manual commands are:

```powershell
$sha = (git rev-parse HEAD).Trim()
$run = Join-Path $env:LOCALAPPDATA ('KlinikLabNativeApp-' + [guid]::NewGuid().ToString('N'))
node native-godot/build-app.mjs "--source-dir=$PWD" "--expected-sha=$sha" "--output=$run"
& 'C:\PATH\TO\Godot_v4.7.2-stable_win64.exe' --headless --editor --path $run --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed; do not launch.' }
& 'C:\PATH\TO\Godot_v4.7.2-stable_win64.exe' --path $run
```

Append `--editor` to the **second** Godot command only to open the editor. Never skip the import pass for a fresh build: `build-app.mjs` deliberately leaves no `.godot` imports, and directly opening the app can exit 4 with `No loader found for whole-clinic-starter-v1-godot.glb`.

**SR54 owner-PC diagnosis (4 November 2026):** The exact earlier SR51 merge `431acc9036bab5d01f7be7bab8a55fca0ec1b6f7` failed before import. The unchanged build opened after a successful import when invoked from an unrestricted interactive desktop. The visible process reported **Vulkan 1.4.325 Forward+ on NVIDIA GeForce RTX 5060 Laptop GPU**; OS inventory reported driver 591.86. **GPU visual acceptance remains NOT ACCEPTED** due to malformed narrow toolbar controls at 1280×720 and incomplete engine-counter/DXGI verification. The prior owner-PC diagnostic logs/patches and held evidence are untouched; this does not claim new visual acceptance for a later SHA.

The exact-source builder refuses reusing an existing output folder. It copies Godot scene/scripts, generates original FDI16 before and after-cut OBJ data from the production **volumetric-lab.js** mesher, independently exports the six synthetic production cases and seven stations, and loads original source FSP dialogue, handover, viva, clinic questions and instrument catalog. Two independent exporter digests must match. All six original synthetic cases now have source-derived case-specific editable volume fields; none is a clinically calibrated model.

## What is functional in the new standalone Godot application

- One running desktop app with real Godot native controls, a schematic **whole dental clinic** and the original five-tissue FDI16 before/after-cut 3D meshes.
- Six source-derived educational cases (FDI 16, 36, 11, 26, 48, 46), seven stations, and case/station navigation. FDI16 geometry hides when other cases are selected; no false FDI36 anatomy attribution.
- Original training question text and choices for patient interview, clinician handover, viva and everyday clinic with formative feedback.
- All six original **case-specific practical workflow task lists** exported from the bounded pure source `getPractical` function: choose FDI target, answer clinical decisions, select original named instrument, view drill instructions clearly labeled as **not yet a live cutter**.
- German FSP letter / written clinical-plan drafting, source-derived primary/alternative plans, instrument vocabulary selection.
- Local **user://** progress per case/station and answer and note recording; reset controls. Synthetic cases only. No network storage or patient backend.

## Explicit unimplemented functionality before full migration

| Source browser subsystem | Required parity gate | Current native state |
|---|---|---|
| `app.js` journeys and dialogue | Case-specific state machine, patient response progression and session history for all six cases | Quiz/navigation foundation only |
| `volumetric-lab.js` | Live bur-swept 3D volume subtraction, mesh reconstruction, undo/reset, metrics/cross sections | Source-derived editable volumes across all six cases, native mesh reconstruction, undo/reset, grid samples; no calibrated metrics/cross-sections |
| `engine.js`, `dental-appearance.js`, `real-dental-scene.js` | FDI32 anatomical atlas, jaw/orientation, picking, material shading, geometry fidelity | FDI16 exact source plus schematic room |
| `dental-practice.js` / `app.js getPractical` | All operative decisions, instrument sequences, dental tool states and simulated cutting | Source decisions/tools interactive and six synthetic tooth-volume sandboxes; clinical tool physics and workflow completeness not verified |
| `fsp-kp-training.js` | Case/phase German B2/C1 response rubric, explanation and evidence-free formative scoring | All four original fictional cases, 16 phases, 5 keyword criteria/phase, explicit safety cautions, offline saved answers; no language/exam certification |
| `desktop-suite.js` | Synthetic X-ray with interpretation, local STL/OBJ inspection, bur response and provenance | Six source-procedural synthetic projections, location marks, reveal/feedback and local STL/OBJ inspection; physical bur physics and clinical radiography not ported |
| `clinical-pathway.js` | Care workflow, handover, documentation and safety checks | Text prompts only |
| `ai-ui.js`, `server/ai-core.mjs` | Opt-in secure local/server AI with data and credential isolation | Not ported; no API keys in native app |
| `xr-procedure.js`, `xr-guide.js` | Tracked Meta Quest controllers, ray selection, physical headset QA | Not ported or headset verified |
| Reports, progress, release evidence | Clinical-learning report export, source-aware state persistence, UI accessibility and native GPU user QA | Local draft/progress only; no grading/clinical acceptance |

These are actual functionality milestones, **not** visual milestones. Do not mark the entire interactive application migrated until all gates independently pass with deterministic tests and original owner-PC pixels and GPU attribution. Preserve the original browser app as the supported reference in the interim.

## Evidence acceptance

Source CI can build/check and run synthetic headless tests using Godot 4.7.2, but does not prove native Windows GPU rendering. A fresh exact-SHA owner-PC run requires visible native full-clinic app pixels with the full UI, case selection changes, at least two training station interactions, saved/reloaded progress, source geometry hash/triangles, distinct valid engine-PID 3D PDH samples and matching RTX5060 DXGI LUID. Never rerun job07/job08 or overwrite their original evidence, do not bring Godot to visible foreground during automated capture, and review exact published PNG pixels directly. Native app migration status must remain **IN PROGRESS** until all functional gates pass.

## SR3 — FDI16 source-pinned native volumetric practice (in progress)

The build now exports a four-channel float32 grid sampled **directly from production `volumetric-lab.js` ToothSolid** at the exact Git source SHA (outer, dentin, pulp and caries). The native Godot `volume-cut.gd` verifies the grid's SHA-256 and implements true 3D signed-distance union-of-bur-spheres subtraction, marching-tetrahedra mesh reconstruction, separate native tissue materials, swept adjacent strokes, undo, reset and local JSON stroke replay. In case FDI16's practical station, use the X/Y/Z and radius sliders and Apply; the left mesh remains the immutable before model, the right model updates.

The native sampled grid is a **new computational mesh**, not the immutable original OBJ or a medical scan. Rendering details and cervical tissue boundaries can differ from the source JS mesher (native trilinear material classification). Approximate removed-sample percentage is not a clinical cut-depth, volume in mm³, pulp proximity score, or competency grade. The 32-stroke cap bounds runtime cost. Superseded by SR9: source-signed editable native volumes exist for all six case-specific FDI teeth; clinical validity remains unverified. Hash mismatch blocks the editor rather than silently substituting a model.

Headless volume smoke: `godot --headless --path <built-project> --script res://volume-cut-smoke.gd`. A successful smoke verifies source grid loading, 3D changed mesh, undo/replay/reset and invalid parameter rejection; it is **not** a Windows RTX or clinical acceptance.

## SR4 — Original fictional patient replies and local formative reports

The six original source cases each provide the fictional patient's name, age and seven reply messages exported from `app.js`. A correct guided interview response reveals the corresponding source reply. This is NOT a free-form patient simulation or certified FSP assessment.

The Progress panel now supports **Export local learning report (.txt)** to a user-selected local file. It includes exact source SHA, source case/station identifiers, studied status, formative answer counts, saved drafts and optional FDI16 voxel sample statistics (never mm³). The export never uploads data, but users should not enter real patient details. Reports do not constitute clinical documentation or official examination results.

## SR5 — Native six-stage clinical pathway

The native **Journey** tab uses the original six fictional cases in `clinical-pathway.js`, exported under an exact-source SHA contract. For each case, learners can ask scripted history questions, request original tests, choose a working diagnosis, compare two distinct treatment options, acknowledge discussion of consent, order the original procedure steps and review the source clinical-safety notes. Selections are saved per case locally and included in formative learning reports. Distractors are present and the system does not grade clinical competence or replace an examiner.

This is a real, persistent native state machine with separate clinical pathway source provenance, not a 3D rendering label. It remains a scripted educational scenario, **not** a live patient simulator, validated diagnostic tool, calibrated operative trainer or authoritative medical guidance.

## SR6 — Complete schematic permanent dentition preview (32 FDI positions)

`export-atlas.mjs` generates all 32 permanent FDI tooth IDs using the **existing production** `ToothSolid` and `VoxelMesher` source, with tooth-class-specific synthetic crown/root shapes at lower preview resolution (16). Each tissue-separated triangle binary has its own SHA-256, and `atlas-viewer.gd` checks source Git SHA, per-FDI identity, triangle counts and material counts before displaying it. The new native **Anatomy** tab switches among 32 FDI meshes and supports model rotation. Other selected cases also show their source-derived schematic teeth rather than the unrelated FDI16 mesh.

**Boundaries:** this is a procedural educational atlas, **not** a licensed anatomical scan, measured clinical morphology or certified diagnosis. The lower-resolution atlas meshes are preview-only. For now, **FDI16 is the only live 3D editable-volume case**; other teeth are not marked drillable. The source original before/after FDI16 comparison is separate and unchanged. The standalone Godot project is built/tested headlessly and packaged by Actions; Windows RTX/GPU pixel acceptance remains unverified.

## SR7 — Local 3D surface inspection

The new **Scans** tab opens a user-selected local **OBJ** (positive polygon vertex indices, fan-triangulated) or **binary STL** and creates a 3D native mesh using Godot. Input never leaves the computer. The parser caps input at 20 MB and 50,000 triangles, rejects malformed/degenerate/out-of-bounds data, rescales only for display with **unknown physical units**, and offers model rotation and wireframe inspection. Files are not persisted in the progress record and are never submitted to AI.

This is a bounded, local file inspector, **not** segmentation, tooth registration, radiology interpretation, reconstructed CT, a patient data system, or validated anatomy. Users are responsible for source licenses, consent, privacy, and original measurement units. The parser intentionally rejects ASCII STL, negative OBJ indices and files with unsupported structure. Superseded by SR9: the six case-specific FDI teeth have editable synthetic training volumes.

## SR8 — Portable Windows x64 native export (provenance-pinned, GPU QA outstanding)

The dedicated `.github/workflows/sr8-native-windows-export.yml` workflow runs **on integration branch updates**. It builds the complete current Godot project from exact Git HEAD, verifies official Godot 4.7.2 editor SHA-256 and export-template archive SHA-256, includes the native source data files, cross-exports `KlinikLab.exe`, generates SHA256SUMS and publishes a `KlinikLab-Windows-x64-<commit SHA>` GitHub Actions artifact for download. Extract the entire artifact and start `KlinikLab.exe`; keep any generated `.pck` beside it.

The 1.28 GB signed-release archive is downloaded into CI only and is not included with the end-user application. An official export template and executable signature/checksum are **not** evidence of successful Windows runtime, proper application pixels, valid RTX5060 GPU usage, XR tracking, or medical acceptance. The source-side standalone Godot project remains an independently packaged fallback, and the original browser application remains the full-feature reference.

## SR9 — Six case-specific editable synthetic volumes (clinical validation outstanding)

The exact-source native build now exports **six separately labeled four-channel scalar-field models**, each directly sampled from the original `volumetric-lab.js` `ToothSolid` implementation for its source case and FDI: FDI16 restorative, FDI36 endodontic, FDI11 anterior trauma, FDI26 crown, FDI48 surgical planning and FDI46 periodontology. Each model has a distinct manifest containing source Git SHA, case ID, FDI, tooth class and SHA-256; the six-model index is independently verified at native load. Equal hashes for identical source-defined tooth-class geometry are permitted, but case identity cannot be silently exchanged.

In the practical station, the four restorative/endodontic/prosthodontic source tasks offer native 3D sphere/swept-stroke subtraction with undo/reset. The surgery and periodontal cases have **only a separately labeled optional geometry sandbox**; cutting a tooth shape is neither an extraction nor subgingival scaling simulation. The original FDI16 immutable OBJ before/cut comparison remains untouched. For non-FDI16 cases, the lower-resolution original procedural atlas preview is shown near the editable higher-resolution source-derived volume in the clinic. Editing is deliberately bounded at 32 strokes per case.

Local progress uses `volumeByCase[caseId]` to isolate strokes, and locally generated learning reports list each case separately. The legacy FDI16 progress entry is kept for same-source compatibility; source SHA changes still gate history recovery. Native Godot headless regressions prove all six editable geometries, FDI labels, topology changes, undo/replay and inter-case local persistence. They do **not** prove Windows GPU pixels, force feedback, bur collisions, clinical accuracy, pulp protection or official examination grading.

**Remaining gaps:** complete interactive browser parity, physically meaningful dental tool interactions, current radiography, free-form patient dialogues, Quest headset XR, optional AI, and direct owner-PC Windows process/device/pixel evidence.

## SR10 — Source-procedural radiography teaching (not a real X-ray)

The native **Radiology** tab now shows six newly rendered, **synthetic** radiographic-style PNG projections generated from the same browser `desktop-suite.js` case table and `volumetric-lab.js` `ToothSolid` attenuation model. The source data and original source Git SHA are recorded; every PNG is SHA-256-checked at display time, with exact original case ID, FDI and simulated finding type. Godot displays the real decoded image, not a blank or static symbolic diagram. The native projection is adapted to 360×240 (with a bounded 120×80 source-ToothSolid attenuation sampling grid and interpolation) and is not a byte-for-byte browser screenshot. This interpolation makes the build reproducible and bounded but further reduces any appearance of measured clinical fidelity.

Users can mark up to 20 image locations, select a suspected finding, reveal the original case's predetermined answer and explanation, reset, and save a separate local study record for each case. Radiology entries appear in the offline formative learning report. Godot CI verifies six decoded source images and case-specific interaction persistence.

**All radiographs are fictional generated projections, never patient images.** No exposure physics, radiological acquisition geometry, clinically measured attenuation, certified interpretation, actionable diagnosis or actual patient health record is implied. Actual licensed dental radiographs and professional assessment would require a completely separate validation pipeline. This change does not add AI, image upload, Quest VR, true clinical diagnostics or native GPU acceptance.

## SR11 — Original FSP/KP German language studio (four source cases, 16 exercises)

The standalone Godot **Language** tab now ports source-bounded content from the exact Git revision of `fsp-kp-training.js`, with **four** original fictional language cases (FDI 46 periodontal, FDI 16 restorative, FDI 36 endodontic and FDI 48 surgical), each with **four** phases: Anamnese, Aufklärung, Befund / Arztbrief and Arzt-Arzt. These are independently defined source cases and **do not cover the FDI11 or FDI26 cases** in the separate six-case operative simulator. No new patient scenario is invented or misattributed.

Every prompt contains the original fictional history, B2/C1 linguistic example, four-term bilingual glossary, original example answer, and **exactly five** original source keyword criteria. Native `fsp-kp-rubric.gd` implements basic case-insensitive lexical coverage and two carefully scoped original caution patterns (blanket antibiotic recommendations and unsafe dismissal of breathing/swallowing difficulty), suspending numeric coverage feedback where those patterns are detected. It does not evaluate grammar, fluency, negation beyond those explicit phrases, diagnostic accuracy, patient communication quality or clinical competence. There is no AI, online scoring, official FSP grading or language certification.

Freeform German answers and criterion-by-criterion formative results are stored locally under the **separate** `fspKpByTask[case|phase]` key, with source SHA gating and offline educational report support. Closing/revisiting the page saves draft edits, but no patient data should be entered. **68 scorer probes computed by the original JavaScript scorer** are exported and compared to native Godot results in real headless CI, including blank and exemplar answers plus explicit positive/negated safety language. Failure blocks the native build. Full Windows GPU and actual oral-exam evaluation remain unverified.

## SR12 — Click directly on the editable native 3D tooth (opt-in)

In **Clinic → Practical**, select an original case-specific tooth and click **Enable direct 3D tooth click-to-cut mode**. The editor automatically uses the close-up Teeth camera; click the **right-hand, editable synthetic 3D tooth** inside the central 3D view. Godot computes a segment/triangle hit against the **currently rebuilt native tissue mesh**, not an approximate bounding sphere or a different patient's tooth. The hit is mapped back into the original procedural source-coordinate field (including the original mesh Z sign flip), and the same hash-verified `volume-cut.gd` 3D-sphere subtraction and `volumeByCase` saved stroke history are used. Undo, reset, source FDI checks and 32-stroke limit are unchanged. Manual X/Y/Z sliders remain as fallback.

The click mode **requires explicit activation** and automatically disables on case changes, when leaving Practical station, or when switching away from the Clinic. Only clicks inside the central 3D viewport are eligible, never the navigation, learning text, report or controls. The radius is governed by the existing model-unit slider. There is no physical collision feedback, accurate bur geometry, force sensation, clinical depth score, or actual patient procedure. Surgery/perio remain clearly labeled *optional geometry sandboxes*, not extraction or root-scaling operations.

New real Godot headless checks exercise all six distinct source model ray hits, 3D mesh changes, undo, invalid rays, hidden-tooth rejection, and opt-in application persistence. Windows visible viewport pixels and physical mouse/GPU attribution still require owner-PC acceptance.

## SR13 — Actual static CC0 clinic imported in the runnable Godot app

The reviewed assembled clinic environment and static instrument tray from 3DAssets.dev are **copied into the generated Godot project**, not merely indexed in the repository. The selected source-original CC0 GLBs are `assets/cc0/3dassets-dental/whole-clinic-starter-v1.glb` and `instrument-tray-v1.glb`; each is independently compared with its same-byte original in the 54-item `visual-qa/asset-research/assets/dental-practice-cc0-v1/` pack. Both byte count and SHA-256 must match the reviewed inventory; a source SHA, source-license, model or manifest drift blocks the native build.

The runtime `cc0-clinic.gd` validates the committed build SHA, CC0 status, original GLB bytes, imports the *actual* `PackedScene` meshes via Godot and mounts them in the same live `main.tscn` scene as the original source-identified six FDI case tooth models. The original schematic operatory background is disabled, not overlaid as substitute evidence. The normal Clinic view retains the existing FDI16 reference model, all six isolated 3D tooth volumes and their treatment workflows; the new **Environment** tab provides a wide camera over the static imported dental clinic. Imported clinic mesh counts are displayed in the app. The included tray remains a static prop and is NOT claimed as a clinically verified instrument with grasping physics.

**Validation:** exact CC0 original hashes, actual Godot GLB import/mesh instantiation, source-case/FDI/treatment regressions and a full Windows cross-export are required CI gates. These checks are not independent visible Windows pixels or process-specific RTX/Quest acceptance. The full clinic scene is a stylized, uncalibrated educational background, not a dental treatment instrument model, medical scan or anatomy library. The original 54-model batch remains available separately for future staged component integration.

## SR14 — Real *exported application* capture for new owner-PC watcher

The integrated native Godot app now contains an **opt-in capture hook** compiled into the actual portable Windows executable. It only activates when launched with a new unique `-- --kliniklab-native-pc-capture=pc-kliniklab-native-cc0-...` argument. With a non-headless real renderer and the CC0 scene mounted, it captures three original, unedited **root-viewport PNGs**: CC0 clinic overview (FDI16), the native practical station (FDI36), and another case's practical station (FDI26). Each original image has its SHA-256, dimensions and FDI/case identity in a local immutable JSON report. It logs the actual exported-app **PID**, Vulkan renderer and reported adapter/vendor, the source Git SHA, and independently loaded CC0 mesh counts. It retains a moving real 3D camera for approximately 42 seconds for separate process-PID 3D engine PDH/DXGI LUID measurement on the owner's Windows workstation.

Capture output is **local only** at `user://owner-pc-captures/<unique-job-id>`; neither app nor built-in capture uploads images, credentials or patient data. A private WinSta0 desktop launch is preferred to avoid foreground activation. **The owner-PC helper must separately run and publish the approved capture job and PID-correlated GPU evidence; the development chat must inspect the actual original PNGs.** The CI smoke test loads the *real* `app.tscn` and verifies the CC0 scene, six native FDI editors, practical content and per-case clinical pathways, but is headless and never claims native pixel or RTX acceptance.

Old job07/job08 images or Blender model previews are not substitutes for these new run-specific images. A newly generated Windows executable with this hook still requires owner-PC execution, fresh evidence publication and independent review.

## SR15 — Sampled synthetic pulp-region contact indicator (not dental safety grading)

The source-derived voxel model already contains four spatial scalar channels (outer shape, dentin, pulp and caries) for each of the six case-specific FDI teeth. The live cutter now keeps a separate integer count of source occupied grid samples satisfying both **outer inside** and **model pulp inside**. When the rebuilt signed-distance volume removes those samples, it reports `removedModelPulpSamplePoints` as a subset of total removed samples, plus `syntheticPulpRegionContact` and an approximate proportion of model pulp-grid samples. This is derived entirely from the original four signed-distance source fields; no anatomical threshold, pseudo-volumes or clinical depth conversion are fabricated.

The Practical station shows the model-only pulp indicator, case-specific FDI and explicit warnings that **absence of sampled contact does not demonstrate safety**. The offline educational report records the loaded case's sampled pulp-contact indicator. Original stroke journals remain unchanged and per-case: undo, reset and source-identical replay recompute all samples deterministically rather than trusting user-submitted feedback values.

New real Godot 4.7.2 headless tests require each of the six FDI volumes to have a source-model pulp sample, cut a source-verified sample inside allowed synthetic bounds, detect model pulp removal, undo, replay and reset. Clinical pulpal exposure, operative feasibility, pulp protection, treatment score and Windows RTX visual/pixel evidence are **not** inferred from these sampling counts.

## SR16 — Fix the actual exported Windows raw OBJ and GLB bytes gap (job09 failed)

**Job09 forensic trigger:** actual Windows executable started in private WinSta0 but exited before captured pixels because Godot's source scene reported `Original source SHA-256 mismatch for fdi16-before.obj` and the CC0 loader could not read the raw converted GLB. Godot's `--editor --import` and `--export-release` remap recognized `.obj` and `.glb` source resources to internal native mesh/`PackedScene` files. The *imported meshes* can render while `FileAccess.get_sha256("res://original.obj")` no longer returns original file bytes. The correct response is not to relax source provenance.

The reviewed native build now includes a **separate, verified portable sidecar folder**, `verified-raw-source/`, alongside `KlinikLab.exe`. It includes original FDI16 `.obj` (before/after) and `.mtl`, all source-stamped manifests/case data, both original approved CC0 `.glb.source` publisher binaries, and the deterministic CC0 Godot-dequantized `.glb` files. A source-exact Node release verifier checks the original OBJ/MTL SHA256 against `kliniklab-export-manifest.json`, original GLB SHA and byte sizes plus compatible GLB SHA/bytes against `clinic-manifest.json`, the original source Git SHA and six-case app manifest. `RAW-SOURCE-SHA256SUMS.txt` cryptographically lists the portable raw files independently of `SHA256SUMS.txt` for `KlinikLab.exe`. CI refuses incomplete ZIP bundles.

The new application-only `main-raw-sidecar.gd` retains all original FDI16 tissue/procedure checks and source face parity, but resolves raw bytes through `raw-source.gd`, which first tries the original `res://` source (normal Godot editor project), then **only if its SHA does not match** tries `OS.get_executable_path().get_base_dir()/verified-raw-source/<source-relative-path>`. It fails closed on unknown/unsafe paths or any checksum mismatch. The CC0 static scene applies the same source SHA resolution for original and compatible GLBs, but still loads the actual Godot-native `PackedScene` through `ResourceLoader` and preserves all six native FDI/treatment workflows.

**Portable extraction:** extract the ZIP in full. Keep `KlinikLab.exe`, `verified-raw-source`, both SHA sum files and the manifest in the **same extracted directory**; never launch the EXE alone or delete the sidecar. These assets contain fictional educational geometry only; this is not clinician validation or a real patient image. Source-only legacy Godot scene and historical job07/job08/failed job09 evidence remain immutable.

This repair needs a **new** exact-SHA Windows GitHub Actions export and **new unique job10** (not job09 rerun) for actual owner-PC pixels and RTX PID/DXGI/PDH validation. A passing source or GitHub export check does not establish physical Windows runtime or GPU pixel acceptance.

## SR17 — exported Windows EXE capture hook (job10 forensic repair)

Immutable owner-PC job10 (pc-godot-exported-20261101-cc0-job10-525457) verified original OBJ and CC0 3D scene imports and observed 34 positive RTX 5060 same-PID/LUID 3D periods. However, the application returned no capture JSON or original PNGs. Its standalone executable loaded the normal app.tscn despite the previous '--script res://exported-app-capture.gd' launcher option. Independent image/RTX acceptance therefore remains BLOCKED; never rerun job10.

The new capture path is a strictly opt-in child Node in the real app.tscn. The approved private WinSta0 watcher launches the full exported KlinikLab.exe with the Godot user argument '-- --kliniklab-exported-pc-capture'. On actual startup, app.gd reads OS.get_cmdline_user_args() and only for this explicit flag loads the compiled exported-app-capture-node.gd. The child checks the pinned source SHA, native Vulkan renderer, actual CC0 imported mesh, all six FDI/treatment workflows, and FDI36 practical state, and saves native viewport PNGs plus a local in-app report. Normal learner launches neither capture nor upload data; no foreground activation is allowed.

The Godot 4.7.2 CI checks the new Node script and source wiring but is headless, with no claim of Windows pixels or RTX process attribution. Acceptance requires a new exact-SHA export and a single unique job11, with original watcher-generated screenshots and independent image/GPU review. Preserve job07/job08/job09/job10 immutable archives.

## SR20 — physical Windows capture bootstrap diagnostics (after immutable job11)

Owner-PC job11 verified source-specific FDI16 and CC0 imported GLB runtime plus 34 positive RTX5060 3D PID/LUID periods, but published **no original viewport PNG** and **no native capture report**. The in-app node creation previously used `call_deferred` and therefore exposed no evidence before the first frame when startup shaders stall. SR20 logs only a Boolean indication of the exact opt-in CLI user argument and whether the watcher provides a 40-character SHA; a missing flag with valid watcher SHA is fail-closed. If the flag arrives, app.gd synchronously calls the native capture Node, which writes an immediate `native-exported-app-result.json` checkpoint before scheduling any drawing; later stages record entry, CC0 PNG, FDI36 PNG, and completion or timeout. Real source-built Godot headless CI must verify startup, immediate report creation and explicit renderer rejection; CI **cannot** validate RTX/pixels. Never rerun jobs09/10/11; any physical retest needs a fresh exact SHA export and unique job12.


## SR21 — Physical pixel-review remediation

Original physical job12 showed correct CC0 clinic, six case workflows, FDI36 practical and real RTX5060 3D rendering, but revealed non-final UX: legacy source-only FDI16 overlay over the app, dark text, geometry visible through panels, small room and teeth overlapping the case notes. The native app now hides only that legacy overlay, displays high-contrast text on opaque side panels, scrolls top tabs, updates current FDI title, and reframes both source clinic and practical teeth. No source 3D geometry, hashes, patient cases or saved clinical progress were replaced. The new Godot headless UI smoke test is only geometric; new original Windows pixels and independent visual review are necessary before UX acceptance. Owner-PC jobs09–12 remain immutable.


## SR40 — source-verified FDI 36 tooth reference

The native endodontic practical for the original endo case (FDI 36) now mounts a separate University of Dundee mandibular-left-first-molar surface reference. Its original GLB is byte-verified against upstream Git blob 73e9f3029d770c6b4052ebbaba708283de4c47fd at source commit 4f0ffb651998a4641ddf45c7632ea236cc164fcb. A build-time Draco decoder creates a Godot-importable GLB; geometry, indices and node transforms are retained, while the embedded WebP texture is replaced with a neutral material. Both original and converted binaries are carried as SHA-256-verified raw sidecars.

This surface mesh is not the synthetic editable tooth volume: it contains no internal tissue/canal segmentation and is not patient-specific or clinically calibrated. The UI retains University of Dundee attribution and CC BY 4.0. If either source sidecar or the converted resource is absent or corrupt, a clearly labelled FDI 36 missing-asset fallback appears. The reference is only visible in the FDI 36 endodontic practical station; other FDI cases and their source task definitions remain independent.

Headless CI validates exact source identity, Draco conversion/import, runtime mesh instantiation, FDI station gating, fallback labelling, and the six-case source mapping. It does not establish visual/GPU placement, clinical anatomy review, browser parity, or workstation/Quest acceptance.


## SR41 — remaining five FDI source-surface audit and first crown reference

The six source cases stay ordered FDI 16, 36, 11, 26, 48, 46. Of the five cases not yet supplied with a Dundee surface reference:

- FDI 26 (crown): exact-side left maxillary first molar, existing assets/dundee/maxillary_first_molar.glb, original Git blob SHA 0948d093089c5921281185a103b323c513365502, equal to pinned upstream Dundee mirror commit 4f0ffb651998a4641ddf45c7632ea236cc164fcb. CC BY 4.0 attribution. **Added as a separate static surface reference** in its native practical station.
- FDI 16: no exact-side validated surface reference in the existing left-side Dundee set; maxillary first molar (26) would require explicit side mirroring and qualified anatomy review.
- FDI 11: no exact-side validated surface reference in the existing left-side Dundee set; maxillary left central incisor (21) is not an unmodified FDI 11 model.
- FDI 48: no exact-side validated surface reference in the existing left-side Dundee set; mandibular left third molar (38) is not an unmodified FDI 48 model.
- FDI 46: no exact-side validated surface reference in the existing left-side Dundee set; mandibular left first molar (36) is not an unmodified FDI 46 model.

All 16 Dundee GLBs are separately attributed under CC BY 4.0 in assets/dundee/README.md, but only the 36 and 26 native practical references have source-pinned import/loader checks; the other four are **candidate contralateral surface shapes**, not approved FDI-specific anatomy. No GLB encodes validated pulp/canal anatomy or a patient-specific cutting volume. Browser-side FDI tasks, synthetic volume editing, practical progress and FSP/KP remain unchanged.

The native FDI26 reference is Draco decoded at build time using an exact original Git blob allowlist, retains original/converted SHA-checked raw sidecars, and uses a neutral (not original WebP textured) material. A missing or invalid model yields an explicit labelled fallback. Headless import and station routing are tested; clinical morphology, scale, graphical placement, native GPU pixels and Quest remain unverified.


## SR42 — FDI16 illustrative contralateral mirror (not verified anatomy)

For FDI16 molar practical only, the app can display an **explicitly mirrored, illustrative** surface made by a negative-X scale of the already source-verified **FDI26 left maxillary first molar**. The underlying original Dundee GLB remains FDI26: upstream original Git blob SHA `0948d093089c5921281185a103b323c513365502`, University of Dundee, School of Dentistry, **CC BY 4.0**. No new exact-side/right-tooth original is present and no independent right-side morphology is claimed. Runtime reporting includes `sourceFdi=26`, `fdi=16`, `mirroredFromContralateral=true`, `exactSideSourceAvailable=false`, and `anatomicalSideValidated=false`.

The mirrored surface uses the existing source-verified FDI26 original/converted sidecars with their strict hashes and a clearly labelled missing-asset fallback. No duplicate physical GLB is added: it is a third **illustrative runtime instance** but still **two distinct real source tooth GLBs (36 and 26)**. The mirrored model is separate from the source-derived synthetic editable volume; it does not replace drilling tissue, FDI scoring, FSP/KP drafts or progression. Root anatomy, normals under mirroring, scale and visual placement remain unverified on real GPU; no qualified anatomical review or clinical acceptance is implied.


## SR43 — exact-side candidate license audit and source clearance UI

Exact-side FDI 11, 48, and 46 models are listed by OPEN DENTISTRY / UFSC, but each Sketchfab entry displays Creative Commons Attribution–NonCommercial–ShareAlike. Their listing description is for research and personal teaching under the individual Creative Commons conditions; this does **not** establish compatibility with unrestricted public redistribution of a modified, bundled Godot application. The models are not imported into the native build, and no source SHA-256 or original geometry identity is claimed. The original six-case synthetic educational volumes remain unaffected.

| FDI | Exact-side source listing | Source license | Native clearance |
| --- | --- | --- | --- |
| 11 | [OPEN DENTISTRY upper right central incisor (11a)](https://sketchfab.com/3d-models/dente-11-upper-right-central-incisor-id-11a-63be208b66214c5d9afb647bdaa8a81e) | CC BY-NC-SA (listing, exact version not independently checked) | **Not cleared; no mesh imported** |
| 48 | [OPEN DENTISTRY lower right third molar (48a)](https://sketchfab.com/3d-models/dente-48-lower-right-third-molar-id-48a-6ab34e265b73467a94be29b3887a1c64) | CC BY-NC-SA (listing, exact version not independently checked) | **Not cleared; no mesh imported** |
| 46 | [OPEN DENTISTRY lower right first molar (46c)](https://sketchfab.com/3d-models/dente-46-lower-right-first-molar-id-46c-79ea3b60a12441c3acb11b204bc21bea) | CC BY-NC-SA (listing, exact version not independently checked) | **Not cleared; no mesh imported** |

A further [Japanese tooth-shape database](https://a-kato.agu.ac.jp/English/bottom.html) identifies an FDI 46 STL/OBJ, but the accessible source page does not grant a clearly applicable redistribution license. It is likewise not imported. The existing Dundee GLBs are left-sided, and must not be silently relabeled as exact-side FDI 11/48/46 anatomy.

The native practical station now visibly distinguishes **external surface reference unavailable** from its synthetic editable educational volume for FDI 11/48/46, with candidate credits and explicit licence status from `fdi-reference-clearance.gd`. This is a metadata-only workflow enhancement: no new downloaded binaries, user data, clinical claims, changes to browser cases or FSP/KP, or automatic requests to third-party hosts. Node contract and Godot headless UI regressions enforce disclosure; graphical visual/GPU verification and dental morphology review are still pending.


## SR43 — learner-visible model provenance states

The practical stations now label the status of every available tooth surface reference:

- **SOURCE-VERIFIED SURFACE REFERENCE — FDI 36 and FDI 26:** source Git blob, upstream commit and CC BY 4.0 attribution are pinned and checked. This verifies provenance and reuse terms only. The GLBs are external surface meshes, not validated internal anatomy, calibrated cutting volumes or clinically reviewed treatment models.
- **ILLUSTRATIVE ONLY — FDI 16:** the visible mesh is a negative-X illustrative mirror of source-verified FDI 26. The station explicitly says it is not source-verified right-side anatomy. An exact-side DTU/3Shape FDI16 intraoral-scan candidate is disclosed but not bundled pending review of its CC BY-NC-SA 4.0 NonCommercial and ShareAlike conditions.
- **UNAVAILABLE / LICENCE REVIEW BLOCKED — FDI 11, 48 and 46:** exact-side Open Dentistry / UFSC candidates are disclosed with their CC BY-NC-SA terms and source links. No candidate GLB is included in the native build while intended distribution and derivative licensing remain unreviewed. The Japanese FDI46 database lead remains excluded because redistribution terms are not verified.

The source-clearance helper only presents descriptive metadata and URLs; it does not download candidate meshes or assert anatomical validation. Each station continues to use its separate editable synthetic training volume, which is not a calibrated operative simulation. Browser practical workflows and FSP/KP content are unchanged. Regression tests verify all three learner-facing status categories and ensure no unlicensed candidate files enter the standalone build.


## SR44 — structured anatomy-reference panel (educational only)

Every one of the six FDI practical stations now displays the same four explicitly distinguished categories, grounded in the current exported source case and its original practical task titles: (1) external morphology and model provenance, including real Dundee surface reference, FDI16 illustrative mirror or licensing-blocked absence; (2) internal structures, explicitly stating that no source-verified enamel/dentin/pulp/canal/periodontal/nerve segmentation is supplied by the external GLBs; (3) source-supported FDI identity and original exported practical task titles, as educational prompts rather than anatomical measurements; (4) the separate editable *synthetic* sampled teaching volume, with no calibrated operative or clinical-validity claim. The panel is read-only and does not change scoring, cuts, progress, browser workflows or FSP/KP. It does not download any candidate geometry. CC BY 4.0 Dundee attribution and NC-SA licensing restrictions remain visible, while internal GPU/native visual acceptance remains pending until an actual internal-GPU run.


## SR45 — Browser-matched structured FSP Arztbrief

The original browser `letterView()` presents four distinct handwritten-practice prompts: *Anamnese und Leitsymptom*, *Untersuchungsbefund*, *Verdachts-/Differenzialdiagnose*, and *Therapie / weiteres Vorgehen*. The native Godot FSP `letter` station now exposes matching four independent local text editors for each of the original six source cases. Unlike the browser's in-memory `letterDraft` fields (reset on changing station/case), native educational drafts are intentionally preserved under a source-pinned local per-case `letterSectionsByCase` record. Leaving the station or switching the case saves all four sections automatically; manual Save remains available. An existing old single-field letter note is shown in the first section for manual redistribution. The report-compatible `notes` record retains all four headed sections, and Reset clears them. The separate KP written-plan editor and all practical/browser workflows remain unchanged. No FSP handwriting assessment, validated German examination result, patient record, or GPU visual acceptance is implied by headless CI.


## SR46 — browser-matched four-field KP written treatment plan

The browser's `writtenView()` exposes four separate fields: Arbeitsdiagnose und erforderliche Zusatzbefunde, Behandlungsplan A — Zahnerhalt / bevorzugte Option, Behandlungsplan B — Alternative, and Aufklärung, Einwilligung, Nachsorge. The native KP `written` station now displays the same four editors for all six original FDI cases and saves them offline under `planSectionsByCase`. On case/station/view changes, current editors auto-save; an existing legacy single-field KP note is loaded into the diagnosis field for manual redistribution. Report-compatible `notes` include each labelled field and Reset clears them. Unlike the browser's in-memory draft reset, native intentionally persists case-specific drafts. Native FSP Arztbrief fields and German-language FSP/KP tasks are preserved. The two plans are educational hypotheticals, not treatment advice, examination certification, or clinical grading. Native visual/GPU acceptance remains pending actual manual internal GPU execution; source/headless results are not pixel or anatomy acceptance.


## SR47 — active recall before revealing source response choices

The browser's expert-mode multiple-choice exercises ask learners to formulate a free German response before clicking `Reveal response choices`. The native Godot `interview`, `handover`, `viva`, and `clinic` quiz stations previously exposed all three source options immediately. These four native station types now show an independent formative active-recall text editor and an explicit Reveal button. Until Reveal, response option buttons are not created; after Reveal, all original source options and feedback behavior remain unchanged. An earlier recorded response also permits review of choices. Notes are saved offline per **FDI case, station and question** in `quizRecall`, survive navigation and appear again when returning, and are cleared by intentional progress reset. The recall note is not compared with any model answer or used for grading, certifications, cutting or clinical validation. The browser source itself was not changed. Actual Godot headless integration checks all six FDI cases × four quiz stations for gated options, reveal, distinct notes, navigation and reset; real native GPU/visual acceptance remains pending the manual GPU session. The held watcher and Unity project are not used.


## Experimental rebuilt Practice Game (draft PR #146; NOT recovered original SR92)

This is a **new, opt-in educational game layer** built on the available native
Practice Sequence and SR93 review fix. It is not the inaccessible local-only
SR92 commit, and its headless/regression, desktop GPU, VR and clinical status
must be assessed separately.

**Isolated Windows launch:** from a clean *disposable checkout of this rebuild
branch*, with Node 22, Git and Godot **4.7.2** available, run
`native-godot/launch-local.ps1` from PowerShell, optionally passing
`-GodotExecutable C:\\path\\to\\Godot_v4.7.2-stable_win64.exe`.
The existing launcher refuses dirty source and output overwrite, makes a
fresh build, imports models before opening the interactive Godot project, and
prints the output directory. The rebuilt `build-app.mjs` assigns **each output
folder a distinct `user://` directory**; its name is recorded in
`practice-game-userdir.txt`. Do not point it at an existing owner profile.

**Play:** Enter **Environment**, select **Start Practice Game**, use
**Start clinic walkthrough** and press **E** near the language station and
operatory (10 points once per station). Inside Practical choose
**Start Practice Sequence**; the **six original FDI16 source-correct tasks**
earn 5 base points each plus bonuses of 0, 0, 1, 1, 2, 2. The room-game
maximum is **56** (20 stations + 30 base + 6 bonuses); other case answers in
the longer six-case sequence do not add room-game points. Exit Practice
Sequence and use **Return to clinic walk**, then **New Practice Game run** on
the Environment screen to reset only the game's in-memory ledger. All
ordinary Practical completion-locked saved records remain separate.

**Testing:** `practice-room-game-smoke.gd` tests the scoring model twice;
`practice-room-game-app-smoke.gd` drives actual native walk station-entry
handlers and source-answer buttons twice. Both are **headless CI tests**, not
pixel, desktop physical-input, GPU, Quest or clinical acceptance. The new
workflow deliberately does not upload screenshots, artifacts, or learner data.
Do not claim passing test evidence until an actual hosted runner has started
and completed the tests.


## Dental tool inventory · first imported batch

Open **Journey → Open dental instrument inventory · rotating 3D models** in the desktop app. The separate, read-only inventory viewer shows the 19 pre-existing chairside study models plus six *newly browsable* static assets from the previously downloaded [3DAssets.dev Dental Practice and Surgery pack](https://3dassets.dev/packs/dental-practice-and-surgery):

- Examination instrument tray (mirror, tapered probe and college tweezers on a single static tray)
- Upper/lower impression tray set
- Intraoral X-ray sensor tray
- Dental suction unit
- Articulator with model casts
- Ultrasonic cleaning bath

These are visual identification models, **not** calibrated or individually interactive instruments. The user can choose, rotate, read English/German labels and purposes, and open the original asset source. No chair interactions, lesson IDs, grades, clinical claims, stored progress or learner journal are changed.

The native builder copies each **existing source-pack GLB** from `visual-qa/asset-research/assets/dental-practice-cc0-v1` only after checking the 54-model pack index ID, CDN URL, CC0 license, expected file name, original SHA256 and length. It preserves the unmodified original in `assets/inventory/*.glb.source`, deterministically converts quantized mesh attributes for Godot 4.7.2, checks the converted SHA256, and writes `assets/inventory/source-manifest.json`. No unpinned network downloads occur at build time. Source attribution: 3DAssets.dev / 3dassets, CC0 1.0.

Run `node --test tests/dental_tool_inventory_contract.test.mjs` after checkout. **The actual Godot import, 3D visual quality, pointer interaction and full 20-bench regression still require owner Windows runtime acceptance**; a passing source check is not sufficient.

### Handheld instrument expansion (eight original teaching models)

The inventory now additionally contains **eight individual synthetic 3D hand-instrument models**: shepherd's-hook explorer No. 23, college cotton pliers, spoon excavator, ball burnisher, endodontic K-file, finger spreader, double-ended sickle scaler and composite placement spatula. They are separate selectable/rotatable entries with English and German names and tool-identification cues. The viewer therefore lists **33 models total: 19 earlier chairside study models + 6 CC0 source-pack models + 8 original schematic hand instruments**. No new chair drills, scenarios, scores, journal writes or clinical action simulation are added.

The geometry is **original primitive-based schematic teaching geometry** checked into `native-godot/assets/inventory/synthetic-*.tscn`, NOT clinically accurate physical meshes or downloaded instrument CAD; it has illustrative tips and flutes only. The included external links are *instrument-identification reading references*, not the source/licence of these original models. Their names and distinctions were checked against [ErgoDenta's dental instrument guide](https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204). The existing CC0 downloaded models keep their source hashes and provenance unchanged.

Source-level regression: `node --test tests/dental_tool_inventory_contract.test.mjs tests/handheld_tool_inventory_contract.test.mjs`. Runtime Godot 4.7.2 import/3D appearance, pointer manipulation and a repeat of all 20 bench replays remain mandatory acceptance steps; no clinical-instrument use or measurement is implied.



### Rotary, bur, isolation and extraction tools · ten additional schematic models

The 3D inventory now also includes **ten original primitive-based teaching models**. Rotary models: high-speed turbine, contra-angle, straight handpiece. Bur models: spherical round, pear-shaped 330-pattern, Endo-Z safety-tip concept. Isolation: rubber-dam retaining clamp and clamp placement forceps. Extraction: straight root elevator and generic extraction forceps.

The static inventory therefore offers **43 selectable model entries**: 19 existing bench study models, six pre-existing source-pinned CC0 equipment GLBs, eight earlier original handheld instruments, and these ten new original .tscn tool geometries. These ten are stored at native-godot/assets/inventory/synthetic-*.tscn and copied by build-app.mjs to the isolated output project. The original downloaded six models and their SHA-256 validation are unchanged.

These are **schematic identification aids**, not CAD models with accurate dimensions, rake angles, bur cutting flutes, actual 330 specifications, Endo-Z non-cutting end design, turbine rotational speed, jaw force, or safe rubber-dam / extraction technique. A named instrument is not a certification of its safety, tooth specificity, clinical suitability or correctness. No new training case, score, clinical outcome claim or profile persistence was added.

Identification reading references: [Basic Guide to Dental Instruments](https://resource.odmu.edu.ua/chair/download/28679/g0svA0dcTrmdbgxARzhhRA/dental%20instruments.pdf) (rotary and bur families), [A simple guide to using dental dam](https://pmc.ncbi.nlm.nih.gov/articles/PMC8161708/) (clamp versus placement forceps), and [ErgoDenta extraction tray instrument guide](https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204) (straight elevators versus extraction forceps). These are reference materials only, **not the source of copied meshes or textures**.

Run node --test tests/rotary_isolation_inventory_contract.test.mjs together with the preceding inventory tests on an actual checkout. After successful Node and Godot import, visually inspect every model and repeat the original twenty-bench regression and clean learner-journal check before merging. Source validation alone is not gameplay acceptance.


### Dental assistant, matrix and endodontic study tools · ten additional models

The 3D inventory now also contains ten separate **original schematic** study objects: three-way air-water syringe, high-volume suction tip (HVE), low-volume saliva ejector, capped cartridge aspirating syringe, universal Tofflemire matrix retainer, sectional matrix ring, wooden interdental wedge, U-shaped rubber-dam frame, electronic apex locator and dental bite block.

The **53 total static inventory entries** consist of 19 existing bench models + six provenance-pinned CC0 clinic assets + eight previous handheld models + ten prior rotary/isolation/extraction models + these ten new models. All new scenes are local primitive-based Godot .tscn files with distinct mesh shapes and English/German identification labels; the isolated native builder copies them into assets/inventory without networking.

**These are NOT clinical CAD or functioning equipment.** Air/water spray, suction airflow, local anaesthetic needle and delivery, matrix-band tension, interdental separation, dam-frame stretch, apex locator electrical measurement and bite-block fit are **not simulated or validated**. The syringe has a schematic protective cap, not an operative needle. No real treatment guidance, grading, chair gameplay or progress modification is introduced. External links in the catalog are instrument-identification reading references, not mesh or texture sources.

Identification references: [A-dec assistant instrumentation documentation](https://dental.a-dec.com/-/media/adecdotcom/resource-center/product-information/support-information/instructions-for-use/86050700.pdf), [Dental matrix bands and retainers](https://resource.odmu.edu.ua/chair/download/28681/mKlXwO8UaBWrCiQR7PFe1g/dental%20instruments.pdf), and [Dental assistant handbook](https://azdentalassistants.com/wp-content/uploads/study-materials/delmars-handbook-complete.pdf). The new local contract is tests/assistant_restorative_inventory_contract.test.mjs; execute it with previous inventory contracts on a native Node 22 checkout. Actual Godot 4.7.2 import/visual inspection and all 20 bench replays remain owner acceptance gates.


### Prosthodontic and orthodontic instrument inventory · ten additional models

The read-only rotating 3D inventory gains **ten further authored schematic models**.

- Prosthodontics: impression-material cartridge dispenser, articulating-paper holding forceps, sliding-weight crown remover, crown-and-bridge scissors.
- Orthodontics: bracket placement holder, cut-and-hold distal-end archwire cutter concept, micro ligature cutter, Weingart utility pliers, bracket-removing pliers, band pusher.

This brings the inventory to **63 selectable entries**: 19 pre-existing bench study tools, six verified CC0 source-pack equipment GLBs, eight early original hand tools, ten rotary/isolation/extraction models, ten assistant/restorative/endodontic models and ten new prosthodontic/orthodontic models.

Every newly added instrument is a locally authored primitive-based .tscn scene with an English and German identification label and a source link for instrument-family reading. The references are **not** the source of model meshes or textures. The builder copies them deterministically into the existing isolated Godot inventory; there are no new network downloads and no changes to bench lessons, scoring, saved learner progress or journal data.

**Limitations:** The objects are educational silhouettes and not physically or clinically calibrated manufacturer CAD. The articulating-paper strip and demonstration bracket are visual markers. The crown remover does not deliver impulses, impression gun does not dispense material, scissors/cutters have blunted schematic blades, and no bracket handling, wire manipulation or intraoral procedures are simulated.

Identification references: [GC Cartridge Dispenser II](https://www.gc.dental/america/products/operatory/equipment/gc-cartridge-dispenser-ii); [HuFriedy instrument catalog (orthodontic setup)](https://catalog.hu-friedy.com/product/files/basic-html/page474.html); [HuFriedy distal-end cutters](https://catalog.hu-friedy.com/orthodontic/files/basic-html/page17.html); [ligature cutters](https://catalog.hu-friedy.com/orthodontic/files/basic-html/page18.html); [Weingart pliers](https://catalog.hu-friedy.com/orthodontic/files/basic-html/page19.html); [band pushers](https://catalog.hu-friedy.com/orthodontic/files/basic-html/page28.html).

Execute the new source contracts with native Node 22 using node --test tests/prostho_ortho_tool_inventory_contract.test.mjs. **Do not merge** without Windows Godot 4.7.2 import, all 63 previews verified visually and 20-bench gameplay/journal regression. Source parsing is not runtime acceptance.


### Periodontal, oral surgery and endodontic models · ten original schematic additions

The inventory now includes a separate set of ten recognition models: Gracey curette, universal curette, periodontal hoe scaler, guarded scalpel handle, double-ended periosteal elevator (Molt concept), Adson-pattern tissue forceps, Mayo-Hegar needle holder, Mosquito-pattern hemostat, double-ended endodontic plugger and capped irrigation syringe.

**The inventory total becomes 73 static, selectable/rotatable model entries:** 19 existing bench study models, 6 source-verified downloaded CC0 equipment GLBs and 48 additional locally authored instrument study scenes. These ten scenes are included in the isolated native builder as `synthetic-*.tscn` files with English/German catalog labels; no chair/scoring/profile/journal changes or new downloads.

The Gracey and universal working ends are **visually differentiated schematically**, reflecting their distinct curvature/offset and cutting-edge concepts (see [Optident/American Eagle instrument guide](https://optident.co.uk/app/uploads/2016/06/2015-Instrument-Guide.pdf)). The actual tip angles, blade surfaces, sharpness, dimensions and numbered Gracey types are **not calibrated**. All surgical instruments have blunt demonstration geometry. Needle holder ratchet, hemostatic clamping, scalpel incision, plugger compaction and irrigation flow are **nonfunctional**. The syringe has a schematic protective cap and no exposed operating needle. These are not clinically safe product designs or technique guidance.

New source-only tests: `tests/perio_surgery_tool_inventory_contract.test.mjs`. Verify with native Node 22, then require Godot 4.7.2 import, model previews and all 20 pre-existing bench/journal replays before merging.


### Finishing, dental-dam and chairside restorative accessories · ten new original 3D study models

The inventory now includes ten more individually selectable and rotatable source-authored Godot scenes: gingival retraction cord packer (Retraktionsfadenstopfer), sectional-matrix ring forceps (Matrizenringzange), composite compule dispenser (Applikatorpistole), interproximal finishing strip (Finierstreifen), composite polishing disc on a mandrel (Polierscheibe), prophylaxis rubber polishing cup (Gummikelch), cement mixing spatula (Zementspatel), disposable microbrush applicator (Microbrush-Applikator), paper-point dispenser (Papierspitzen-Spender), and Ainsworth-pattern rubber-dam hole punch (Kofferdam-Lochzange).

**Inventory total: 83 model entries**: 19 unchanged chairside bench models, six CC0 source-pinned downloads, and 58 original schematic tool scenes added across the inventory branches. All ten new scenes are local .tscn files copied by native-godot/build-app.mjs into the isolated Godot project. The existing read-only selector and 20 original chair scenarios are unchanged; no new model download is needed.

References are for terminology/recognition only, not models: [Garrison sectional ring forceps](https://www.garrisondental.com/products/universal-other-ring-placement-forceps), [Dental Bauer dental mixing and compule dispensing accessories](https://www.dentalbauer.de/verbrauchsmaterial/praxis/fuellung-restauration/zubehoer-sonstiges), [COLTENE Ainsworth rubber dam punch](https://products.coltene.com/DE/BE/products/treatment-auxiliaries/dental-dam-accessories/dental-dam-accessories/dental-dam-punch), and [VDW endodontic paper points](https://www.vdw-dental.com/en/products/detail/reciproc-paper-points/).

**Clinical limitations:** all are simplified recognition props, NOT manufacturer CAD, guaranteed dimensions, sterilised devices or functional tools. Grinding surface, polishing abrasives, ring tension, compule extrusion, retraction pressure, liquid/adhesive application, paper-point sterility and hole-punch cutting geometry are not simulated. The finishing-strip grit markings and paper-point dispenser are study depictions. No patient use, grading, clinical decisions or learner records are changed.

New contract: tests/finishing_accessory_inventory_contract.test.mjs (3 source-level Node test cases). Execute this together with all earlier inventory contracts and verify the complete **83-item** inventory in Godot 4.7.2, including material/lighting and mouse-driven rotation, then replay all 20 benches and check journal invariance before merge. A source-level audit is not a Godot runtime or clinical-quality pass.


### Oral-surgery and implant instruments · ten new original 3D study models

This addition contributes ten further **individual, rotatable, schematic Godot study scenes**: Minnesota cheek retractor (Minnesota-Wangenhalter), Frazier surgical aspirator (Frazier-Absaugkanüle), Friedman bone rongeur (Friedman-Knochenzange), Miller-Colburn bone file (Knochenfeile), Lucas double-ended surgical bone curette (Lucas-Knochenkürette), implant torque ratchet (Implantat-Drehmomentratsche), manual hex driver (Implantat-Schraubendreher), protected soft-tissue punch (Schleimhautstanze), graft condenser (Knochenersatzmaterial-Stopfer), and bone graft carrier syringe (Knochenaufbauspritze).

The separate read-only inventory now comprises **93 entries**: 19 existing bench study tools, six earlier CC0 source-pinned clinic props and **68 newly authored schematic instruments**. All ten scenes live in native-godot/assets/inventory as synthetic-*.tscn source files; build-app.mjs copies them into the isolated project. No new downloads, gameplay cases, scoring behavior, model provenance or learner profile/journal interactions are added.

Published manufacturer terminology/visual descriptions support instrument-family naming, *not* a claim of reproducing their CAD: [HuFriedy surgical kit](https://catalog.hu-friedy.com/surgical/files/basic-html/page21.html), [Minnesota cheek retractors](https://catalog.hu-friedy.com/surgical/files/basic-html/page114.html), [Frazier aspirator](https://www.hufriedygroup.com/en/surgical-aspirators/frazier-aspirator), [Lucas surgical curettes](https://catalog.hu-friedy.com/product/files/basic-html/page211.html), [implant instruments](https://xgate.dental/surgical/) and [Dyna implant torque wrench](https://dynadental.com/en/instruments/prosthetic/).

**Model limitations:** These are original educational silhouettes, not dimensionally accurate CAD or functioning medical instruments. Ratchet torque, implant interface fit, bone cutting/debridement, tissue punching, soft-tissue retraction, aspirator flow, graft delivery and material compaction are not simulated or safe for patient procedures. Numeric-looking torque markers are decorative and **not calibrated values**. The tissue-punch model has a symbolic protective cover and no exposed cutting blade.

Three new Node source contracts are in tests/surgery_implant_inventory_contract.test.mjs. Before merge, execute all inventory and native bench tests from a checkout, visually examine all **93** previews in Godot 4.7.2 and replay twenty unchanged chair benches while confirming learner journal invariance. Static source checks alone do not establish runtime or clinical acceptance.


### Diagnostic and dental radiography instruments · ten original schematic model additions

The isolated, read-only 3D inventory now includes ten additional original models: wired intraoral CMOS radiography sensor (digitaler Intraoralsensor), thin phosphor storage plate (Speicherfolie / PSP), horizontal bitewing receptor holder (Bissflügel-Sensorhalter), aiming ring with positioning rod (Röntgen-Zielring und Positionierungsstab), endodontic receptor holder (Endo-Sensorhalter), intraoral camera wand (Intraoralkamera), tooth-shade-tab fan (Zahnfarbschlüssel), occlusal photography mirror (Okklusaler Fotospiegel), electric pulp sensibility tester (elektrischer Pulpatester), and fibre-optic dental transillumination wand (Transilluminationssonde).

With this branch stacked on PR #197, the inventory offers **103 intended individually selectable 3D models**: nineteen existing bench study models, six source-pinned CC0 equipment GLBs, and 78 self-authored local schematic models. Scenes are local synthetic-*.tscn files copied by native-godot/build-app.mjs into the independent Godot output. The existing twenty procedural benches, grading, clinical decision paths, learner progress and journal are not changed.

**Sources for instrument terminology, not mesh geometry:** [Dentsply Sirona Rinn X-ray receptor positioning catalog](https://www.dentsplysirona.com/content/dam/master/product-procedure-brand-categories/preventive/product-categories/x-ray/overarching-documents/PRE-NAM-doc-Rinn-product-catalog.pdf.coredownload.pdf), [intraoral CMOS/PSP device review](https://isdent.org/DOIx.php?id=10.5624%2Fisd.20240248), [KaVo intraoral camera/transillumination description](https://www.kavo.com/de-de/produkte/praxisausstattung-dentaleinheiten/patientenkommunikation/diagnocam-vision-full-hd-intraoralkamera), [VITA tooth shade guide](https://www.vitanorthamerica.com/en-US/VITA-classical-A1-D4-shade-guide-123.html), [dental photography mirror types](https://deutschedt.com/collections/dental-mirrors-for-intraoral-photography), and [Parkell pulp tester](https://parkell.eu/product/pulp-vitality-tester/).

**Important clinical limitations:** The model shapes are illustrative, not manufacturer CAD, calibrated tools or functioning diagnostic devices. The XCP-style ring, rod and biteblocks are not properly dimensioned or validated for beam alignment or radiation safety; no X-ray radiation, sensor acquisition, images or optical output are generated. Shade-guide tabs are nine decorative samples, not the calibrated 16-tab VITA system. The pulp tester supplies no stimulus, and the fibre-optic wand emits no light. Do not use any of these for clinical positioning, diagnosis or treatment decisions.

The new three-case source integrity contract is tests/diagnostic_imaging_inventory_contract.test.mjs. Execute all existing Node contracts and import/visually inspect all 103 model entries within Godot 4.7.2 before merging. The original twenty chair lessons and their learner journal/regression checks still need to be replayed natively. The GitHub Actions runner-start issue remains open.


### Dental laboratory, impression and removable-prosthodontic accessories · ten new 3D models

The read-only native 3D inventory now contains ten additional **original schematic** scenes: flexible alginate mixing bowl (Alginat-Anmischbecher), alginate spatula (Alginatspatel), heavy gypsum/plaster spatula (Gipsspatel), Fahnenstock wax knife (Fahnenstock-Wachsmesser), Le Cron wax carving instrument (Le-Cron-Wachsmodellierinstrument), Boley sliding caliper (Boley-Schieblehre), dual-head denture cleaning brush (Prothesenbürste), articulator mounting plate (Artikulator-Montageplatte), wax bite-registration rim on baseplate (Wachsbisswall), and bench wax heater pot (Wachswärmegerät).

This stacked expansion brings the **intended inventory to 113 selectable models**: 19 pre-existing bench study models, 6 provenance-pinned CC0 equipment GLBs, and 88 original simplified, source-authored instrument/accessory models. All ten new local .tscn scene files are copied into the independent Godot output by build-app.mjs. No new downloaded meshes, dependency URLs, chair procedure logic, scores, profile, or journal changes are introduced.

Instrument-category identification sources only, **not mesh or texture downloads**: [Dental laboratory tools and carvers](https://www.comdent.co.uk/product-category/dental-instruments/dental-lab-instruments/), [Laboratory wax knives, calipers and spatulas](https://www.klardent.se/en/hand-instruments/dental-laboratory/), [Alginate mixing bowls and spatulas](https://moltdms.com/product-category/laboratory/), [German Alginat/Gips Anmischbecher](https://altmanndental.de/shop/labor/modellherstellung/anmischbecher-anmischschalen/), and [laboratory materials and wax occlusion rims](https://pocketdentistry.com/47-laboratory-materials-and-procedures/).

**Limitations:** These locally assembled primitive meshes are recognizable study silhouettes, not dimensionally accurate clinical or laboratory CAD. The caliper scale is decorative and cannot measure. The alginate bowl has an illustrative front-facing cavity surface rather than a physical bowl volume. The wax bite rim is not anatomically calibrated or patient-derived. The wax heater has no functioning heating element. There are no working brush bristles, actual plaster/alginate mixing properties, wax-cutting edges or validated sterilisation and material handling functions. No clinical use or device safety is claimed.

The new source-contract suite is tests/laboratory_impression_inventory_contract.test.mjs (three Node tests); native Node execution, Godot 4.7.2 import/3D inspection of all 113 selectable models, and replay of all original 20 chair lessons with learner journal byte-equivalence remain mandatory acceptance gates before merge. GitHub Actions runner allocation is still blocked as tracked in issue #184.


### Advanced root-canal / endodontic inventory · ten added schematic 3D studies

This branch adds **ten separate source-authored Godot instrument study scenes**: Hedström H-file (Hedström-Feile), nickel–titanium rotary file (NiTi-Maschinenfeile), Gates-Glidden drill (Gates-Glidden-Bohrer), Peeso/Largo reamer (Peeso-Bohrer), endodontic file ruler (Endo-Messlehre), six-position file stand (Endo-Feilenständer), gutta-percha-point tray (Guttaperchaspitzen), handheld cordless endomotor (Endomotor), heated obturation pen (thermischer Obturationsstift) and gutta-percha backfill gun (Obturationspistole).

**Intended complete inventory = 123 selectable 3D models:** 19 original bench-study models + six source-pinned CC0 equipment models + 98 new original schematic instrument/accessory scenes. Each new local synthetic-*.tscn file is copied by the isolated Godot builder with a unique `advanced_endo.*` catalog ID, English/German names, identification guidance and a source reference for instrument family, not a downloaded mesh. All previous catalog groups, the 20 chair benches and learner scoring/journal/profile code remain unchanged.

Identification reference catalogues: [Trycare endodontic files and reamers](https://www.trycare.co.uk/dental/categories/endodontics/endodontic-files), [FKG endodontic instrument categories](https://www.pearsondental.com/catalog/product_bybrand_thumb.asp?mfgd=FKGDentaire), [Dentsply-compatible files, points and stands](https://www.qedendo.eu/search.php?searchFor=Dentsply+Sirona), and [endodontic motors and obturation devices](https://endotech.nl/). Model geometry is self-authored and only loosely informed by these category references.

**Not clinical CAD or devices:** The flutes, ISO-sized handles and tapered stems are illustrative. H-file and NiTi file geometry, cutting edges, taper, alloy behaviour, motor RPM/torque, fracture limits, length measurements, file stand sterility, gutta-percha composition and clinical cone sizing are **not validated**. Heated obturation devices cannot heat, melt, dispense, compact or seal materials; the file tips and heating tip are blunt/safety-covered. Display values, scale graduations and status lights are decorative only. No actual root canal procedure, diagnosis, patient use or training competency is simulated.

New contract tests: `tests/advanced_endodontic_inventory_contract.test.mjs` (three Node source tests). Run native Node 22 tests, inspect each of the full **123** models in Godot 4.7.2, validate all 20 previous chair simulations and learner-journal restart invariance before accepting or merging any stacked PR. CI runner allocation remains tracked in GitHub issue #184.


### Orthodontic wire bending, ligatures and removable aligner tools · ten 3D studies

The inventory now includes **ten original, schematic, separately rotatable models**: bird-beak wire-bending pliers (Vogelkopfzange), three-prong pliers (Dreizackzange), Adams flat-jaw pliers (Adams-Zange), Mathieu spring-handled ligature pliers (Mathieu-Ligaturzange), elastic separating pliers (Separierzange), Boone bracket-height gauge (Boone-Brackethöhenmesslehre), double-ended ligature director (Ligaturendrücker), Tweed loop-forming pliers (Tweed-Schlaufenbiegezange), orthodontic torquing turret (Torquierturret) and aligner/retainer removal hook (Aligner-Entfernungshilfe).

**Total intended source-defined inventory: 133 selectable 3D models**, comprising 19 original bench models, six source-pinned downloaded CC0 clinic-equipment models and 108 separately authored schematic tool scenes. All additions are local `synthetic-*.tscn` files with English/German catalog labels, recognition cues, and clinical disclaimers; `build-app.mjs` copies them to the existing read-only model browser without downloading third-party assets or altering the original twenty chair benches, assessment, profile or journal.

Instrument type sources are **terminology references only** (not sources of CAD or textures): [HuFriedy orthodontic catalog – wire-bending tools](https://www.healthcare-holding.ch/hubfs/04_Ortho%20Walker%20Files/0406_Hersteller%20Kataloge/Hufriedy_Catalog_GB_036_2307_V8_EN.pdf?hsLang=fr), [Dental Sky orthodontic tools](https://www.dentalsky.com/all-products/hand-instruments/orthodontic-instruments.html), [Mathieu and separating plier categories](https://revmedconnect.com/DE-JEX?page=42), and [Dentsply Sirona retainer retriever use description](https://www.dentsplysirona.com/services/asset/download?path=%2Fcontent%2Fdam%2Fmaster%2Fproduct-procedure-brand-categories%2Forthodontics%2Fproduct-categories%2Fpatient-care-and-records%2Fappliance-accessories%2Fretainer-retriever%2Fifu%2FORT-IFU+Retainer+Retriever+-+Multilingal+-+2025-10.pdf).

**Clinical and functional limitations:** All jaws, grooves, ring holders, hooks and gauges are illustrative nonfunctional geometry. The bracket-height gauge and torquing turret are **not calibrated** and must not be used to determine bracket placement, wire angulation or clinical torque. No wire manipulation, elastic tension, appliance seating, plier locking or validated aligner removal is simulated. No implant, endodontic or bench lesson state is modified.

Source contracts: `tests/ortho_alignment_inventory_contract.test.mjs` (three Node tests). Before accepting this or stacked ancestors, run native Node 22 tests, inspect all **133** inventory entries in Godot 4.7.2 for appearance and rotation, and replay the 20 original procedure benches while verifying journal invariant and restart behavior. GitHub Actions runner-start failure remains tracked by issue #184; static parsing alone is not runtime acceptance.


### Periodontal diagnosis and periodontal-surgery instruments · ten new original 3D recognition models

This batch expands the isolated, read-only model inventory with ten independently selectable source-authored Godot scenes: UNC-15 periodontal pocket probe (UNC-15-Parodontalsonde), WHO/CPITN ball-ended screening probe (WHO-Sonde / PSI-Sonde), Nabers curved furcation probe (Nabers-Furkationssonde), Goldman-Fox spring pocket marker (Taschenmarkierungspinzette), Kirkland gingivectomy knife (Kirkland-Gingivektomiemesser), Orban interdental knife (Orban-Interdentalmesser), curved Goldman-Fox periodontal scissors (Goldman-Fox-Zahnfleischschere), Hirschfeld double-ended periodontal file (Hirschfeld-Parodontalfeile), Ochsenbein periodontal bone chisel (Ochsenbein-Knochenmeißel), and polymer-tip implant-maintenance scaler (Implantat-Kunststoffscaler).

Intended complete inventory: **143 selectable model entries** = 19 existing chairside bench study models + 6 previous source-pinned CC0 equipment GLBs + 118 original schematic locally authored model scenes. All ten new `synthetic-*.tscn` scenes are copied locally by `native-godot/build-app.mjs` into the independent viewer. Their `perio_assessment.*` catalog IDs have German/English descriptions, recognition hints, and clinical limitations. No new downloads, models sourced from manufacturer CAD, learner journals, scores, chair/gameplay routes, or profiling changes are introduced.

**References used to distinguish tool types, not to reproduce manufacturer designs:** [periodontal probe markings and WHO/Nabers types](https://deutschedt.com/pages/periodontal-probe-markings-types-guide), [Bundeszahnärztekammer periodontal probes](https://www.bzaek.de/fileadmin/PDFs/za/AKZ/DDV10.pdf), [ASA Dental periodontal instrument catalog](https://asadental.fra1.cdn.digitaloceanspaces.com/media/documents/Asa_Dental_2025_Catalog_-_Chapter_8_-_Periodontal.pdf), [peri-implant instrumentation and plastic-curette performance limits](https://pmc.ncbi.nlm.nih.gov/articles/PMC11126374/).

**Study-only limitations:** Probe graduation marks, WHO black band, Nabers marks, tip curvature and ball-end silhouette are **not dimensionally or millimetre calibrated** and cannot measure clinical pockets or furcation involvement. Knife/chisel/periodontal-file heads and scissors are intentionally blunt and nonfunctional; no incisions, cutting, pressure, tissue interaction or sterilization is modelled. The plastic implant scaler does **not** demonstrate proven effectiveness against calculus and is not an endorsement over titanium/carbon-fibre tools. These meshes must not guide patient examination, diagnosis, material selection or any clinical instrument-use technique.

Three new Node source contracts are committed in `tests/periodontal_assessment_inventory_contract.test.mjs`. Run actual Node 22 and Godot 4.7.2 import/model-preview/rotation tests for the full **143-model** inventory and replay all twenty unchanged chair benches, verifying learner journals survive clean restarts unchanged, before accepting or merging the stacked PRs. GitHub Actions runner-allocation remains tracked in issue #184.
