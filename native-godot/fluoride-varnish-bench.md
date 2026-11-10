# Fluoride Varnish Bench — one additional chairside lesson

This is a separate, unmerged private-playtest source draft **stacked on the Fissure Sealant Bench**, not a rewrite of that draft or of the extraction/gum work. The earlier Composite Restoration and Fissure Sealant lessons remain available.

## Case and behaviour

The fictional case specifies fluoride varnish applied by a single-use brush to two indicated teaching-arch surfaces. Compare the existing 3DAssets.dev CC0 curing-light study model with a **synthetic, schematic 3D brush** made using Godot primitive meshes. Select tool.varnish_brush (not tool.curing_light), then material.fluoride_varnish (not material.light_cure_sealant). The resin sealant is a plausible preventive-material distractor, but it does not match this case.

Journey → Open fluoride varnish bench → inspect/rotate the two 3D choices → select the prescribed applicator and material → Start chair practice, which uses the **unchanged** fluoride chair scenario (Coat left training surface; Coat right training surface) → verify chair result → Record both simulated varnish-coated surfaces. The source is the chair's existing ADA reference: https://www.mouthhealthy.org/all-topics-a-z/fluoride.

The simulation-specific event is record_fluoride_varnish_coating, not a light-cure. Neither the synthetic brush, the material swatches, nor the coating state establishes a clinical varnish dose, exposure, retention, fluoride release, or clinical competence.

## Exact-head private Windows/Godot acceptance

Use a fresh disposable clone/checkout pinned to the new draft head. Verify git rev-parse HEAD equals the 40-hex source SHA; never build over an existing output directory or use a shared learner profile.

Build using Node (replace placeholders):

```powershell
node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-build> --expected-sha=<HEAD>
if ($LASTEXITCODE -ne 0) { throw 'Exact-source build failed' }
```

Create a new trial directory under %APPDATA%, e.g. %APPDATA%/KLFluorideBench-<GUID>, with child profile. In only the generated disposable project's project.godot, set application/config/use_custom_user_dir=true and application/config/custom_user_dir_name="KLFluorideBench-<GUID>/profile". Probe OS.get_user_data_dir() first: it must resolve within the new <trial>/profile. **APPDATA/LOCALAPPDATA overrides alone are insufficient** for the Godot 4 custom-user-directory guard.

Then set PowerShell variables $Godot (Godot 4.7.2 executable), $Build (fresh generated project), $Trial (matching new trial folder) and run:

```powershell
& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $Godot --headless --path $Build --log-file (Join-Path $Trial 'fluoride-godot.log') --script res://fluoride-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw 'Fluoride bench replay failed' }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For rendered gameplay evidence, run the following in a **new unused trial folder/profile** after confirming headless acceptance:

```powershell
& $Godot --path $Build --windowed --write-movie (Join-Path $Trial 'fluoride-gameplay.avi') --fixed-fps 24 --log-file (Join-Path $Trial 'fluoride-godot.log') --script res://fluoride-inspection-trial.gd -- $Trial --video
```

Require result.json: status=pass, mode=fluoride_bench, source_sha=<HEAD>, learner_journal_unchanged=true, runs[0].id=fluoride_varnish_coating_intro, selection_score=2/2, chair score=20/20, completed=true, finish_event=record_fluoride_varnish_coating, clean_reset=true. Inspect timeline for distinct selected_id/expected_id pairs on rejected and accepted tool/material choices and at least one chair rejection; check both chair targets and clean restart.

Separately rerun composite-inspection-trial.gd and sealant-inspection-trial.gd from new disposable profiles to confirm preservation. A Node source-contract pass is not a Godot import, actual 20/20 chair run, model rendering, journal invariance pass, or AVI replay.

No merge, no watcher/queue, no held schedule or protected ref changes. Stop after this single bench.
