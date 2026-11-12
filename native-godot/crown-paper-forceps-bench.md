# Crown Articulating-Paper Forceps Recognition Bench

This adds **one** fictional, independently accessible instrument-identification lesson above draft PR #207. The parent contains 25 bench lessons, 20 original chair simulations and a read-only inventory of 143 model entries. This branch adds a **26th bench lesson** without adding any chair scenario, instrument model or actual clinical workflow.

## Instructor-assigned case

A mock crown-tray instructor assigns **articulating-paper forceps** (Artikulationspapierpinzette / Miller-Pinzette) for *instrument-family recognition*, not cotton-tweezer handling. Learners compare and rotate:
- **Correct for this task:** `tool.articulating_paper_forceps_study`, `res://assets/inventory/synthetic-articulating-paper-forceps.tscn`, original schematic 3D instrument with hinged paper-holding jaws.
- **Plausible distractor:** `tool.college_cotton_pliers_alternative`, `res://assets/inventory/synthetic-college-pliers.tscn`, original schematic college tweezers/Wat­tepinzette with slimmer spring arms used for handling small items.

Both are genuine distinct instrument categories, but the digital shapes are **locally authored teaching silhouettes**, not exact manufacturer CAD or patient tools. Neither instrument is used in the subsequent chair simulation.

Students then select the matching illustrated **`material.crown_articulating_forceps_reference`** rather than `material.cotton_isolation_reference_alternative`. The learning interface calls this an **assigned crown model reference key**, not an actual dental material. The card identifies the assigned forceps plus the two existing crown model actions; it contains no clinical articulating-paper marks, occlusal contact evaluation or patient record.

## Actual interactive path

Journey → **Open crown tray forceps recognition bench** (`KL_OPEN_CROWN_PAPER_FORCEPS_BENCH`) → rotate both existing 3D tools → attempt the college tweezers (wrong), then select articulating-paper forceps (correct) → choose cotton isolation card (wrong), then the assigned crown card (correct) → **Start chair practice** → reuse the untouched `crown` model chair to **Seat on the prepared model** and **Check the margin landmark** → reject one incorrect model target and then record both correct targets → verify the existing 20-point chair result → finish with **`record_crown_paper_forceps_recognition`** → write an isolated trial report → restart with no retained choices or chair attempts and the preexisting learner-journal byte-identity guard.

The original crown chair does **not** simulate placing articulating paper into occlusion, identifying contact markings, adjusting the bite, determining fit, manipulating a real crown or cementing a prosthesis. Its two model actions are *generic virtual seating and cervical-margin landmark identification*. No patient, clinical outcome, instrument competency or treatment is represented.

## Code and regression coverage

- `native-godot/chairside-catalog.gd`: four bilingual study-choice entries and one `CROWN_PAPER_FORCEPS` lesson using `scenario: "crown"`.
- `native-godot/app.gd`: new Journey launcher `KL_OPEN_CROWN_PAPER_FORCEPS_BENCH`, replay option `crown_paper_forceps_bench` and lesson-to-existing-chair routing.
- `native-godot/composite-inspection-trial.gd`: one additional lesson, model rotations and wrong/correct option IDs using established chair rejection, report, finishing, reset and journal checks.
- `native-godot/crown-paper-forceps-inspection-trial.gd`: thin runner calling the shared `_run_lesson("crown_paper_forceps")`.
- `native-godot/build-app.mjs`: copy-only inclusion of the runner. Both 3D study models already ship through older inventory manifests.
- `tests/crown_paper_forceps_bench_contract.test.mjs`: five new Node source-contract tests.

## Owner acceptance — pending execution

On Windows, use a clean clone at the **exact head commit** and Node 22. Execute `node --test tests/crown_paper_forceps_bench_contract.test.mjs` and the entire native regression suite. Build a new isolated Godot 4.7.2 app via `node native-godot/build-app.mjs --source-dir=<checkout> --output=<unused-directory> --expected-sha=<HEAD>`, import it with `godot --headless --editor --import`, and interactively verify both original 3D forceps rotate in the new bench.

Run `res://crown-paper-forceps-inspection-trial.gd` using a new disposable isolated Godot user-data profile, as enforced by the existing shared replay harness. Verify the report identifies mode `crown_paper_forceps_bench`, lesson `crown_articulating_paper_forceps_recognition_intro`, scenario `crown`, expected IDs `tool.articulating_paper_forceps_study` and `material.crown_articulating_forceps_reference`, rejected and corrected tool/reference choices, a rejected chair target with different selected/expected target IDs, two correct crown chair actions and a 20/20 score, `record_crown_paper_forceps_recognition`, `clean_reset=true` and `learner_journal_unchanged=true`. Replay all **25 preceding benches** to check original event IDs and restart/journal invariance.

**Not yet executed:** Node 22, real Godot 4.7.2 import, visual model inspection, full guarded replay and journal verification. GitHub Actions runners still fail to allocate (tracked in issue #184). Keep this draft and ancestor PRs unmerged pending owner runtime acceptance.
