# Completed Denture vs Wax Bite Rim Recognition Bench

This is **one** additional fictional study bench in KlinikLab, stacked on draft PR #205. It contrasts a **completed full-denture model** with a **wax occlusion rim on a record base**, then reuses the original `full_denture` chair for two assigned model-location checks. The **20 original chair scenarios** and **23 earlier bench lessons** remain unchanged; the intended lesson total becomes **24**. No additional 3D model or true laboratory/clinical procedure is introduced.

## Fictional instructor assignment

The instructor has provided a synthetic model denture with a posterior teaching landmark. Students must distinguish its completed tooth-bearing arch from an arch-shaped wax occlusion-rim study, which represents a different **jaw-relation recording stage**. These are illustrative model objects, not a patient prosthesis or usable wax-bite record.

Rotate and compare two preexisting original 3D scenes:
- **Correct, completed full-denture arch:** `tool.complete_denture_arch`, `res://assets/bench/synthetic-complete-denture.tscn`. The 3D teaching model has an arch of prosthetic tooth shapes.
- **Case-specific distractor, wax occlusion rim:** `tool.wax_occlusion_rim_study`, `res://assets/inventory/synthetic-bite-registration-wax-rim.tscn`. It has a wax-rim arch on a simple record base rather than completed prosthetic teeth.

Then select **`material.finished_denture_posterior_key`**, the instructor's illustrated finished-arch/posterior reference card, over the **`material.wax_rim_jaw_relation_key`** alternative. The learner-facing stage label is **assigned finished-denture marker key**, not clinical material. Both are fictional diagrams, not jaw-relation records, clinical charts, or patient photographs. The shared replay data schema retains the backward-compatible `material_choice` field.

## Interactive flow

**Journey → Open completed denture versus wax rim bench** (`KL_OPEN_DENTURE_WAX_RIM_BENCH`) → rotate both shapes → choose the incorrect wax rim and receive feedback → select the completed denture → choose the incorrect wax-rim card and correct it → **Start chair practice** → the unchanged `full_denture` chair performs **Seat the complete arch** and **Check the posterior landmark** using the original synthetic fixture → reject one wrong chair target, then correctly record two assigned study actions → verify the original 20-point chair score → finish **Record completed-denture identity and posterior model landmark** (`record_finished_denture_vs_wax_rim_review`) → isolated attempt report → reset and verify the lesson has no retained selections or chair attempts and the learner journal bytes are unchanged.

**No patient outcomes are represented:** There is no real denture impression, clinical seating, pressure assessment, occlusion, retention, stability, vertical dimension, jaw-relation measurement, laboratory processing, material accuracy, or treatment. The wax-rim outline and full-denture proportions are original schematic educational geometry, not manufacturer CAD or clinically calibrated constructions.

## Changes and protected scope

- `native-godot/chairside-catalog.gd`: one added wax-rim study tool record, two fictional alternative study cards, and `DENTURE_VS_WAX_RIM` lesson with `scenario: "full_denture"`.
- `native-godot/app.gd`: Journey open button, replay button `denture_wax_rim_bench` and one additional lesson ID route.
- `native-godot/composite-inspection-trial.gd`: two distinct model rotations, wrong and correct tool/card selection branches and existing guarded chair, finish, reset and report checks.
- `native-godot/denture-wax-rim-inspection-trial.gd`: dedicated runner extending the existing shared replay.
- `native-godot/build-app.mjs`: copies the runner only. Both original model files are already packaged in the source app; no new downloads or mesh files.
- `tests/denture_wax_rim_bench_contract.test.mjs`: five Node source contracts for scene paths, bilingual case choices, the scenario alias, guided replay, outcome and original tool preservation.

## Acceptance — pending actual Godot execution

On a clean checkout of this draft branch's exact SHA on Windows, run Node 22 source contracts with `node --test tests/denture_wax_rim_bench_contract.test.mjs` and the complete existing test suite. Build the native project using `node native-godot/build-app.mjs --source-dir=<checkout> --output=<empty-folder> --expected-sha=<HEAD>`; import with Godot 4.7.2 (`--headless --editor --import`) and inspect the two distinct 3D study scenes and rotation buttons.

Run `res://denture-wax-rim-inspection-trial.gd` inside a **new disposable isolated user-data profile**, using the existing guarded runner's required work/profile directory. The case report should identify `mode=denture_wax_rim_bench`, `id=complete_denture_vs_wax_rim_recognition_intro`, `scenario=full_denture`, correct IDs `tool.complete_denture_arch` and `material.finished_denture_posterior_key`, wrong/correct selections for both stages, one rejected and corrected chair target with distinct selected/expected IDs, existing 20-point result, finish event `record_finished_denture_vs_wax_rim_review`, `clean_reset=true`, and `learner_journal_unchanged=true`. Also replay the original 20 plus all **three** earlier additional benches to confirm no regression.

**Current limitation:** GitHub Actions runner allocation is still tracked in issue #184. Static contract checks and GitHub source inspection do not establish successful runtime import or gameplay; keep the draft PR unmerged pending owner acceptance.
