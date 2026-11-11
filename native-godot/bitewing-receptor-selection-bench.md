# Bitewing Receptor Holder and Image-Reference Bench

This is **one additional fictional chairside lesson**, stacked on draft PR #203. It uses two **already-authored 3D inventory study models** and reuses the original `bitewing` image review chair simulation. The original 20 chair scenarios and previous 21 bench lessons are preserved; this adds one new lesson (22 total), not a new X-ray acquisition, patient image, radiography exposure or 21st procedure scenario.

## Fictional assignment and tool selection

An instructor supplies a generic **bitewing holder study fixture** and two diagram regions: a proximal reference and a deliberately overlapping/unreadable reference. The learner rotates and compares:

- **Bitewing receptor holder** (expected): `tool.bitewing_receptor_holder_study` / `res://assets/inventory/synthetic-bitewing-receptor-holder.tscn`, a schematic holder with illustrated biteblock.
- **Endodontic receptor holder** (distractor): `tool.endo_receptor_holder_study` / `res://assets/inventory/synthetic-endo-radiograph-holder.tscn`, a different study pattern intended to represent an endodontic receptor fixture.

The second choice is labelled **assigned image location key**, not a clinical material. Select `material.bitewing_receptor_reference_key` rather than `material.endodontic_apical_reference_key`. Both swatches are fictional diagrams, not patient charts or actual radiographs.

## Playable route

**Journey → Open bitewing receptor selection bench** (`KL_OPEN_BITEWING_HOLDER_BENCH`) → rotate the two 3D fixtures → select the wrong holder and correct it → select the wrong endodontic card and correct it → **Start chair practice** → the unchanged existing `bitewing` chair records `Identify proximal surfaces` and `Flag overlap` on a synthetic diagram → verify 20/20 → finish **Record bitewing model-holder selection and two image-region labels** using `record_bitewing_holder_and_image_reference` → save isolated report → restart with no retained choices.

These are **recognition and diagram-labelling actions**, not clinical receptor positioning, sensor exposure, beam alignment, angulation, protection, X-ray interpretation or patient-level caries diagnosis. No learning claim depends on the schematic holder geometry being dimensionally accurate. The source reference for general educational context is https://www.mouthhealthy.org/all-topics-a-z/x-rays.

## Integration and tests

- `native-godot/chairside-catalog.gd`: four extra bilingual case-choice records and one new `BITEWING_HOLDER` lesson with `scenario: "bitewing"`.
- `native-godot/app.gd`: Journey bench and replay buttons, one new lesson route, and the existing scenario-bound practice call.
- `native-godot/composite-inspection-trial.gd`: new lesson ID/rotations, exact wrong/correct choice IDs and the previously generalized check against `config["scenario"]` to support reused chairs.
- `native-godot/bitewing-holder-inspection-trial.gd`: dedicated runner extending the shared replay.
- `native-godot/build-app.mjs`: copies runner; both 3D scenes already ship through the inventory model pack.
- `tests/bitewing_holder_bench_contract.test.mjs`: five source-contract checks covering case, model asset integrity, choice IDs, native route, wrong/correct picks, chair rejection, finish event, journal invariance and clean restart.
- Earlier inventory and all-benches regression contracts now **scope their original invariants to the original 19 tool keys and 20 lesson constants** rather than treating later add-on lessons as errors. Original IDs are explicitly enumerated in `tests/source-contract-text.mjs`.

## Owner acceptance — pending

On Windows, perform a **clean checkout** at this draft branch's exact SHA. Run Node 22 tests (`node --test tests/bitewing_holder_bench_contract.test.mjs tests/all_bench_catalog_integration_contract.test.mjs` and the full existing test suite), and build a fresh Godot 4.7.2 output using `node native-godot/build-app.mjs --source-dir=<checkout> --output=<new-folder> --expected-sha=<HEAD>`. Import it using Godot `--headless --editor --import`, and then inspect both rotating study models in Journey. Run `res://bitewing-holder-inspection-trial.gd` under a freshly isolated disposable Godot user-data profile (matching the trial folder's `profile` directory). The shared replay checks and refuses use of a non-isolated profile.

For acceptance, examine `result.json`: `mode=bitewing_holder_bench`, `id=bitewing_receptor_holder_reference_intro`, `scenario=bitewing`, `selection_score=2`, `score=20`, `completed=true`, `finish_event=record_bitewing_holder_and_image_reference`, `clean_reset=true`, `learner_journal_unchanged=true`. Verify the timeline contains a rejected and accepted tool choice, rejected and accepted key choice, a rejected chair target with distinct selected/expected IDs, both correct charted image regions, and the case-specific completion event. Then replay all 21 preceding benches and verify no journal/progress changes.

**No native Godot or Node execution has been performed in this PR.** GitHub Actions runner allocation remains blocked under issue #184. Keep this PR and all parent PRs draft/unmerged until owner-side runtime and visual QA succeeds.