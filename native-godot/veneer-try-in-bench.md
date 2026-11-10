# Veneer Try-In Bench — one additional private-playtest lesson

This **unmerged source-only draft** is stacked on the exact head of PR #171: `9fb3d2010f20bafd05e4649f50cf4095231635dc`. It adds **one** `VENEER` lesson, preserving all eight earlier bench lessons and their replay paths. Earlier PR heads, extraction/gum branches, personal learner journals, Unity, watchers, paused schedules and protected refs are outside scope. Do not merge without exact-head runtime acceptance.

## Fictional case and scope

An instructor supplies a mock anterior-teaching-crown veneer shell and matching schematic fit reference for an explicitly model-only try-in. The learner compares a **synthetic 3D facial veneer silhouette** (original Godot sphere/box geometry with a visible incisal teaching marker; NOT a patient-specific veneer or accurate tooth surface) to an existing synthetic **examination mirror**. The first choice is labelled **Choose the study object**, not clinical instrument. The second is labelled **Choose the fit reference** and contrasts `material.veneer_fit_reference` with a periodontal chart `material.site_chart` for a different task; the internal `material_choice` event name is retained for compatibility only.

**Existing chair scenario:** `veneer` (fixture `anterior`), original actions **Seat facial shell** and **Check incisal landmark**, 20-point scoring unchanged. The public ADA topic is the already configured https://www.mouthhealthy.org/all-topics-a-z/veneers. The bench finishes with `record_veneer_mock_try_in` only after the abstract chair verifies both actions. The lesson does **not** simulate tooth preparation, adhesive bonding, cementation, occlusal contacts, measured marginal fit, shade selection, or patient treatment results. A mirror can be useful in a real clinical try-in; here it is simply not the mock shell the case asks the learner to seat.

**Play:** Journey → Open veneer try-in bench → rotate both study models → select mock veneer shell and assigned fit card → enter existing veneer chair → verify both model actions → record mock veneer seating and incisal check. This is a fictional study record, not a proficiency certificate.

## Exact-head Windows/Godot 4.7.2 owner acceptance

Use a clean, disposable Git checkout pinned to this draft's final 40-character source SHA (`git rev-parse HEAD`). Build into a new output directory that did not previously exist:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact-source build failed' }
```

Make a unique trial folder under `%APPDATA%`, e.g. `%APPDATA%/KLVeneerBench-<GUID>`, and a `profile` child. Modify **only the generated disposable build's** `project.godot`, under `[application]`, to set:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLVeneerBench-<GUID>/profile"
```

Confirm the **actual** value of `OS.get_user_data_dir()` falls within the matching `<trial>/profile` before replay. The effective path follows Godot's platform-specific user-data rules. Changing `APPDATA` or `LOCALAPPDATA` alone does not meet the existing strict profile isolation guard. Do not use any real learner profile or upload token.

Set `$Godot` to Godot 4.7.2, `$Build` to the generated disposable project and `$Trial` to its matching unused profile's parent. Run import and a headless replay:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'veneer-godot.log') --script res://veneer-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Veneer bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For AVI visual inspection, create a **separate fresh** trial and profile, configure the same isolation, and run:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'veneer-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'veneer-godot.log') --script res://veneer-inspection-trial.gd -- $Trial --video
```

Require `result.json`: `status=pass`, `mode=veneer_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=veneer_mock_try_in_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, `finish_event=record_veneer_mock_try_in`. Inspect the timeline for wrong/right study object and fit-card decisions (`selected_id` versus `expected_id`), at least one rejected chair target with distinct IDs, both seating/incisal actions, correct finish, clean restart, and unchanged journal existence/bytes.

Check model preview rendering, visibility of the incisal marker, new **study object** and **fit reference** labels, and AVI readability at 1280×720. Re-run prior eight `composite`, `sealant`, `fluoride`, `cleaning`, `root-planing`, `chart`, `bitewing`, and `oral-exam` replays independently under new disposable profiles to check regressions. The six Node source suites in `tests/veneer_try_in_bench_contract.test.mjs` are **source contracts** and cannot replace executed Godot runtime and journal validation.

**Stop after one new bench.** No merge without exact-head owner runtime/visual acceptance; do not start a second lesson until the user's next explicit `continue`.
