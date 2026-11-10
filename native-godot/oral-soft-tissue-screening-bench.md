# Oral Soft-Tissue Screening Bench — exactly one additional private-playtest lesson

This is an unmerged, stacked private-playtest draft with exact parent PR #170 HEAD `e1b84e9e28e32e30943bbeb52b79777424ae338e`. The branch adds exactly **one** `ORAL_EXAM` lesson and retains Composite Restoration, Fissure Sealant, Fluoride Varnish, Professional Cleaning, Root Planing, Periodontal Charting, and Bitewing Image Review. Do not alter existing draft PR heads, extraction/gum work, Unity, protected refs, scheduled watchers, or any learner's real journal.

## Fictional educational case only

On the existing `oral_exam` chair, the instructor supplies an abstract soft-mucosa fixture with two predefined target annotations: `Locate simulated finding` and `Record location`. In the new bench the learner identifies an instructor-marked model location and records it **for supervised review**; no patient tissue, oral cancer, suspicious-lesion classification, risk assessment, palpation, biopsy, diagnosis or real screening outcome is involved.

The learner compares a new original **schematic 3D mouth/examination mirror** (Godot primitive meshes, round disc and handle; not a clinical device model) with the earlier synthetic **periodontal probe**. For the second choice the shared lesson labels the step **Choose the observation record**, not material, and contrasts the case's **soft-tissue location/appearance record** (`material.soft_tissue_location_record`) with a periodontal tooth/site chart (`material.site_chart`) from a different task. The internal `material` key and `material_choice` timeline are retained for shared scoring compatibility; neither record is a dental material. Fictional record cards are not patient data.

The chair's pre-existing topic reference resolves to https://www.mouthhealthy.org/all-topics-a-z/oral-cancer. This is only a topic-level public reference and is not a substitute for a professional oral examination. After both model actions are verified the bench records `record_soft_tissue_observation`; the finish acknowledges a simulated observation and its location, **not** a clinical screening result.

**Play:** Journey → Open oral soft-tissue screening bench → rotate both study models → select mirror and observation record → existing `oral_exam` chair with two actions → verify → Record model finding and location for review. Earlier benches, 3D CC0 source pins, chair scoring and controls are unchanged.

## Exact-head disposable Windows/Godot 4.7.2 acceptance

Verify a clean disposable checkout matches this PR's reported exact 40-character commit SHA using `git rev-parse HEAD`. Build to a previously nonexistent folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact-source build failed' }
```

Create a unique disposable trial folder under `%APPDATA%` with `profile` child, for example `%APPDATA%/KLOralExamBench-<GUID>/profile`. Set **only the generated disposable project's** `project.godot` application configuration:

```ini
[application]
config/use_custom_user_dir=true
config/custom_user_dir_name="KLOralExamBench-<GUID>/profile"
```

**Before running, confirm `OS.get_user_data_dir()` points within the matching `<trial>/profile`.** The configured path is subject to Godot's Windows user-data conventions; `APPDATA` overrides alone do not satisfy the trial script's strict profile guard. Do not point it at a saved learner profile; unset any upload token.

With PowerShell `$Godot` pointing to Godot 4.7.2, `$Build` to the generated project and `$Trial` to its matching unused folder:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'oral-exam-godot.log') --script res://oral-exam-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Oral exam bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

If the headless replay succeeds, create a fresh separate trial/profile configured the same way and capture a visual replay:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'oral-exam-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'oral-exam-godot.log') --script res://oral-exam-inspection-trial.gd -- $Trial --video
```

Require `result.json`: `status=pass`, `mode=oral_exam_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=oral_soft_tissue_observation_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, `finish_event=record_soft_tissue_observation`. Independently inspect the timeline for wrong/correct mirror/probe and record/chart choices with selected/expected IDs, at least one rejected chair action with nonmatching selected/expected targets, two chair actions, unique finish event and clean restart. Check model rendering, non-diagnostic UI wording, readability at 1280×720 and actual AVI dimensions.

Then independently rerun the previous seven bench trials (`composite`, `sealant`, `fluoride`, `cleaning`, `root-planing`, `chart`, `bitewing`) using separate unused profiles. Six new Node source contracts are committed at `tests/oral_soft_tissue_screening_bench_contract.test.mjs`, but these checks do not substitute for Godot runtime and journal validation.

**Stop after this single new bench.** No merge until owner exact-head acceptance; no new bench without another explicit `continue`.
