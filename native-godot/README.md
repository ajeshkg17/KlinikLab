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

The exact-source builder refuses reusing an existing output folder. It copies Godot scene/scripts, generates original FDI16 before and after-cut OBJ data from the production **volumetric-lab.js** mesher, independently exports the six synthetic production cases and seven stations, and loads original source FSP dialogue, handover, viva, clinic questions and instrument catalog. Two independent exporter digests must match. No other FDI tooth has original drillable model geometry.

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
| `volumetric-lab.js` | Live bur-swept 3D volume subtraction, mesh reconstruction, undo/reset, metrics/cross sections | Immutable source before/cut render ONLY |
| `engine.js`, `dental-appearance.js`, `real-dental-scene.js` | FDI32 anatomical atlas, jaw/orientation, picking, material shading, geometry fidelity | FDI16 exact source plus schematic room |
| `dental-practice.js` / `app.js getPractical` | All operative decisions, instrument sequences, dental tool states and simulated cutting | Original case-specific tooth/tool/choice decisions interactive; drill simulation not yet ported |
| `fsp-kp-training.js` | Case/phase German B2/C1 response rubric, explanation and evidence-free formative scoring | Source MCQs and manual drafts |
| `desktop-suite.js` | Synthetic X-ray with interpretation, local STL/OBJ inspection, bur response and provenance | Not ported |
| `clinical-pathway.js` | Care workflow, handover, documentation and safety checks | Text prompts only |
| `ai-ui.js`, `server/ai-core.mjs` | Opt-in secure local/server AI with data and credential isolation | Not ported; no API keys in native app |
| `xr-procedure.js`, `xr-guide.js` | Tracked Meta Quest controllers, ray selection, physical headset QA | Not ported or headset verified |
| Reports, progress, release evidence | Clinical-learning report export, source-aware state persistence, UI accessibility and native GPU user QA | Local draft/progress only; no grading/clinical acceptance |

These are actual functionality milestones, **not** visual milestones. Do not mark the entire interactive application migrated until all gates independently pass with deterministic tests and original owner-PC pixels and GPU attribution. Preserve the original browser app as the supported reference in the interim.

## Evidence acceptance

Source CI can build/check and run synthetic headless tests using Godot 4.7.2, but does not prove native Windows GPU rendering. A fresh exact-SHA owner-PC run requires visible native full-clinic app pixels with the full UI, case selection changes, at least two training station interactions, saved/reloaded progress, source geometry hash/triangles, distinct valid engine-PID 3D PDH samples and matching RTX5060 DXGI LUID. Never rerun job07/job08 or overwrite their original evidence, do not bring Godot to visible foreground during automated capture, and review exact published PNG pixels directly. Native app migration status must remain **IN PROGRESS** until all functional gates pass.

## SR3 — FDI16 source-pinned native volumetric practice (in progress)

The build now exports a four-channel float32 grid sampled **directly from production `volumetric-lab.js` ToothSolid** at the exact Git source SHA (outer, dentin, pulp and caries). The native Godot `volume-cut.gd` verifies the grid's SHA-256 and implements true 3D signed-distance union-of-bur-spheres subtraction, marching-tetrahedra mesh reconstruction, separate native tissue materials, swept adjacent strokes, undo, reset and local JSON stroke replay. In case FDI16's practical station, use the X/Y/Z and radius sliders and Apply; the left mesh remains the immutable before model, the right model updates.

The native sampled grid is a **new computational mesh**, not the immutable original OBJ or a medical scan. Rendering details and cervical tissue boundaries can differ from the source JS mesher (native trilinear material classification). Approximate removed-sample percentage is not a clinical cut-depth, volume in mm³, pulp proximity score, or competency grade. The 32-stroke cap bounds runtime cost. No other case has editable native geometry. Hash mismatch blocks the editor rather than silently substituting a model.

Headless volume smoke: `godot --headless --path <built-project> --script res://volume-cut-smoke.gd`. A successful smoke verifies source grid loading, 3D changed mesh, undo/replay/reset and invalid parameter rejection; it is **not** a Windows RTX or clinical acceptance.

## SR4 — Original fictional patient replies and local formative reports

The six original source cases each provide the fictional patient's name, age and seven reply messages exported from `app.js`. A correct guided interview response reveals the corresponding source reply. This is NOT a free-form patient simulation or certified FSP assessment.

The Progress panel now supports **Export local learning report (.txt)** to a user-selected local file. It includes exact source SHA, source case/station identifiers, studied status, formative answer counts, saved drafts and optional FDI16 voxel sample statistics (never mm³). The export never uploads data, but users should not enter real patient details. Reports do not constitute clinical documentation or official examination results.
