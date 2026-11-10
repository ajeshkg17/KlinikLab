# Indirect Inlay Try-In Bench — exactly one additional private-playtest lesson

This **unmerged source-only draft** is stacked on exact parent PR #172 head `e39973ccc1b2615fbe0b737869a91c566f8c0be4`. It adds precisely one `INLAY` lesson while retaining Composite, Sealant, Fluoride, Cleaning, Root Planing, Periodontal Charting, Bitewing Image Review, Oral Soft-Tissue Screening and Veneer Try-In. Do not modify earlier PR heads, extraction/gum drafts, personal learner journals, Unity, protected refs, paused workflows or watchers. Do not merge until exact-head runtime acceptance.

## Fictional educational case

The instructor supplies a prepared-cavity **teaching model** with a specifically assigned **mock indirect inlay insert** and matched cavity-outline reference. The new bench compares a clearly disclosed **synthetic 3D inlay study object** (original Godot box primitives with an illustrative outline marker) against the prior **synthetic veneer shell** for a different case. It explicitly labels the first choice **Choose the study object**, not a clinical instrument. The second step is **Choose the fit reference**: `material.inlay_outline_reference` versus `material.veneer_fit_reference`. The shared `material_choice` internal ID remains only for compatibility with the original two-choice lesson framework; these reference cards are not dental materials or patient records.

**Chair scenario:** the existing, unchanged `inlay` chair with actions `Seat in the prepared outline` and `Check outline landmark`, each model-only, with the original 20-point scoring. The original chair resolves the ADA MouthHealthy reference https://www.mouthhealthy.org/all-topics-a-z/fillings-gold-inlays. This topic reference does not validate the synthetic geometry.

**Play:** Journey → Open indirect inlay try-in bench → rotate/inspect the inlay and veneer study objects → select the assigned mock inlay and matching cavity-outline card → enter the existing `inlay` chair → complete both model actions → select `Record mock inlay seating and outline landmark`. The bench writes `record_inlay_mock_try_in` **only after verified return**. It does not simulate calibrated internal or marginal adaptation, proximal contacts, occlusion, tooth preparation, adhesive bonding, cementation or real treatment.

## Exact-head Windows / Godot 4.7.2 owner acceptance

Check out this draft's reported exact 40-character source HEAD in a **clean disposable checkout** and confirm `git rev-parse HEAD`. Build into a new path that has never existed:

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Source-pinned build failed' }
```

Create a unique trial folder beneath `%APPDATA%`, e.g. `%APPDATA%/KLInlayBench-<GUID>`, with a `profile` child. In the **generated disposable project only**, set under `[application]` in `project.godot`:

```ini
config/use_custom_user_dir=true
config/custom_user_dir_name="KLInlayBench-<GUID>/profile"
```

Verify actual `OS.get_user_data_dir()` is inside the matching `<trial>/profile` before executing the trial. Godot Windows user data paths depend on the project configuration; changing `APPDATA` / `LOCALAPPDATA` alone is insufficient for the strict profile guard. Never use a saved learner profile or a GitHub upload token.

With PowerShell variables `$Godot` pointing to Godot 4.7.2, `$Build` pointing to the generated project and `$Trial` pointing to its fresh trial directory:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'inlay-godot.log') --script res://inlay-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Inlay bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For rendered AVI review, create a **separate fresh** trial and profile, with matching disposable user-data settings, then:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'inlay-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'inlay-godot.log') --script res://inlay-inspection-trial.gd -- $Trial --video
```

Accept only a JSON result with `status=pass`, `mode=inlay_bench`, `source_sha=<HEAD>`, `learner_journal_unchanged=true`, `runs[0].id=inlay_mock_indirect_try_in_intro`, `selection_score=2`, `score=20`, `completed=true`, `clean_reset=true` and `finish_event=record_inlay_mock_try_in`. Examine the action timeline for the wrong and corrected insert/object choices, wrong and corrected fit cards with distinct `selected_id`/`expected_id`, a rejected chair target with different selected and expected IDs, both inlay chair actions, correct finish and clean restart.

Visually inspect both 3D previews, visibility of the outline marker, accurate **study object** and **fit reference** headings and 1280×720 legibility in the AVI. Repeat earlier nine bench replays independently with unused profiles: `composite`, `sealant`, `fluoride`, `cleaning`, `root-planing`, `chart`, `bitewing`, `oral-exam`, `veneer`. The six Node contracts in `tests/indirect_inlay_try_in_bench_contract.test.mjs` are static source checks and **do not** establish runtime success or actual journal byte invariance.

**Stop after this one new bench.** No merge without owner exact-head Godot acceptance and no additional lesson without another explicit `continue`.
