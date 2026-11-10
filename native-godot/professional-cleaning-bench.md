# Professional Cleaning Bench — one additional manual-cadence lesson

This is an isolated, unmerged private playtest **stacked on PR #166's exact source head**. It introduces exactly one new lesson, `CLEANING`, and retains the earlier Composite Restoration, Fissure Sealant and Fluoride Varnish bench entries. Nothing in the extraction/gum work, shared learner profile, Unity, held watcher, or other draft refs is changed.

## Fictional case

An instructor requests a **final rubber-cup polishing pass with fine prophylaxis polishing paste**, after a separate scaling step has already been completed. Two **soft plaque/stain teaching markers** remain on an arch fixture. The original `cleaning` chair scenario identifies these as `Remove left deposit` and `Remove right deposit`; it is an abstract two-target object-interaction exercise, not the removal of calculus or a validated dental cleaning.

The new lesson compares `tool.polishing_cup` (synthetic Godot primitive-mesh study scene with a rubber cup silhouette) against the **original CC0, SHA256-pinned ultrasonic scaler**. It then compares `material.prophylaxis_paste` with a plausible but incorrect case-specific distractor `material.fluoride_varnish`. Ultrasound scaling and fluoride varnish have valid uses in other care contexts; neither is the prescribed **polishing cup + paste** pairing in this fictional case. The material swatch and synthetic cup are illustrative and not product calibrations.

Use **Journey → Open professional cleaning bench**. Rotate the models, choose the assigned tool/material, then launch the **existing** `cleaning` chair, verify both targets, and select **Record removal of both simulated soft-deposit markers**. Finish event `record_cleaning_polish_markers` never represents patient-level success or clinical competence. The case reference reproduces the chair's existing ADA MouthHealthy plaque topic: https://www.mouthhealthy.org/all-topics-a-z/plaque.

## Source and replay

- Stable lesson ID: `professional_cleaning_polishing_intro`; scenario ID: `cleaning`.
- Selection: 2/2; chair: 20/20 in its own scoring system. The shared replay checks incorrect and correct selected/expected tool IDs, incorrect and correct material IDs, at least one rejected chair target with distinct selected/expected IDs, both chair model actions, verification, case-specific finish, saved JSON, clean restart and unchanged learner journal existence/bytes.
- `cleaning-inspection-trial.gd` subclasses `composite-inspection-trial.gd` with `_run_lesson("cleaning")`. Previous composite/sealant/fluoride replays remain available.
- `tests/professional_cleaning_bench_contract.test.mjs` holds six new Node source-contract suites. Passing source checks is *not* evidence of successful runtime import, rendered model, actual 20/20 gameplay or journal invariance.

## Exact-head owner acceptance on Windows / Godot 4.7.2

Use a clean **disposable checkout** of this draft's reported exact 40-character commit SHA; verify `git rev-parse HEAD`. Build into a previously nonexistent output directory. No modifications or exports from existing learner profiles.

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create an unused trial directory beneath `%APPDATA%` named, for example, `KLCleaningBench-<GUID>`, and its `profile` child. Modify **only the generated disposable build** `project.godot` under `[application]`: set `config/use_custom_user_dir=true` and `config/custom_user_dir_name="KLCleaningBench-<GUID>/profile"`. Confirm `OS.get_user_data_dir()` resolves to `<trial>/profile` (or a child) before running; setting `APPDATA`/`LOCALAPPDATA` alone **does not** satisfy the existing profile isolation guard.

With `$Godot` pointing to Godot 4.7.2, `$Build` to the generated project, and `$Trial` to the correctly matched disposable folder, run:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'cleaning-godot.log') --script res://cleaning-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Cleaning bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

After a headless pass, use a **separate fresh trial folder/profile** for rendered evidence:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'cleaning-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'cleaning-godot.log') --script res://cleaning-inspection-trial.gd -- $Trial --video
```

Require `result.json`: `status=pass`, `mode=cleaning_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=professional_cleaning_polishing_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, and `finish_event=record_cleaning_polish_markers`. Inspect its timeline for wrong/correct decisions, rejected chair action, distinct selected/expected IDs, chair verification and finish event. Verify model appearance and actual AVI dimensions. Rerun `composite-inspection-trial.gd`, `sealant-inspection-trial.gd`, and `fluoride-inspection-trial.gd` in independent disposable profiles for regression coverage.

Do not merge pending exact-head Windows/Godot acceptance. No second new bench should be started until the user's next explicit `continue`.
