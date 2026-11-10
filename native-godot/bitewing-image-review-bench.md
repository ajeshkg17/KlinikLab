# Bitewing Image Review Bench — one additional private-playtest lesson

This draft is stacked on the exact head of PR #169: `06667cf89183bd58e21de7f7226c578bb91faef2`. It adds exactly one new `BITEWING` bench to the existing six. Do not merge without exact-head Godot runtime and visual acceptance. Previous bench PRs, gum/extraction drafts, personal learner profiles, Unity, protected refs, paused schedules and watchers are outside scope.

## Fictional annotation case (not dental radiography)

The instructor supplies an **illustrative, preassigned image diagram** with two training landmarks: identify the proximal surface reference, then flag a region with deliberate overlap as **not readable**. The existing `bitewing` chair scenario is unchanged: `Identify proximal surfaces`; `Flag overlap`, and its existing study reference is https://www.mouthhealthy.org/all-topics-a-z/x-rays.

The bench compares a **synthetic 3D annotation pointer** (primitive Godot meshes, rounded coloured tip) with the earlier synthetic **periodontal probe**. This pointer is not an X-ray sensor, radiation source or real clinical instrument. The second step is visibly labelled **Choose the image reference** rather than material. It compares the fictional `material.assigned_bitewing_image` card against `material.site_chart` (a chart for a different task). The `material` key is retained solely for compatibility with the existing scoring and `material_choice` timeline. Neither card is a radiograph, patient record or clinical measurement.

**Journey → Open bitewing image review bench** → inspect/rotate both 3D examples → select pointer and assigned image reference → existing `bitewing` chair → two preassigned image landmarks, including overlap warning → **Record proximal landmark and unreadable overlap**. Finish event: `record_bitewing_image_annotations`, only after the chair verifies the two fictional model actions. No exposure, caries or lesion diagnosis, periodontal finding, clinical interpretation, or competence certification is implied.

## Exact-head Windows/Godot 4.7.2 owner acceptance

1. Use a clean, disposable Git checkout at this draft's exact 40-hex HEAD. Verify `git rev-parse HEAD` and build to an **unused, nonexistent** output folder. Do not reuse prior trial profiles.

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact source build failed' }
```

2. Make a unique trial folder under `%APPDATA%`, such as `%APPDATA%/KLBitewingBench-<GUID>`, and its `profile` child. In **only the generated disposable** project's `project.godot`, configure:

```ini
[application]
config/use_custom_user_dir=true
config/custom_user_dir_name="KLBitewingBench-<GUID>/profile"
```

Confirm the actual `OS.get_user_data_dir()` is within the matching `<trial>/profile`. Setting `APPDATA` or `LOCALAPPDATA` alone does not satisfy the strict profile guard. Never use an ordinary saved learner profile or an upload token.

3. With PowerShell `$Godot` set to Godot 4.7.2, `$Build` to the disposable built project, and `$Trial` to the matching trial folder, import and run:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'bitewing-godot.log') --script res://bitewing-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Bitewing bench trial failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

4. For rendered gameplay evidence, use a **separate unused trial/profile**, with the same matching isolation configuration, and run:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'bitewing-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'bitewing-godot.log') --script res://bitewing-inspection-trial.gd -- $Trial --video
```

Accept only a result with `status=pass`, `mode=bitewing_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=bitewing_image_annotation_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, and `finish_event=record_bitewing_image_annotations`. Inspect the timeline for one incorrect and corrected tool selection, one incorrect and corrected reference-card selection, a rejected chair action with distinct `selected_id`/`expected_id` values, both chair annotation actions and case-specific finish. Visually inspect the model preview, image reference heading, and readability of the final report in the AVI (at least 1280 × 720).

Independently replay `composite-inspection-trial.gd`, `sealant-inspection-trial.gd`, `fluoride-inspection-trial.gd`, `cleaning-inspection-trial.gd`, `root-planing-inspection-trial.gd`, and `chart-inspection-trial.gd` using separate disposable profiles to confirm regression freedom. The six Node source-contract suites in `tests/bitewing_image_review_bench_contract.test.mjs` verify source wiring, **not** a Godot runtime pass.

**Stop after this one additional bench.** No merge or next lesson until explicitly requested.
