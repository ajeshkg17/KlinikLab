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
- German FSP letter / written clinical-plan drafting, source-derived primary/alternative plans, instrument vocabulary selection.
- Local **user://** progress per case/station and answer and note recording; reset controls. Synthetic cases only. No network storage or patient backend.

## Explicit unimplemented functionality before full migration

| Source browser subsystem | Required parity gate | Current native state |
|---|---|---|
| `app.js` journeys and dialogue | Case-specific state machine, patient response progression and session history for all six cases | Quiz/navigation foundation only |
| `volumetric-lab.js` | Live bur-swept 3D volume subtraction, mesh reconstruction, undo/reset, metrics/cross sections | Immutable source before/cut render ONLY |
| `engine.js`, `dental-appearance.js`, `real-dental-scene.js` | FDI32 anatomical atlas, jaw/orientation, picking, material shading, geometry fidelity | FDI16 exact source plus schematic room |
| `dental-practice.js` | All case-specific operative decisions, dental tool sequences, scoring and simulation state | Tool labels only |
| `fsp-kp-training.js` | Case/phase German B2/C1 response rubric, explanation and evidence-free formative scoring | Source MCQs and manual drafts |
| `desktop-suite.js` | Synthetic X-ray with interpretation, local STL/OBJ inspection, bur response and provenance | Not ported |
| `clinical-pathway.js` | Care workflow, handover, documentation and safety checks | Text prompts only |
| `ai-ui.js`, `server/ai-core.mjs` | Opt-in secure local/server AI with data and credential isolation | Not ported; no API keys in native app |
| `xr-procedure.js`, `xr-guide.js` | Tracked Meta Quest controllers, ray selection, physical headset QA | Not ported or headset verified |
| Reports, progress, release evidence | Clinical-learning report export, source-aware state persistence, UI accessibility and native GPU user QA | Local draft/progress only; no grading/clinical acceptance |

These are actual functionality milestones, **not** visual milestones. Do not mark the entire interactive application migrated until all gates independently pass with deterministic tests and original owner-PC pixels and GPU attribution. Preserve the original browser app as the supported reference in the interim.

## Evidence acceptance

Source CI can build/check and run synthetic headless tests using Godot 4.7.2, but does not prove native Windows GPU rendering. A fresh exact-SHA owner-PC run requires visible native full-clinic app pixels with the full UI, case selection changes, at least two training station interactions, saved/reloaded progress, source geometry hash/triangles, distinct valid engine-PID 3D PDH samples and matching RTX5060 DXGI LUID. Never rerun job07/job08 or overwrite their original evidence, do not bring Godot to visible foreground during automated capture, and review exact published PNG pixels directly. Native app migration status must remain **IN PROGRESS** until all functional gates pass.
