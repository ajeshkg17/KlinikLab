# Fixed Bridge Try-In Bench — exactly one additional private-playtest lesson

**Scope and base.** Unmerged, source-only draft stacked on exact PR #174 HEAD `2f829ee399f6db46d72dca5b60acd6bbe3012634`. Adds only `BRIDGE`, retaining the prior eleven lessons (Composite, Sealant, Fluoride, Cleaning, Root Planing, Charting, Bitewing, Oral Exam, Veneer, Inlay and Crown). Earlier PR branches/heads, extraction/gum geometry, real learner journals, Unity, protected refs, paused watchers and scheduled tasks are not changed. **Do not merge without owner exact-head Windows/Godot 4.7.2 acceptance.**

## Fictional instructional case, not a clinical bridge try-in

An instructor provides two named support units and one missing-tooth location on a teaching fixture. The student inspects a newly authored **synthetic 3D three-unit fixed bridge framework**: two abutment-shaped supports, a central pontic, illustrative connectors, and a contrasting pontic learning marker. All shapes are Godot primitive meshes, **not** clinically fitted, measured, mechanically calibrated or suitable as a restoration. The study-object choice contrasts `tool.bridge_framework` (correct) with `tool.crown_shell` (a single crown, incorrect for this assigned fictional case). The first UI step is **Choose the study object**, not an instrument.

The matched **fit reference** choice contrasts `material.bridge_support_reference` (a schematic map of both supports and central pontic) against `material.crown_fit_reference` (single crown), maintaining `material_choice` only as the shared internal event name. These references are not dental materials or patient data. No support fit, pontic-to-tissue contact, abutment preparation, connector strength, occlusion, cementation, implant loading or clinical findings are measured.

**Journey → Open fixed bridge try-in bench** → rotate the two study objects → select the synthetic bridge and assigned reference → enter the **unchanged** `bridge` chair (`Seat across the supports`, `Check the pontic landmark`) → verify the two model actions → `Record mock bridge seating and pontic landmark`, emitting `record_bridge_mock_try_in`. The existing chair's ADA topic is https://www.mouthhealthy.org/all-topics-a-z/bridges; the citation is context, not a validation of the geometry or clinical skill.

## Exact-head Windows acceptance, without learner-journal access

Use a **clean disposable checkout** at this PR's exact 40-character SHA (`git rev-parse HEAD`) and a previously nonexistent output folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create a unique disposable trial folder, e.g. `%APPDATA%/KLBridgeBench-<GUID>`, with a fresh `profile` subfolder. In **only the generated disposable** project's `project.godot`, set under `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLBridgeBench-<GUID>/profile"
```

Check that the actual value of `OS.get_user_data_dir()` falls **inside that very `<trial>/profile`**. Windows custom Godot paths depend on project settings; an `APPDATA` or `LOCALAPPDATA` override alone does not satisfy the strict trial guard. Never use personal saved progress or an upload token.

Set `$Godot` to Godot 4.7.2, `$Build` to the generated disposable project and `$Trial` to the matching disposable trial directory. Import and replay:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'bridge-godot.log') --script res://bridge-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Bridge replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For visual review use a **second fresh disposable trial/profile** with matching configuration:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'bridge-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'bridge-godot.log') --script res://bridge-inspection-trial.gd -- $Trial --video
```

### Acceptance evidence

Require `result.json` with `status=pass`, `mode=bridge_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=bridge_mock_three_unit_try_in_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true` and `finish_event=record_bridge_mock_try_in`. Inspect the timeline for incorrect and then corrected bridge/single-crown choice and bridge/single-crown reference choice with distinct `selected_id` and `expected_id`; one rejected chair target with different selected/expected IDs; both chair actions; case-specific finish; clean reset; and journal byte identity.

Review both 3D previews, the two supports and pontic landmark visibility, the **study object**/**fit reference** wording and AVI readability at 1280×720. Independently run the existing eleven bench replays using separate unused profiles: `composite`, `sealant`, `fluoride`, `cleaning`, `root-planing`, `chart`, `bitewing`, `oral-exam`, `veneer`, `inlay`, `crown`. Six source-contract suites at `tests/fixed_bridge_try_in_bench_contract.test.mjs` cover wiring **only** and are not evidence of real Godot runtime, successful journal checks or clinical verification.

**Stop after this one new bench.** No merge pending exact-head owner Godot/visual acceptance. Do not start another lesson without the next explicit `continue`.
