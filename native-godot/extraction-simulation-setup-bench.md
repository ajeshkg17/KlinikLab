# Extraction Simulation Setup Bench — twentieth fictional model-only lesson

**Scope:** one additional source-only, draft/unmerged bench stacked on PR #182's exact head `9e39e838e190889d6ed1a91a53ff156320d9162d`. It extends the existing catalog from nineteen to twenty lessons, one per pre-existing procedure drill. It does **not** change the source or head of any earlier PR, extraction movement/scoring code, tooth meshes, gum realism, learner profiles, Unity, protected refs, watchers, or paused schedules. **Do not merge without exact-head owner Godot runtime and visual acceptance.**

## Fictional assigned model setup — not clinical extraction training

The instructor supplies an abstract model with **one preassigned target tooth** and two separately labelled **adjacent model teeth**. The student compares an original **synthetic 3D blunt training-forceps object** (two oversized handles, nonfunctional rounded jaws, decorative pivot and blue teaching flag) against the prior synthetic periodontal probe. Neither model is a real surgical device or accurately represents gripping, leverage, torque, tissue response, tooth anatomy, sterile handling, anaesthesia, or a safe extraction method.

First choice: **study instrument**, correct `tool.training_forceps_study`, distractor `tool.periodontal_probe`. Second choice: **site checklist**, correct `material.assigned_extraction_tooth_and_adjacent_record`, distractor `material.site_chart` (periodontal chart). The cards are fictional ID worksheets, *not* clinical tooth records, site verification, informed consent, radiographs, dental materials or patient documentation. The generic internal `material_choice` event key remains only to reuse existing shared bench scoring.

The unchanged `extraction` chair already contains **Release the assigned tooth** and **Check both adjacent teeth** as two ordered *virtual* model actions with existing /20 scoring. The bench reuses these controls and the chair's ADA MouthHealthy topic `https://www.mouthhealthy.org/all-topics-a-z/extractions` as background context. It makes no claim of real extraction safety, ability, technique, anatomy identification, clinical outcome or risk prediction. The generic chair's existing model extraction is not modified here.

**Play:** Journey → Open extraction simulation setup bench → inspect/rotate both synthetic study objects → reject/correct the assigned instrument → reject/correct the fictional target-and-two-neighbour checklist → enter the original `extraction` chair → perform its two preassigned *model* actions → **Record fictional assigned-tooth and adjacent-model checks**, emitting `record_extraction_mock_setup_review`. No change is made to tooth geometry, extraction/gum-related PRs, effects or real learner journal data.

## Exact-head Windows / Godot 4.7.2 owner acceptance

Check out the draft's **exact final 40-character SHA** (`git rev-parse HEAD`) in a clean, disposable checkout. Build into a previously unused output folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create a unique disposable trial under `%APPDATA%` (e.g. `%APPDATA%/KLExtractionSetupBench-<GUID>`) with an empty `profile` child. Change **only** the generated disposable project's `project.godot`, within `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLExtractionSetupBench-<GUID>/profile"
```

Check that `OS.get_user_data_dir()` actually resolves inside the matching exact `<trial>/profile`. Windows Godot project settings determine this path; simply overriding `APPDATA`/`LOCALAPPDATA` is insufficient. Never use personal learner data, a saved profile or `KLINIKLAB_GITHUB_TOKEN`.

With PowerShell `$Godot` pointing to Godot 4.7.2, `$Build` to the disposable project and `$Trial` to the corresponding unique empty trial folder:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'extraction-bench-godot.log') --script res://extraction-bench-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Extraction setup bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

Use a **different new trial and isolated profile** to capture AVI visual evidence:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'extraction-setup-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'extraction-bench-godot.log') --script res://extraction-bench-inspection-trial.gd -- $Trial --video
```

### Required runtime and visual evidence

Require `result.json` showing `status=pass`, `mode=extraction_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=extraction_mock_tool_site_check_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, and `finish_event=record_extraction_mock_setup_review`. Audit the event timeline for incorrect/correct **study instrument**, incorrect/correct **site checklist**, a deliberately rejected chair target with distinct `selected_id` and `expected_id`, both accepted chair actions, the specific finish event, and clean restart. Check the journal's actual existence and byte identity against the pretrial snapshot.

Visually inspect both rotatable 3D objects, rounded/blunt model forceps, blue teaching flag, **study instrument**/**site checklist** headings, and AVI readability/dimensions at 1280×720. Independently replay all earlier nineteen benches with a **fresh disposable profile per case**: `composite`, `sealant`, `fluoride`, `cleaning`, `root_planing`, `chart`, `bitewing`, `oral_exam`, `veneer`, `inlay`, `crown`, `bridge`, `full_denture`, `partial_denture`, `implant`, `endo`, `retreat`, `aligner`, `mouthguard`. Six Node source tests in `tests/extraction_setup_bench_contract.test.mjs` check source wiring only; they do **not** establish executed Godot playback, a 20/20 chair outcome, learner-journal invariance, valid surgical method or actual visual quality.

**Stop after exactly this additional bench.** Keep draft unmerged until exact-head owner Windows/Godot and visual acceptance. All twenty existing chair scenarios now have a corresponding bench definition; no next bench is planned without explicit new scope.
