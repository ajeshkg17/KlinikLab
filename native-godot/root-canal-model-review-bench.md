# Root Canal Model Review Bench — one additional private-playtest lesson

**Scope:** This unmerged source-only draft is stacked on exact PR #178 HEAD `9232afbf7a51b871be07dcd02760c6da9bee17f1`. It adds exactly **one** `ENDO` bench, preserving the preceding fifteen stable lessons and their original chair scenarios. Earlier PR heads, extraction/gum geometry, protected refs, Unity, real learner journals, held watchers and paused schedules are untouched. **Do not merge without exact-head runtime and visual acceptance.**

## Fictional case, limited to schematic marking

A tutor gives a fictional, preassigned model diagram containing **one chamber marker and one assigned canal path**. The student compares a new **synthetic 3D canal-diagram tracing stylus**, with an oversized rounded blue pointer, against the existing synthetic **image pointer** from the bitewing case. Neither is an endodontic file, physical instrument, sensor or intraoral device. The new stylus is original primitive-mesh Godot geometry, not a clinical model.

The first step is labelled **study pointer**. Its correct choice is `tool.canal_tracing_stylus` (distractor `tool.image_pointer`). The second step is labelled **canal reference**. Its correct choice is `material.assigned_canal_diagram` (distractor `material.assigned_bitewing_image`). Both cards are fictional annotations, not dental materials or radiographs; internal `material_choice` is retained only for compatibility with the shared scoring log.

**Existing unmodified chair**: scenario `endo`, actions **Trace the chamber** and **Trace the assigned canal**, original 20-point model-only scoring. The chair's existing source comes from the original AAE drill at https://www.aae.org/patients/root-canal-treatment/. This is contextual background, not a validation of the synthetic model. The bench finish `record_endo_mock_canal_map_review` is recorded only after the unchanged chair has accepted both diagram actions.

**Play:** Journey → Open root canal model review bench → inspect/rotate both schematic 3D pointers → select the case-specific pointer and canal reference → enter the original `endo` chair → mark both assigned model targets → **Record fictional chamber and canal map tracing**. This simulation does **not** teach root canal access, anatomy discovery, working length, file selection, preparation, irrigation, medicaments, obturation, treatment decisions, diagnosis or real clinical outcomes.

## Owner's exact-head Windows / Godot 4.7.2 acceptance

1. Check out this draft at its exact 40-character final SHA (`git rev-parse HEAD`) in a **clean, disposable** checkout. Build into a previously nonexistent output folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

2. Create a fresh disposable trial folder, e.g. `%APPDATA%/KLCanalMapBench-<GUID>`, with an empty `profile` subdirectory. In **only the generated disposable project's** `project.godot`, configure `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLCanalMapBench-<GUID>/profile"
```

Check that the actual `OS.get_user_data_dir()` falls within the exact matching `<trial>/profile`. Changing `APPDATA`/`LOCALAPPDATA` alone does not satisfy the shared strict profile guard. Never target real learner data, and do not set `KLINIKLAB_GITHUB_TOKEN`.

3. With PowerShell `$Godot` pointing to Godot 4.7.2, `$Build` to the generated disposable project, and `$Trial` to the corresponding fresh trial directory, import and replay:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'endo-godot.log') --script res://endo-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Canal diagram replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

4. For a visual AVI, use a **separate new** trial and profile with matching generated-project isolation settings:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'endo-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'endo-godot.log') --script res://endo-inspection-trial.gd -- $Trial --video
```

### Acceptance checklist

Require a result with `status=pass`, `mode=endo_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=endo_mock_chamber_canal_map_review_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true` and `finish_event=record_endo_mock_canal_map_review`. Check the event timeline for wrong/correct study-pointer and canal-map selections with distinct `selected_id`/`expected_id`, at least one rejected chair target, both chamber/canal actions, exact finish, and clean reset. Check journal existence and byte identity rather than assuming that the source guard passed.

Visually inspect both 3D previews, the oversized blue non-inserting study marker, the **study pointer**/**canal reference** headings and AVI readability at 1280×720. Run every earlier fifteen bench replay independently with a different unused profile (`composite`, `sealant`, `fluoride`, `cleaning`, `root_planing`, `chart`, `bitewing`, `oral_exam`, `veneer`, `inlay`, `crown`, `bridge`, `full_denture`, `partial_denture`, `implant`). The six new Node source tests in `tests/root_canal_model_review_bench_contract.test.mjs` are source wiring checks **only**, not proof of actual Godot chair play or learner-journal invariance.

**Stop after exactly one new bench.** No merge pending owner exact-head Godot acceptance; do not start a second new bench without another explicit `continue`.
