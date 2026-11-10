# Shared chairside lesson · one additional Fissure Sealant Bench

This branch reconstructs the supplied working **Composite Restoration Bench**
source example because its local-only commit `6fe655d52f32e5b85f68e7cf9e26afadcfea43ff`
is not present in GitHub PR #162 at
`2354c81457c7015813f74ae99ac7ffc2be16fcaa`.
Both examples use the same `chairside-bench.gd`, `chairside-catalog.gd`,
`chairside-model-preview.gd` and `composite-inspection-trial.gd`.
Only **one new lesson** is introduced in this change: the Fissure Sealant Bench.
The original composite example remains accessible.

## Play

From **Journey**, choose **Open composite restoration bench** (reference example)
or **Open fissure sealant bench** (new). Rotate/drag the two existing CC0
instrument models (curing light and ultrasonic scaler). The fictional sealant
case specifically requests a **light-cured resin fissure sealant** on the
marked teaching crown pits and fissures. Select the curing light, then choose
`material.light_cure_sealant`; `material.glass_ionomer` is a case-specific
distractor, **not** a claim that glass-ionomer products are never used as
fissure sealants in clinical care.

The bench then starts the **existing** `sealant` chair scenario unchanged
(`Coat first fissure`, `Coat second fissure`). After its 20/20 chair
verification, the final bench action is **Confirm simulated light curing of
both coated fissures**. This is a state transition in a fictional model; it
does not simulate light energy/dose or establish clinical curing quality.

The case source is the same ADA sealant URL already present in
`procedure-drills.gd`:
https://www.ada.org/resources/ada-library/oral-health-topics/dental-sealants

The two 3D instrument scenes are the **same** hash-pinned 3DAssets.dev CC0
curing-light/scaler models used in the composite example. The sample swatches
and model scale are illustrative.

## Exact-head private Windows acceptance

Use a **clean disposable checkout** of the candidate draft, pinned to the
reported exact 40-hex SHA. Use a *new* output directory for the standalone
`native-godot/build-app.mjs` build; the builder rejects overwrite.
Verify `git rev-parse HEAD` matches `--expected-sha`.

To satisfy the existing trial's strict `user://` isolation guard on Windows,
place a fresh trial folder under Roaming AppData, e.g.
`%APPDATA%/KLSealantBench-<GUID>`, and make a disposable **copy** of
`project.godot` in the generated Godot build. Change only that disposable
project's `application/config/custom_user_dir_name` to
`KLSealantBench-<GUID>/profile` with
`application/config/use_custom_user_dir=true`.
Create `<trial>/profile`. Probe `OS.get_user_data_dir()` using Godot
before starting; it must equal `<trial>/profile` (or resolve to its child).
Setting `APPDATA` or `LOCALAPPDATA` alone is **not** an adequate substitute.

Example PowerShell once `$Checkout`, `$Godot`, `$Head`, `$Build`
(fresh, unused) and `$Trial` (fresh Roaming path with matching userdir)
have been set:

```powershell
node native-godot/build-app.mjs "--source-dir=$Checkout" "--output=$Build" "--expected-sha=$Head"
if ($LASTEXITCODE -ne 0) { throw "Exact-source build failed" }

& $Godot --headless --path $Build --import
if ($LASTEXITCODE -ne 0) { throw "Godot import failed" }

& $Godot --headless --path $Build `
  --log-file (Join-Path $Trial 'sealant-godot.log') `
  --script res://sealant-inspection-trial.gd -- $Trial
if ($LASTEXITCODE -ne 0) { throw "Fissure sealant bench replay failed" }
Get-Content (Join-Path $Trial 'result.json') -Raw
```

For the actual **private rendered replay** (same isolated trial setup,
and an unused AVI path), replace the final Godot call with:

```powershell
& $Godot --path $Build --windowed `
  --write-movie (Join-Path $Trial 'sealant-gameplay.avi') --fixed-fps 24 `
  --log-file (Join-Path $Trial 'sealant-godot.log') `
  --script res://sealant-inspection-trial.gd -- $Trial --video
```

Movie Maker output is only evidence **after** Godot actually writes it.
Use ffprobe or equivalent to verify encoded dimensions if resolution matters;
the `--resolution` option alone was not conclusive on earlier builds.

Inspect `result.json`: require `source_sha == $Head`,
`mode == "sealant_bench"`, `status == "pass"`,
`learner_journal_unchanged == true`, and `runs[0]` containing
`id == "fissure_sealant_light_cure_intro"`,
`selection_score == 2`, `score == 20`,
`completed == true`, `clean_reset == true`,
`finish_event == "simulate_sealant_cure"`.
The timeline must contain wrong/correct tool picks, wrong/correct material
picks, at least one rejected chair action, and correct selected/expected IDs.
The original composite `composite-inspection-trial.gd` can be rerun
separately as a preservation check. Do not merge or use a shared learner
profile, screenshot watcher, paused schedule, or Unity.

Human mouse/keyboard use, 3D visual clarity and treatment validity are
separate from the headless score and isolated journal byte check.
