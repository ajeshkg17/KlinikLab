# Sectional Matrix versus Rubber-Dam Clamp Forceps Bench

This is **one** additional fictional chairside instrument-recognition lesson stacked on draft PR #206. It compares two **existing original schematic 3D forceps models**, then reuses the **unchanged** `composite` teaching-chair diagram. No new instrument geometry, clinical procedure, scored patient treatment or chair simulation is added. The previously existing **24 bench lessons** and **20 procedure scenarios** remain unchanged; the intended lesson count becomes **25**.

## Fictional case and instrument distinction

The instructor assigns *sectional matrix ring placement forceps* for identification in a posterior composite teaching diagram. This is distinct from the *rubber-dam clamp forceps* used in isolation workflows. The learner rotates two independently selectable study models:

- Expected: **Sectional matrix ring placement forceps** — `tool.sectional_matrix_placement_forceps`, `res://assets/inventory/synthetic-sectional-matrix-forceps.tscn`.
- Plausible case distractor: **Rubber-dam clamp forceps** — `tool.rubber_dam_clamp_forceps_alternative`, `res://assets/inventory/synthetic-rubber-dam-clamp-forceps.tscn`.

The learner then chooses a fictional **assigned matrix-ring diagram key** `material.sectional_matrix_ring_reference`, rather than an illustration labelled **rubber-dam clamp reference** `material.rubber_dam_clamp_reference`. These are classroom labels, not instruments, dental consumables, patient charts or instructions for clinical matrix placement. The internal shared `material_choice` event key is retained for replay compatibility; the visible learning label says **assigned matrix-ring diagram key**.

## Interactive route

**Journey → Open sectional matrix forceps recognition bench** (`KL_OPEN_MATRIX_FORCEPS_BENCH`) → rotate both simplified 3D models → select the rubber-dam clamp forceps incorrectly and receive feedback → select sectional matrix forceps → select the wrong isolation reference card and correct it → **Start chair practice** → unchanged original `composite` simulation performs its previously implemented virtual model actions **Remove marked defect** and **Place virtual composite** → reject one wrong virtual chair target and correct it → verify existing 20-point chair outcome → finish **Record sectional matrix forceps identity and composite model labels**, event `record_sectional_matrix_forceps_recognition` → isolated attempt report → reset with no retained selections or chair attempts.

**Important limitation:** The original composite chair does **not** display or simulate matrix-ring spreading, sectional matrices, wedge insertion, isolation, restoration contact formation or clinical tool manipulation. No assertion about these procedures can be inferred from completing the two generic model actions. No real clinical workflow, medically correct contact formation, patient outcome or competency is assessed.

## Source changes

- `native-godot/chairside-catalog.gd`: two extra bilingual 3D forceps tool choices, two illustrated case reference options and one `MATRIX_FORCEPS` lesson mapped to existing `scenario: "composite"`.
- `native-godot/app.gd`: a new Journey opener, a separate replay menu option `matrix_forceps_bench`, one accepted lesson ID and mapping to the shared chair.
- `native-godot/composite-inspection-trial.gd`: one extra lesson ID; rotate both models and log distinct incorrect/correct tool and reference choices; use existing guarded chair rejection/correcting, report, finish, clean reset and learner-journal byte check.
- `native-godot/matrix-forceps-inspection-trial.gd`: a small specialized runner calling `await _run_lesson("matrix_forceps")`.
- `native-godot/build-app.mjs`: local copy of the runner; both 3D forceps scenes already ship through the 143-entry inventory, unchanged.
- `tests/matrix_forceps_bench_contract.test.mjs`: five Node source-contract cases.

## Owner-side acceptance steps — unexecuted

On a clean checkout at this draft branch's exact SHA, run Node 22 source and native test suites, including `node --test tests/matrix_forceps_bench_contract.test.mjs`. Rebuild the Godot 4.7.2 project in a new empty output directory using `node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-directory> --expected-sha=<HEAD>` and import with `godot --headless --editor --import`. Confirm the Journey button appears, both forceps load independently and rotate left/right, the selector clearly distinguishes the correct placement forceps from clamp forceps, and both illustration swatches are legible.

Run `res://matrix-forceps-inspection-trial.gd` with a **fresh, disposable, isolated Godot user profile** as required by the existing trial harness. Confirm result `mode=matrix_forceps_bench`, `id=sectional_matrix_vs_rubber_dam_forceps_intro`, `scenario=composite`, expected IDs `tool.sectional_matrix_placement_forceps` and `material.sectional_matrix_ring_reference`, wrong and correct events for both decisions, a chair rejection with distinct selected/expected IDs, two correct virtual chair target events, chair score 20/20, `record_sectional_matrix_forceps_recognition` finish, `clean_reset=true`, and `learner_journal_unchanged=true`. Replay **all 24 prior benches**, verifying no changes to scoring, playability, journal bytes and clean restart.

At authoring time, GitHub Actions runner allocation remains blocked by issue #184. **Source-level assertions cannot establish real Godot import, rendered geometry, replay execution or file-data invariance.** Keep the new and parent PRs draft/unmerged until owner acceptance.
