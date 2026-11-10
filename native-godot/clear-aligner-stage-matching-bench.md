# Clear Aligner Stage Matching Bench — exactly one additional draft lesson

**Scope:** unmerged source-only private playtest stacked on PR #180 exact parent `23aa5eb840e18f1c04a69e25752443f44f7dece4`. This adds one `ALIGNER` lesson while retaining the existing seventeen lesson IDs, their replay routes, chair behavior, and source-pinned CC0 assets. No earlier PR head, tooth extraction/gum realism work, saved learner profile, Unity, protected ref, held watcher, or paused schedule is changed. **Do not merge without owner exact-head Windows/Godot and visual acceptance.**

## Fictional teaching case

An instructor gives an abstract model arch and assigns **aligner stage 04**. In the shared 3D preview, the learner compares a new original **synthetic translucent U-shaped study tray** with four blue stage-identifier bars against the earlier synthetic **complete-denture arch**. The four bars denote the teacher's chosen stage in this fictional case; they are not a clinical product number or calibrated thickness. These Godot primitive meshes do not reproduce a manufactured aligner, scanning result, tooth movement, contacts, attachment engagement, occlusion or material mechanics.

The first selection is labelled **study appliance**: correct `tool.aligner_stage04_tray`, distractor `tool.complete_denture_arch`. The second is labelled **stage reference**: correct `material.assigned_aligner_stage04_plan`, distractor `material.complete_denture_arch_reference`. The two reference cards are illustrations, not dental materials, prescriptions or patient records. The generic event key `material_choice` remains only for shared score compatibility.

The **unchanged** `aligner` chair scenario retains its two original targets: **Seat the assigned stage** and **Check the seating landmark**, with existing /20 simulated scoring. The original drill's AAO background reference is https://aaoinfo.org/treatments/aligners/. It is context only—not approval of the synthetic design or clinical procedure.

**Journey:** Open clear aligner stage matching bench → inspect/rotate both 3D study appliances → select the assigned stage-04 object and matching arch-and-stage diagram → original `aligner` chair → mark both teacher-assigned model targets → **Record assigned aligner stage and model seating landmark**, emitting `record_aligner_mock_stage04_review`. Nothing in this lesson assesses real fit, patient suitability, aligner wear schedule, tooth movement, staging, orthodontic treatment or outcome.

## Owner acceptance: exact-head Windows and Godot 4.7.2

Use a **clean disposable checkout** pinned to this draft's final exact 40-character head (`git rev-parse HEAD`) and a previously nonexistent build folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact-head build failed' }
```

Create a fresh unused trial directory such as `%APPDATA%/KLAlignerBench-<GUID>` with an empty `profile` child. Change **only the generated disposable project's** `project.godot` application settings:

```ini
[application]
config/use_custom_user_dir=true
config/custom_user_dir_name="KLAlignerBench-<GUID>/profile"
```

Verify `OS.get_user_data_dir()` actually resolves inside that exact `<trial>/profile`, because overriding `APPDATA`/`LOCALAPPDATA` alone does not meet the guarded replay's profile check. Never use real learner files or set `KLINIKLAB_GITHUB_TOKEN`.

With `$Godot` referring to Godot 4.7.2, `$Build` to the generated project, and `$Trial` to the matching disposable trial directory:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'aligner-godot.log') --script res://aligner-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Aligner bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

Use a **separate fresh trial/profile** and matching disposable project settings for visual AVI:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'aligner-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'aligner-godot.log') --script res://aligner-inspection-trial.gd -- $Trial --video
```

Require the result fields `status=pass`, `mode=aligner_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=aligner_mock_stage04_fit_review_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true` and `finish_event=record_aligner_mock_stage04_review`. Inspect the timeline for both wrong and corrected study-object/reference choices with distinct `selected_id` and `expected_id`, one rejected chair target, both chair actions, the exact finish, and clean reset. Verify the journal's existence and byte identity against the pre-replay snapshot.

Visually review both rotatable 3D previews, the translucent open study arch and all four blue marker bars, **study appliance** and **stage reference** labels, legibility and AVI dimensions at 1280×720. Independently replay the preceding **seventeen** lessons in fresh isolated profiles: `composite`, `sealant`, `fluoride`, `cleaning`, `root_planing`, `chart`, `bitewing`, `oral_exam`, `veneer`, `inlay`, `crown`, `bridge`, `full_denture`, `partial_denture`, `implant`, `endo`, `retreat`. Six new Node source contracts at `tests/clear_aligner_stage_matching_bench_contract.test.mjs` cover source wiring only; they are **not** evidence of executed Godot gameplay, 20/20 scoring or journal-byte integrity.

**Stop after exactly this new bench.** Do not merge until exact-head owner runtime and visual acceptance; do not start another bench without the next explicit user `continue`.
