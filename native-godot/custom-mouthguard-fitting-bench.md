# Custom Sports Mouthguard Fitting Bench — one additional source-only private-playtest lesson

**Scope:** draft and unmerged, stacked on exact head of PR #181, `2eb477722bc52d7109a7c1551c79cc9624655c35`. Adds only the `MOUTHGUARD` lesson, preserving the preceding eighteen lesson IDs, their original chair scenarios, Journey links, shared replay mechanics, and pinned CC0 asset hashes. Extraction/gum realism work, earlier PR heads, real learner profiles, Unity, protected refs, paused schedules and held watchers are outside scope. **Do not merge without owner exact-head Windows/Godot runtime and visual acceptance.**

## Assigned fictional teaching case

An instructor provides an abstract **upper arch model** and assigns one **sports mouthguard** with a labelled posterior coverage landmark. The new original **synthetic 3D guard** uses ten opaque occlusal teaching pads, ten raised outer bumper segments and one contrasting blue posterior marker, built from Godot primitive meshes. It is deliberately thicker and non-translucent compared with the preceding **synthetic clear aligner stage-04 tray**, which is the plausible incorrect object. Neither model is a patient-specific protective appliance or a manufactured product. There is no impact attenuation, performance standard, actual polymer thickness, retention force, mouthguard safety, occlusal contact or clinical fit measurement.

First selection is labelled **study appliance**: correct `tool.sports_mouthguard_study`, distractor `tool.aligner_stage04_tray`. Second selection is labelled **coverage reference**: correct `material.mouthguard_upper_arch_reference`, distractor `material.assigned_aligner_stage04_plan`. The cards are instructor-made study diagrams, **not** actual dental materials, scans or a clinical prescription. The generic event name `material_choice` remains only for compatibility with the two-choice scoring and journal event schema.

The original unchanged `mouthguard` chair has two model actions, **Seat the matching guard** and **Check the coverage landmark**, with existing /20 chair scoring. Its existing public source resolves to https://www.mouthhealthy.org/all-topics-a-z/mouthguards through the original procedure-scenarios topic map. The original drill also links the ADA's general oral-health topic index; neither source is a calibration or protection claim.

**Play:** Journey → Open custom mouthguard fitting bench → rotate both schematic appliance previews → choose the sports guard and assigned upper-arch reference → enter original `mouthguard` chair → verify the two fixed model targets → **Record mock guard seating and assigned arch-coverage landmark**, emitting `record_mouthguard_mock_coverage_review`. This is a simulated recognition and model-landmark exercise only, not clinical fitting, orthodontics, mouth protection validation, occlusal adjustment or patient treatment.

## Exact-head Windows / Godot 4.7.2 owner acceptance

Checkout the draft at its exact final 40-character SHA, in a disposable worktree or checkout, and confirm `git rev-parse HEAD`. Build a fresh project into an **unused** output directory:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create a new trial folder under `%APPDATA%`, for example `%APPDATA%/KLMouthguardBench-<GUID>`, with a `profile` child. In **only the generated disposable project's** `project.godot` configure under `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLMouthguardBench-<GUID>/profile"
```

**Confirm `OS.get_user_data_dir()` resolves inside this exact `<trial>/profile` before replay.** Overriding Windows `APPDATA` or `LOCALAPPDATA` alone is not a substitute for the guarded profile check. Never use existing learner data or set `KLINIKLAB_GITHUB_TOKEN`.

With PowerShell `$Godot` pointing to Godot 4.7.2, `$Build` to the generated disposable project, and `$Trial` to the matching previously unused trial folder:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'mouthguard-godot.log') --script res://mouthguard-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Mouthguard bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

Use a **different, fresh** trial and isolated profile for AVI visual inspection:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'mouthguard-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'mouthguard-godot.log') --script res://mouthguard-inspection-trial.gd -- $Trial --video
```

### Expected owner evidence

Require result JSON fields `status=pass`, `mode=mouthguard_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=mouthguard_mock_upper_arch_coverage_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, and `finish_event=record_mouthguard_mock_coverage_review`. Inspect the event timeline for a rejected and corrected **study appliance**, a rejected and corrected **coverage reference**, and at least one rejected chair target with different `selected_id` and `expected_id`, followed by both accepted chair targets, exact case finish, clean restart and **byte-identical learner journal**.

Inspect the two rotating 3D models, opaque guard pads, raised bumper and posterior coverage marker at 1280×720. Confirm the **study appliance**/**coverage reference** wording and AVI readability. Independently run all prior eighteen lesson replays with unique unused profiles: `composite`, `sealant`, `fluoride`, `cleaning`, `root_planing`, `chart`, `bitewing`, `oral_exam`, `veneer`, `inlay`, `crown`, `bridge`, `full_denture`, `partial_denture`, `implant`, `endo`, `retreat`, `aligner`. Six Node source-contract suites in `tests/custom_mouthguard_fitting_bench_contract.test.mjs` check **source wiring only** and are not evidence of actual Godot import, /20 completion, profile isolation, render quality or patient-safe performance.

**Stop after exactly one new Bench.** Do not merge before owner exact-head Godot and visual acceptance; do not add a second lesson until the user's next explicit `continue`.
