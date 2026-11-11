# Manual H-File Recognition and Canal-Diagram Bench

This branch adds **exactly one fictional playable study bench** to the existing KlinikLab native Godot application, stacked on draft PR #204. It reuses original inventory 3D models and the original `endo` chair diagram simulation. **No new clinical procedure or root canal treatment simulation** is introduced. The original 20 chair scenarios and 22 previous bench lessons remain unchanged, yielding **23 separate bench lessons**.

## Instructor-assigned scenario

The instructor asks a learner to identify the **manual Hedström H-file** from a pair of schematic 3D instrument silhouettes, then select the matching instructor-made diagram reference key. The alternative is an entirely different and clinically real *instrument family*, the **NiTi rotary file**, but is *not the instrument assigned for this exercise*. Neither is inserted into a simulated tooth. The subsequent chair task is **diagram annotation with an existing synthetic pointer**, not file operation.

The learner compares, rotates and chooses between:
- Correct: `tool.hand_h_file_recognition`, existing `res://assets/inventory/synthetic-hedstrom-h-file.tscn` (Hedström-Handfeile, manual finger handle).
- Case-specific distractor: `tool.niti_rotary_file_alternative`, existing `res://assets/inventory/synthetic-niti-rotary-file.tscn` (NiTi-Maschinenfeile, schematic motor-latch connector).

Then select `material.manual_file_canal_reference`, the fictional **instructor canal reference key**, rather than `material.rotary_file_reference_alternative`. The `material_choice` event identifier is retained from the shared UI event schema, but the learner sees **instructor canal reference key**, not a physical clinical material.

## Reused chair and finish

Journey → **Open H-file recognition and canal diagram bench** (`KL_OPEN_ENDO_FILE_BENCH`) → inspect and rotate both tools → select incorrect rotary model and see feedback → choose the H-file study model → select incorrect rotary reference and correct it → **Start chair practice** → unchanged `endo` chair highlights two instructor-premarked diagrams: **Trace the chamber** and **Trace the assigned canal** → reject an incorrect chair location and complete both correct diagram annotations → review the existing 20/20 chair outcome → finish **Record manual H-file identity and two canal-diagram markers** (`record_manual_h_file_canal_reference_review`) → isolated attempt report → reset, clearing all attempt selections and chair history.

The original chair uses a **canal tracing study pointer** and a static diagram. The lesson does **not** perform filing, working-length measurement, clinical anatomy inference, alloy comparison, torque/RPM settings, irrigation, obturation, diagnosis or patient treatment. File flute patterns, dimensions, handles and taper are only approximate and are **not ISO-calibrated**. General reference for the instrument family: https://www.aae.org/patients/root-canal-treatment/.

## New/modified files

- `native-godot/chairside-catalog.gd`: four case-specific bilingual tool/reference entries and the separate `ENDO_FILE` lesson (`scenario: "endo"`).
- `native-godot/app.gd`: separate Journey launcher `KL_OPEN_ENDO_FILE_BENCH`, a dedicated replay menu option, and lesson ID mapping; the underlying chair scenario selection is unchanged.
- `native-godot/composite-inspection-trial.gd`: one new lesson ID, two model rotation checks and exact wrong/correct choice IDs; existing scenario alias checking stays based on the lesson's `config["scenario"]`.
- `native-godot/endo-file-inspection-trial.gd`: minimal dedicated runner, `await _run_lesson("endo_file")`.
- `native-godot/build-app.mjs`: copies the replay runner; the two existing H-file and NiTi-file scene files are already packaged by prior inventory builder entries.
- `tests/endodontic_file_recognition_bench_contract.test.mjs`: five Node source tests for scenario framing, distinct 3D assets, correct/distractor records, Journey/replay, chair rejection, finish, reset, and original lesson/data invariance.

## Owner validation steps — not executed

On a clean checkout of the **exact feature SHA** on Windows, run the Node 22 tests including `node --test tests/endodontic_file_recognition_bench_contract.test.mjs` and then all source-contract and earlier bench tests. Build the native app with `node native-godot/build-app.mjs --source-dir=<checkout> --output=<empty-work-folder> --expected-sha=<HEAD>`, and import in Godot 4.7.2 using `--headless --editor --import`. Launch the Journey bench and verify that both existing model scenes are displayed, rotate correctly and have the German/English case labels.

Use a **fresh disposable Godot user-data profile** under the trial work folder when running `res://endo-file-inspection-trial.gd` with the original replay harness. Its result must show `mode=endo_file_bench`, case `id=endo_manual_file_canal_reference_intro`, `scenario=endo`, correct selection IDs (`tool.hand_h_file_recognition` and `material.manual_file_canal_reference`), two corrected choice attempts, one chair rejection with distinct selected/expected target IDs, complete 20-point chair result, finish event `record_manual_h_file_canal_reference_review`, `clean_reset=true`, and `learner_journal_unchanged=true`. Then replay **all 22 previous benches** to confirm scores, report semantics, clean reset and learner journal-byte invariance.

**GitHub Actions runners remain unavailable under issue #184.** Source inspection and committed tests do **not** prove native Godot import, model display, event progression or journal invariance. Keep this and all stacked parent PRs **draft/unmerged** until owner executes and accepts the tests.
