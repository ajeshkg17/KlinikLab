# Removable Partial Denture Fitting Bench — exactly one additional private-playtest lesson

**Scope:** unmerged source-only draft stacked on exact head of PR #176: `6fa6eeb55ebec8b5f7401095639ad7b3fd5020a3`. Adds precisely one `PARTIAL_DENTURE` lesson and preserves the preceding thirteen lessons (Composite, Sealant, Fluoride, Cleaning, Root Planing, Charting, Bitewing, Oral Exam, Veneer, Inlay, Crown, Bridge and Complete Denture). No earlier PR heads, gum/extraction drafts, saved learner journals, Unity, protected branches, paused schedules or watchers are changed. Do not merge without exact-head owner Godot runtime and visual acceptance.

## Fictional training task, not denture clinical fitting

The assigned case uses a **removable partial denture** next to remaining natural teeth on the **existing fictional chair model**. The new original **synthetic 3D teaching framework** represents a short open U-shaped connector, three replacement-tooth markers and two clasp-position loops, one highlighted as a support teaching landmark. These are Godot primitive meshes, **not** a calibrated prosthesis, precision-attachment design, tooth model, insertion path, real support/retention system or patient scan.

The first step is labelled **study object**, comparing `tool.partial_denture_framework` against `tool.complete_denture_arch` for a fully edentulous fixture. The second is labelled **support reference**, comparing `material.partial_denture_support_reference` with `material.complete_denture_arch_reference` (a complete-arch study card). The shared `material_choice` event key is preserved only for compatibility with the generic two-choice scoring; the reference cards are **not** dental materials.

The **unchanged** `partial_denture` chair scenario has two original actions: **Seat beside the remaining teeth** and **Check the support landmark**, with its existing /20 model-only scoring. Its original source topic resolves to the ADA MouthHealthy partial-denture article https://www.mouthhealthy.org/all-topics-a-z/dentures-partial. That source is background context; it does not validate the fictitious geometry or any clinical decisions.

**Play:** Journey → Open removable partial denture fitting bench → inspect and rotate partial and complete denture study objects → select the partial framework and matched support reference → existing `partial_denture` chair → verify both assigned model actions → **Record simulated partial seating and support landmark** to emit `record_partial_denture_mock_fitting`. No clasp force, retention, tissue support, measured fit, pressure areas, occlusion or patient results are inferred.

## Exact-head Windows / Godot 4.7.2 acceptance

Use a **clean, disposable checkout** pinned to the exact 40-character PR HEAD (`git rev-parse HEAD`) and build to a previously nonexistent output folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact-head build failed' }
```

Create a fresh trial folder under `%APPDATA%`, e.g. `%APPDATA%/KLPartialDentureBench-<GUID>`, and its empty `profile` child. Configure **only the generated disposable project's** `project.godot` with:

```ini
[application]
config/use_custom_user_dir=true
config/custom_user_dir_name="KLPartialDentureBench-<GUID>/profile"
```

Confirm `OS.get_user_data_dir()` really resolves within the matching `<trial>/profile`. The Godot path is affected by Windows project settings; `APPDATA`/`LOCALAPPDATA` overrides alone **do not** satisfy the strict replay guard. Do not use a real learner's profile or GitHub upload token.

With PowerShell `$Godot` set to Godot 4.7.2, `$Build` to the generated test project and `$Trial` to its matching unused trial directory:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'partial-denture-godot.log') --script res://partial-denture-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Partial denture bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

Use a **separate unused** trial folder/profile for AVI visual inspection with the same isolation configuration:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'partial-denture-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'partial-denture-godot.log') --script res://partial-denture-inspection-trial.gd -- $Trial --video
```

### Acceptance evidence

Require `result.json` showing `status=pass`, `mode=partial_denture_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=partial_denture_mock_support_fitting_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, and `finish_event=record_partial_denture_mock_fitting`. Review the action timeline for a rejected and corrected study object, wrong and corrected support-reference selection, distinct `selected_id`/`expected_id` for the rejected chair action, both assigned chair targets, the specific finish event, and clean restart. Verify learner journal existence and bytes are identical.

Visually inspect the 3D previews, open U-shaped framework, replacement-tooth group and marked support loop, correct **study object**/**support reference** labels and AVI readability at 1280×720. Independently replay each of the **thirteen** earlier benches using a unique unused profile per case: `composite`, `sealant`, `fluoride`, `cleaning`, `root-planing`, `chart`, `bitewing`, `oral-exam`, `veneer`, `inlay`, `crown`, `bridge`, `full-denture`. Six new Node source-contract suites at `tests/partial_denture_fitting_bench_contract.test.mjs` check source wiring only; they do **not** verify actual Godot runtime, 20/20 chair success, AVI or journal byte identity.

**Stop after this one additional bench.** No merge until exact-head owner Godot and visual acceptance, and no second lesson until the user's next explicit `continue`.
