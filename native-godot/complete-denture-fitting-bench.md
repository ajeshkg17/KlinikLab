# Complete Denture Fitting Bench — exactly one additional private-playtest lesson

This unmerged source-only draft is stacked on the exact head of PR #175: `5957761a509fc236f7558f50bdc6e11a3a88ec21`. It adds only one `FULL_DENTURE` lesson, retaining the preceding twelve (Composite, Sealant, Fluoride, Cleaning, Root Planing, Charting, Bitewing, Oral Examination, Veneer, Inlay, Crown and Bridge). No previous PR heads, extraction/gum geometry, personal learner journals, Unity, protected branches, held watchers or paused schedules are changed. No merge without owner exact-head Godot runtime and visual acceptance.

## Fictional teaching exercise

The instructor assigns a model of a **complete removable denture arch** and a matching **full-arch study reference** to a fictional patient-free fixture. The new original **synthetic 3D denture arch** uses Godot primitive meshes in a U-shaped gum-and-tooth arrangement with a blue posterior teaching marker. The comparison object is the previously added synthetic fixed three-unit bridge. The selection is labelled **study object**, not a clinical instrument. These simplified shapes are not clinical impressions, calibrated prostheses or predictions of tissue mechanics.

The second choice, labelled **arch reference**, contrasts the correct illustrated `material.complete_denture_arch_reference` against `material.bridge_support_reference` for the fixed bridge. The internal `material_choice` ID exists only for compatibility with shared bench scoring; the reference cards are not dental materials. The case is not evaluating retention, stability, sore spots, pressure areas, border extension, occlusion, speech, function or patient outcomes.

**Journey → Open complete denture fitting bench** → inspect and rotate the denture and bridge study objects → choose the correct full-arch object and arch reference → enter the unchanged `full_denture` chair (`Seat the complete arch`, `Check the posterior landmark`) → verify the two model actions → `Record simulated full-arch seating and posterior landmark`, generating `record_complete_denture_mock_fitting`. The original drill's ADA dentures resource is https://www.ada.org/resources/ada-library/oral-health-topics/dentures; the topic link is context, not clinical validation.

## Exact-head Windows / Godot 4.7.2 acceptance

Using a clean, disposable checkout at this draft's **exact 40-character head** (`git rev-parse HEAD`), build to a previously nonexistent directory:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create a unique disposable trial directory, for example `%APPDATA%/KLCompleteDentureBench-<GUID>`, with child `profile`. In **only the generated disposable** project's `project.godot`, configure under `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLCompleteDentureBench-<GUID>/profile"
```

Check that `OS.get_user_data_dir()` resolves **within the corresponding `<trial>/profile`** before running. Overriding Windows `APPDATA` or `LOCALAPPDATA` alone does not satisfy the existing strict trial guard. Do not run against any personal learner journal; remove any upload token.

With PowerShell `$Godot` set to Godot 4.7.2, `$Build` set to the generated disposable project and `$Trial` set to the matching fresh trial directory:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'denture-godot.log') --script res://full-denture-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Denture bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For AVI visual review, create a **second unused** trial folder and profile with matching disposable-project settings, then:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'complete-denture-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'denture-godot.log') --script res://full-denture-inspection-trial.gd -- $Trial --video
```

Required result JSON fields: `status=pass`, `mode=full_denture_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=complete_denture_mock_arch_fitting_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, and `finish_event=record_complete_denture_mock_fitting`. Inspect the timeline for one wrong/right object choice, one wrong/right arch-reference choice, a rejected chair target with different `selected_id`/`expected_id`, the two chair actions, custom finish, and clean reset.

Inspect the two preview rotations, the U-shaped study-arch appearance, posterior marker visibility, **study object** and **arch reference** headings, and readability at 1280×720. Re-run the preceding twelve scripts on their own unused profiles (`composite`, `sealant`, `fluoride`, `cleaning`, `root-planing`, `chart`, `bitewing`, `oral-exam`, `veneer`, `inlay`, `crown`, `bridge`). Six new Node source-contract suites in `tests/complete_denture_fitting_bench_contract.test.mjs` verify source wiring only; they do not establish a Godot runtime result, actual 20/20 chair outcome or byte-identical journal at runtime.

**Stop after precisely one additional bench.** Do not merge before exact-head owner acceptance; do not begin another lesson without the next explicit `continue`.
