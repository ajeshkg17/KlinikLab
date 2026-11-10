# Crown Try-In Bench — exactly one additional private-playtest lesson

This is an **unmerged source-only draft** stacked on exact head of PR #173, `10fda340c140f1681de6e7eb34c1a7aba9d37e9c`. It adds one `CROWN` lesson and retains the preceding ten: Composite, Sealant, Fluoride, Cleaning, Root Planing, Periodontal Charting, Bitewing Image Review, Oral Soft-Tissue Screening, Veneer and Inlay. No earlier PR head, extraction/gum branch, learner journal, Unity, held watcher, paused schedule or protected branch is changed. **Do not merge without owner runtime/visual acceptance.**

## Fictional instructional task

An instructor supplies a **mock full-coverage crown** for a named preparation teaching model. The bench compares a new original **synthetic 3D crown silhouette** (illustrative solid Godot meshes, cervical-margin teaching marker, **not a hollow clinical fitting surface**) against the earlier **synthetic inlay insert**. The first choice is labelled **study object**, not clinical instrument. The second is labelled **fit reference** and contrasts `material.crown_fit_reference`, the case's matched prepared-crown and cervical-margin card, against `material.inlay_outline_reference` for a different type of restoration. The internal `material_choice` log key is retained for backwards-compatible two-choice scoring; reference cards are not dental materials.

The existing, unmodified `crown` chair scenario has two model-only actions: **Seat on the prepared model** and **Check the margin landmark**, with unchanged 20-point simulation scoring. Its original source topic is https://www.mouthhealthy.org/all-topics-a-z/crowns, reused by the new lesson. This topic reference does not validate the synthetic model or clinical technique.

**Play:** Journey → Open crown try-in bench → rotate/inspect crown and inlay study objects → select the mock crown and matched fit-reference card → existing `crown` chair → complete the two assigned targets → **Record crown seating and cervical landmark check**, generating `record_crown_mock_try_in`. No true crown adaptation, measured marginal gap, proximal contacts, occlusion, tooth preparation, cementation, patient outcome or clinical-competence claim is made.

## Exact-head Windows / Godot 4.7.2 acceptance

1. Check out this PR's exact 40-character final HEAD in a **clean disposable checkout**, verify `git rev-parse HEAD`, and build to a previously nonexistent destination:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

2. Make a new disposable trial folder, e.g. `%APPDATA%/KLCrownBench-<GUID>`, with a `profile` child. In **only the generated disposable project's** `project.godot`, configure under `[application]`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLCrownBench-<GUID>/profile"
```

Confirm `OS.get_user_data_dir()` resolves inside exactly the corresponding `<trial>/profile` before running. Changing `APPDATA`/`LOCALAPPDATA` alone does not satisfy the existing strict user-profile isolation guard. Never target a real learner's saved journal, and unset any GitHub upload token.

3. With PowerShell `$Godot` pointing to Godot 4.7.2, `$Build` to the generated disposable project, and `$Trial` to its matching unused trial folder:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'crown-godot.log') --script res://crown-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Crown bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

4. Use a **different fresh** trial folder/profile with matching disposable project configuration to capture video evidence:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'crown-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'crown-godot.log') --script res://crown-inspection-trial.gd -- $Trial --video
```

Accept only `result.json` with `status=pass`, `mode=crown_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=crown_mock_full_coverage_try_in_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true`, `finish_event=record_crown_mock_try_in`. Inspect the full timeline for rejected and corrected study objects and fit cards (`selected_id` versus `expected_id`), one rejected chair target with different IDs, both crown actions, finish and clean reset.

Visually inspect the two 3D previews, the illustrative cervical-margin ring, **study object** and **fit reference** UI text, and AVI legibility at 1280×720. Independently replay each earlier ten bench trials (`composite`, `sealant`, `fluoride`, `cleaning`, `root-planing`, `chart`, `bitewing`, `oral-exam`, `veneer`, `inlay`) using their own unused profiles to confirm no regressions. The six Node source contracts in `tests/crown_try_in_bench_contract.test.mjs` do **not** substitute for executed Godot checks, real 20/20 gameplay, journal byte comparison, or AVI review.

**Stop after this one additional bench.** No merge without owner exact-head validation; no next bench until the user's next explicit `continue`.
