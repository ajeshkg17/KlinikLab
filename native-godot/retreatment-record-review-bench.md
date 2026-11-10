# Endodontic Retreatment Record Comparison Bench — one additional private-playtest lesson

**Scope:** Unmerged source-only draft, stacked on exact head of PR #179: `c0ecc0961b648c199323cc9b2b03603a74361017`. Adds exactly one `RETREAT` lesson, preserving all preceding sixteen stable lessons, their Journey/replay routes, existing chair code and original CC0 pins. No earlier PR heads, tooth/extraction/gum realism tasks, real learner journals, Unity, protected refs, paused schedules or held watchers are modified. **Do not merge before exact-head Godot acceptance.**

## Fictional two-panel record exercise

An instructor supplies a completely synthetic comparison worksheet with one PREMARKED PRIOR MODEL LANDMARK and one PREMARKED CURRENT-PANEL DISCREPANCY. The learner compares the new **synthetic 3D record-comparison pointer**—a large handle with blue prior and orange current panel markers—with the previous synthetic single-canal tracing stylus. Both are original Godot primitive teaching models, not clinical instruments, file systems, X-ray readers or diagnostic devices.

The first choice is labelled **study pointer**: correct `tool.record_comparison_pointer`, wrong `tool.canal_tracing_stylus`. The second choice is labelled **record reference**: correct `material.assigned_prior_current_record`, wrong `material.assigned_canal_diagram`. The two cards are fictional diagrams, **not** dental materials, clinical radiographs or patient documents; internal `material_choice` is preserved only for compatibility with generic two-choice scoring.

The pre-existing unmodified `retreat` chair has two ordered model annotations: **Mark prior model reference** and **Flag current discrepancy**. Its original contextual source is https://www.aae.org/patients/root-canal-treatment/endodontic-treatment-options/endodontic-retreatment/, matching the existing source used by the original drill. The source does not validate this fictional geometry or imply a clinical diagnosis.

**Play:** Journey → Open retreatment record comparison bench → rotate both synthetic pointers → choose the assigned two-panel pointer and reference card → enter the unchanged `retreat` chair → mark its two preassigned targets → **Record fictional prior landmark and current discrepancy**, emitting `record_retreat_mock_record_comparison`. The task does **not** assess endodontic failure, healing, infection, radiographic interpretation, working length, anatomy, instrumentation, retreatment indications or real treatment decisions.

## Exact-head Windows / Godot 4.7.2 owner acceptance

Check out this draft's **exact final 40-character SHA** in a clean disposable checkout. Verify `git rev-parse HEAD`, then build to a previously nonexistent destination:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create a new trial directory such as `%APPDATA%/KLRetreatRecordBench-<GUID>` with an empty `profile` subdirectory. In **only the generated disposable project's** `project.godot`, configure under `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLRetreatRecordBench-<GUID>/profile"
```

Verify the actual `OS.get_user_data_dir()` resolves inside this exact `<trial>/profile` before replay. Windows Godot user-data settings, not simply overriding `APPDATA` or `LOCALAPPDATA`, determine the guarded path. Do not use an existing learner profile, journal, or an environment upload token (`KLINIKLAB_GITHUB_TOKEN`).

With `$Godot` referring to Godot 4.7.2, `$Build` to the generated disposable Godot project and `$Trial` to the matching fresh trial folder:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'retreat-godot.log') --script res://retreat-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Retreatment record bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For a visual AVI, use a **different fresh** trial and profile with matching disposable project settings:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'retreatment-record-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'retreat-godot.log') --script res://retreat-inspection-trial.gd -- $Trial --video
```

### Acceptance evidence

Require `result.json` to show `status=pass`, `mode=retreat_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=retreat_mock_prior_current_record_review_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true` and `finish_event=record_retreat_mock_record_comparison`. Inspect the timeline for an incorrect and corrected pointer choice, an incorrect and corrected record card choice, and one rejected chair target with differing `selected_id`/`expected_id`; then both model actions, correct finish and clean reset. Check the journal's existence and bytes are identical, not just the presence of the guard in source.

Visually inspect both rotatable pointers; the blue prior and orange current markers must be distinguishable. Confirm **study pointer** and **record reference** wording, AVI dimensions and legibility at 1280×720. Independently replay the previous sixteen benches with unique disposable profiles (`composite`, `sealant`, `fluoride`, `cleaning`, `root_planing`, `chart`, `bitewing`, `oral_exam`, `veneer`, `inlay`, `crown`, `bridge`, `full_denture`, `partial_denture`, `implant`, `endo`). Six new Node source-contract suites in `tests/retreatment_record_review_bench_contract.test.mjs` are static wiring checks, **not** Godot runtime evidence.

**Stop after this one additional bench.** Keep draft unmerged pending exact-head owner Godot and visual acceptance; only another explicit `continue` authorizes another new lesson.
