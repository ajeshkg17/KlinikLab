# Periodontal Charting Bench — one additional private-playtest lesson

This is an **unmerged** source-only draft stacked on PR #168 at exact base `21a82c639d2a37b75f498746320f4058655f7b64`. It creates exactly **one** additional lesson, `CHART`, retaining the prior Composite Restoration, Fissure Sealant, Fluoride Varnish, Professional Cleaning, and Scaling and Root Planing lessons. Do not alter earlier PR heads, extraction/gum work, learner profiles, Unity, paused schedules, watchers or protected refs.

## Fictional educational case

An instructor assigns two **model site identifiers** on a teaching arch for simulated location recording. The bench asks the learner to inspect and rotate a clearly labelled **synthetic 3D periodontal probe** against the existing, original SHA256-pinned CC0 3D ultrasonic scaler. The probe consists only of teaching geometry and a blunt tip with illustrative, **uncalibrated** marker bands. It does **not** calculate a probing depth, probing force, tissue status, periodontal diagnosis or any actual patient measurement.

The second selection is explicitly shown as **Choose the site record**, not Choose the material: select `material.site_chart` (tooth-and-site chart) rather than `material.shade_guide` (shade selection for a different task). The IDs retain the shared `material` key for backward-compatible event logging (`material_choice`), but this is a fictional record selection, not a claim that paper records are dental materials. Both swatches are illustrations rather than real patient data.

**Journey → Open periodontal charting bench** → rotate the models → choose probe and site chart → launch the **unchanged** `chart` chair (`Record left site`; `Record right site`) → verify model actions → **Confirm both simulated periodontal site records**, with case-specific finish event `record_periodontal_sites`. An existing chair reference resolves to https://www.mouthhealthy.org/all-topics-a-z/periodontics. No clinical findings or six-site probing measurements are generated.

## Evidence and acceptance

Source-contract tests are in `tests/periodontal_charting_bench_contract.test.mjs`, containing six Node suites for prior-lesson preservation, scenario, uncalibrated study geometry, the record-UI label, routing and guarded replay. Source string checks are not evidence of a successful Godot build or actual interactive gameplay.

For exact-head owner acceptance on Windows, start with a **clean disposable checkout** of the draft HEAD, verify `git rev-parse HEAD`, and build into a new, previously nonexistent output folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact-source build failed' }
```

Choose a unique disposable trial folder with a `profile` child, e.g. `%APPDATA%/KLChartBench-<GUID>/profile`. In only the generated **disposable** project's `project.godot`, configure under `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLChartBench-<GUID>/profile"
```

**Verify actual `OS.get_user_data_dir()` is located within the chosen `<trial>/profile` before running the replay.** The correct directory depends on Godot's Windows user-data convention; a changed `APPDATA`/`LOCALAPPDATA` variable alone does not satisfy the replay guard. Do not point it at an ordinary personal progress profile.

Set `$Godot` to Godot 4.7.2, `$Build` to the generated project, and `$Trial` to the exact matching fresh folder:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'chart-godot.log') --script res://chart-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Charting replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

If the headless result passes, create an **independent clean trial/profile** and record an AVI to inspect 3D scene rendering and UI label:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'chart-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'chart-godot.log') --script res://chart-inspection-trial.gd -- $Trial --video
```

Required `result.json`: `status=pass`, `mode=chart_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=periodontal_charting_site_record_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, `finish_event=record_periodontal_sites`. Inspect the timeline for rejected and corrected tool/record selections with distinct selected/expected IDs, one rejected chair target, both chair site actions, and correct finish. Inspect AVI clarity at 1280 × 720, especially schematic probe, record label, and site chart.

Independently rerun `composite-inspection-trial.gd`, `sealant-inspection-trial.gd`, `fluoride-inspection-trial.gd`, `cleaning-inspection-trial.gd`, and `root-planing-inspection-trial.gd` under their own unused profiles for regression coverage. Actual 20/20 scores, journal invariance and AVI cannot be claimed until the exact-head replay is executed.

**Stop after this one new bench.** No merge or next bench without further explicit user instruction.
