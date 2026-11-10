# Scaling and Root Planing Bench — one additional manual-cadence lesson

This private source-only playtest is **stacked on PR #167** at `c41b528494782db383f79886158ccf64034bca80`. It adds exactly one new `ROOT_PLANING` lesson to the shared Composite Restoration, Fissure Sealant, Fluoride Varnish and Professional Cleaning benches. It does not change extraction/gum work or any earlier draft branch, learner profile, watcher, schedule, Unity project or protected ref. **Do not merge** before exact-head Godot acceptance.

## Fictional teaching case

An instructor assigns **ultrasonic-powered root-surface instrumentation on a schematic teaching model**, with a clean water coolant/irrigation supply, to clear two predefined root-surface markers. This is not the entire clinical scaling-and-root-planing procedure; there is no calibrated depth, pressure, water flow, subgingival access, root smoothing, tissue response, or patient-care result.

Choose the existing SHA256-pinned CC0 `tool.ultrasonic_scaler` instead of the existing synthetic 3D `tool.polishing_cup`. Then choose the case consumable `material.clean_water_coolant` instead of `material.prophylaxis_paste`. The swatch representing water is illustrative; it does not simulate the coolant system. Polishing cup and paste are appropriate for a different polishing case but not for this explicitly assigned powered root-surface procedure. The professional operator must select the real procedure and instruments based on the patient's clinical condition, not this training exercise.

**Route:** Journey → Open scaling and root planing bench → rotate/compare the two study models → pick tool and consumable → existing `root_planing` chair (`Clear marked root surface`, `Clear second root surface`) → verify 20/20 chair outcome → `Record both simulated root-surface deposits cleared` (`record_root_surface_instrumentation`). The chair is unchanged. The case points to the chair's existing ADA MouthHealthy reference: https://www.mouthhealthy.org/all-topics-a-z/scaling-and-root-planing/.

## Reproducible exact-head Windows / Godot 4.7.2 acceptance

Use a clean disposable checkout at the reported exact 40-hex commit and verify `git rev-parse HEAD`. Build into a **previously nonexistent** destination:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create a fresh `%APPDATA%/KLRootPlaningBench-<GUID>/profile` trial profile, not a shared learner profile. Modify **only the generated disposable** `project.godot`, under `[application]`, to set:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLRootPlaningBench-<GUID>/profile"
```

Check `OS.get_user_data_dir()` points into the intended `<trial>/profile`. Merely changing `APPDATA` or `LOCALAPPDATA` does not reliably satisfy the existing strict profile isolation guard. Confirm the trial folder exists before launching Godot.

After setting `$Godot` to Godot 4.7.2, `$Build` to the disposable Godot project and `$Trial` to its matching new trial directory:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'root-planing.log') --script res://root-planing-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Root planing replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For a separately isolated rendered replay, create another fresh trial/profile and use:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'root-planing-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'root-planing.log') --script res://root-planing-inspection-trial.gd -- $Trial --video
```

Accept only an exact-source result with `status=pass`, `mode=root_planing_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=root_planing_ultrasonic_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true` and `finish_event=record_root_surface_instrumentation`. Inspect the full timeline: wrong/right tool `selected_id` and `expected_id`, wrong/right consumable IDs, at least one rejected chair action with distinct selected/expected target IDs, chair verification, finish and restart.

Run existing `composite-inspection-trial.gd`, `sealant-inspection-trial.gd`, `fluoride-inspection-trial.gd` and `cleaning-inspection-trial.gd` independently with clean isolated profiles to catch regressions. Verify actual rendered previews and AVI size manually. The Node source-contract suite `tests/root_planing_bench_contract.test.mjs` is not a substitute for a Godot runtime test.

**Stop:** No second additional lesson should be introduced without another explicit `continue`.
