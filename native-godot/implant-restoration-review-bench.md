# Implant Restoration Review Bench — one additional source-only private-playtest lesson

**Scope and parent.** Draft, unmerged, stacked on exact PR #177 head `7dd377e9f0e818e6d6550aa876ac863c960c7f96`. This adds exactly one `IMPLANT` lesson while retaining the preceding fourteen lessons (Composite, Sealant, Fluoride, Cleaning, Root Planing, Charting, Bitewing, Oral Exam, Veneer, Inlay, Crown, Bridge, Complete Denture and Partial Denture). Earlier PR heads, tooth extraction/gum realism work, saved learner journals, Unity, held watchers, paused schedules and protected refs are outside scope. **Do not merge before exact-head owner Godot QA.**

## Fictional assignment — model identification and interface landmark only

The tutor supplies a **schematic implant-supported crown assembly** and matching **implant-site and interface reference card** for an abstract teaching fixture. The student compares the new original **synthetic 3D implant-crown study object** (a metal-coloured cylinder, connector/abutment neck, solid crown silhouette and contrasting blue teaching marker) against the previous tooth-supported single-crown shell. All geometry is original Godot primitive meshes, **not** dimensionally accurate or clinically fitted; the blue ring is not a screw channel, abutment measurement or specified torque.

The first UI step is **Choose the study object**: `tool.implant_crown_study` versus `tool.crown_shell`. The second step is **Choose the site reference**: `material.implant_site_interface_reference` versus `material.crown_fit_reference`. The internal `material_choice` event key is preserved solely for generic two-choice compatibility; the reference cards are **not** dental materials, patient scans or radiographs.

**Existing unchanged chair:** `implant` with two model actions: **Match the restoration to the site** and **Check the interface landmark**, using the original /20 chair scoring. Its existing public topic link is https://www.mouthhealthy.org/all-topics-a-z/implants. This link is background context only and does not establish clinical validity of this geometry or method.

**Play:** Journey → Open implant restoration review bench → rotate the synthetic implant-crown and regular crown study objects → choose the assigned assembly and site-reference card → existing `implant` chair → verify the two model targets → **Record simulated implant-site match and interface landmark**, emitting `record_implant_mock_site_review`. No implant surgery, insertion depth, radiographic planning, component compatibility, torque, osseointegration, contacts, loading, tissue response, real clinical fit or patient outcome is evaluated. This is not a treatment guide.

## Exact-head Windows/Godot 4.7.2 owner acceptance

Check out the draft's **exact final 40-character source SHA** in a clean disposable checkout (`git rev-parse HEAD`). Build to a **previously nonexistent** output folder:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact-head build failed' }
```

Create a unique disposable trial directory, for example `%APPDATA%/KLImplantReviewBench-<GUID>`, and an empty `profile` subdirectory. In **only the generated disposable project**, configure the `project.godot` application settings:

```ini
[application]
config/use_custom_user_dir=true
config/custom_user_dir_name="KLImplantReviewBench-<GUID>/profile"
```

**Before replay, verify `OS.get_user_data_dir()` resolves inside the matching `<trial>/profile`.** Godot's actual Windows user-data path depends on project settings; overriding `APPDATA`/`LOCALAPPDATA` alone does **not** satisfy the guarded trial. Do not use an existing learner profile or any GitHub upload token.

With PowerShell `$Godot` pointing to Godot 4.7.2, `$Build` to the generated disposable project and `$Trial` to its matching fresh trial folder:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'implant-review-godot.log') --script res://implant-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Implant review replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

Use a **different, unused** disposable trial/profile with matching project settings to capture an AVI:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'implant-review-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'implant-review-godot.log') --script res://implant-inspection-trial.gd -- $Trial --video
```

### Required acceptance evidence

Require `result.json` with `status=pass`, `mode=implant_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=implant_mock_restoration_site_review_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true` and `finish_event=record_implant_mock_site_review`. Inspect the action timeline for wrong/right assembly and reference decisions with distinct selected/expected IDs; at least one rejected chair target with different IDs; both assigned model chair actions; custom finish; clean reset; and actual learner-journal existence/byte identity.

Inspect the two 3D previews and rotation behavior; cylindrical support, neck, artificial crown and blue interface marker must be visible. Verify **study object** and **site reference** headings, plus legibility and actual AVI dimensions at 1280×720. Independently replay the preceding fourteen lessons with separate fresh profiles (`composite`, `sealant`, `fluoride`, `cleaning`, `root_planing`, `chart`, `bitewing`, `oral_exam`, `veneer`, `inlay`, `crown`, `bridge`, `full_denture`, `partial_denture`). Six source-contract tests at `tests/implant_restoration_review_bench_contract.test.mjs` cover **source wiring only**. They cannot demonstrate a Godot runtime pass, actual 20/20 score, journal byte identity or screenshot/AVI quality.

**Stop after exactly one new bench.** Keep draft and unmerged pending exact-head owner acceptance; another bench requires another explicit user `continue`.
