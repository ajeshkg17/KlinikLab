# KlinikLab complete-application migration — Godot-first

**Status: native application foundation implemented, whole application NOT migrated.** This is a separately runnable Godot 4.7.2 desktop project built from the full browser application's exact-Git educational source content. The *existing browser application* remains the fully featured functional reference. Do not confuse a clinic render, a Godot shell, or even a successful source parse with full feature parity.

## Build and open on Windows

From a clean KlinikLab checkout (Node 22+, Git and Godot 4.7.2 installed):

```powershell
$sha = (git rev-parse HEAD).Trim()
$run = Join-Path $env:LOCALAPPDATA ('KlinikLabNativeApp-' + [guid]::NewGuid().ToString('N'))
node native-godot/build-app.mjs "--source-dir=$PWD" "--expected-sha=$sha" "--output=$run"
& 'C:\PATH\TO\godot_v4.7.2-stable_win64.exe' --path $run --editor
```

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
