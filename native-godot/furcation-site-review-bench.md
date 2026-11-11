# Furcation Probe and Model-Site Recording Bench — fictional 3D practical

This **one** additional native Godot chairside *lesson* is stacked on the existing read-only periodontal instrument inventory (PR #202). It is a new learner-selectable bench, **not** a new surgical/clinical procedure or a 21st chair simulation. The **20 original chair scenarios** and their original 20 existing bench lessons are unchanged.

## Fictional assignment

An instructor highlights two generic location targets, named **LEFT** and **RIGHT**, in the original teaching arch `chart` scene. These are **model-reference markers**. They are *not anatomically rendered root furcations*, verified tooth sites, real pocket readings or a real periodontal patient chart.

In the **new separate bench**, compare and rotate two preexisting, locally-authored 3D study instruments:
- **Nabers furcation probe** — `tool.nabers_furcation_study` (correct case-specific selection), using `res://assets/inventory/synthetic-nabers-furcation-probe.tscn`. The distal working end is visibly curved.
- **UNC-15 periodontal pocket probe** — `tool.unc15_furcation_distractor` (plausible alternative, but wrong *for this instructor's assignment*), using `res://assets/inventory/synthetic-unc15-periodontal-probe.tscn`. Its straight-shank graduations are decorative, **not mm calibrated**.

Then select the illustrated case-specific `material.assigned_furcation_locator` over the generic `material.site_chart`. The shared bench names this step **site locator key**, not *material*; the shared event schema retains `material_choice` for backward compatibility.

## Interactive flow

**Journey → Open furcation site-recording bench** → rotate both models → try wrong UNC-15 → correct Nabers → try the generic chart → correct case-specific locator → **Start chair practice** → original `chart` simulation → reject one incorrect target → acquire the appropriate simulated probe and record the two generic markers → return, verify **20/20** chair score → finish **Record the two assigned furcation-reference model locations** → `record_furcation_model_reference_locations` report event → restart bench and verify it is clean.

The unchanged chart chair has the original **Record left site** and **Record right site** actions. The new bench changes **only case framing, study 3D choices and educational record selection**. It does **not** create or claim horizontal Nabers probing, Hamp/Glickman furcation grades, tissue contact, calibrated probing depth, true furcation anatomy or any patient-related outcome.

References: existing ADA MouthHealthy periodontics educational page at https://www.mouthhealthy.org/all-topics-a-z/periodontics. Instrument shapes are original schematic inventory scenes, not commercial CAD.

## Files, routing, replay

- `native-godot/chairside-catalog.gd`: three additional case entries in `ITEMS` and one `FURCATION` lesson record with `scenario: chart`.
- `native-godot/app.gd`: one new Journey button `KL_OPEN_FURCATION_BENCH`, one replay button `furcation_bench`, one new route to the shared chairside bench, and one explicit replay script binding. The original procedure drill table remains untouched.
- `native-godot/furcation-inspection-trial.gd`: tiny specialized runner that invokes the shared, existing guarded replay.
- `native-godot/composite-inspection-trial.gd`: one extra lesson ID branch for correct and wrong choices. Chair and report assertions refer to the lesson's **existing scenario ID** (for this lesson `chart`) rather than assuming all lesson IDs map 1:1 to chair scenario IDs. All old lessons still map 1:1.
- `native-godot/build-app.mjs`: copy new runner file into isolated Godot output; both study 3D inventory scene files are already shipped by the previous inventory builder entries.
- `tests/furcation_site_review_bench_contract.test.mjs`: five Node source contracts for assets, case choices, route, guarded replay and original bench preservation.

## Required owner-side native acceptance — NOT YET EXECUTED

1. On a clean checkout of this exact draft head, run `git rev-parse HEAD` and `node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-folder> --expected-sha=<HEAD>` on Windows with Node 22, then run Godot 4.7.2's `--headless --editor --import`.
2. Use a fresh disposable Godot user-data **profile** under the trial directory, not any real learner profile. Run `res://furcation-inspection-trial.gd` with that trial directory passed after `--`. The replay explicitly checks its user profile location and refuses a GitHub token.
3. Inspect result JSON for **mode `furcation_bench`**, id `furcation_model_landmark_review_intro`, scenario `chart`, expected tool `tool.nabers_furcation_study`, expected locator `material.assigned_furcation_locator`, score **20/20**, two correct choices, rejected/corrected selections, a rejected chair target with distinct selected and expected IDs, finish event `record_furcation_model_reference_locations`, `clean_reset: true`, and `learner_journal_unchanged: true`. Separately inspect the replay timeline for all expected transitions.
4. From Journey, visually check both models are recognizable, their rotation controls work, the step label says *site locator key*, and the old periodontal chart bench remains independently playable. Replay **all 20 original benches**, check clean restarts and journal byte equality, and inspect the inventory if any source scene fails to import.

GitHub Actions runners currently fail to allocate (issue #184). **Source checks do not establish that the actual app launched or that replay/visual acceptance passed.** Keep this and all parent PRs draft and unmerged until verified.
