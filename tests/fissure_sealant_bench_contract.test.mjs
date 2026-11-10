import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const get = path => readSourceContract('../' + path, import.meta.url);
const catalog = get('native-godot/chairside-catalog.gd');
const app = get('native-godot/app.gd');
const build = get('native-godot/build-app.mjs');
const bench = get('native-godot/chairside-bench.gd');
const composite = get('native-godot/composite-inspection-trial.gd');
const sealant = get('native-godot/sealant-inspection-trial.gd');
const drills = get('native-godot/procedure-drills.gd');
const scenarios = get('native-godot/procedure-scenarios.gd');

test('adds exactly one new chairside lesson, retaining the composite lesson and the two original instrument choices', () => {
  assert.match(catalog, /const COMPOSITE := \{/);
  assert.match(catalog, /"scenario": "composite"/);
  assert.match(catalog, /const SEALANT := \{/);
  assert.match(catalog, /"scenario": "sealant"/);
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT) := \{/gm) || []).length, 2);
  assert.match(catalog, /"choices": \["tool\.curing_light", "tool\.ultrasonic_scaler"\]/);
  assert.match(catalog, /"material\.light_cure_sealant"/);
  assert.match(catalog, /"material\.glass_ionomer"/);
  assert.match(catalog, /"expected": "material\.light_cure_sealant"/);
  assert.match(catalog, /"finish_event": "simulate_sealant_cure"/);
});

test('fictional light-cured sealant uses the unchanged chair scenario and original ADA source', () => {
  assert.match(drills, /\["sealant", "Fissure sealant"/);
  assert.match(drills, /https:\/\/www\.ada\.org\/resources\/ada-library\/oral-health-topics\/dental-sealants/);
  assert.match(scenarios, /"sealant": \["crown", "Sealant applicator", \["Coat first fissure", "Coat second fissure"\], "coat"\]/);
  assert.match(catalog, /const ADA_SEALANTS := "https:\/\/www\.ada\.org\/resources\/ada-library\/oral-health-topics\/dental-sealants"/);
  assert.match(catalog, /"reference": ADA_SEALANTS/);
  assert.match(catalog, /"finish": "Confirm simulated light curing of both coated fissures"/);
});

test('Journey exposes composite and only one new sealant entry, both sharing bench code', () => {
  assert.match(app, /const CHAIRSIDE_BENCH := preload\("res:\/\/chairside-bench\.gd"\)/);
  assert.match(app, /const CHAIRSIDE_CATALOG := preload\("res:\/\/chairside-catalog\.gd"\)/);
  assert.match(app, /\["composite", "Open composite restoration bench", "KL_OPEN_COMPOSITE_BENCH"\]/);
  assert.match(app, /\["sealant", "Open fissure sealant bench", "KL_OPEN_SEALANT_BENCH"\]/);
  assert.match(app, /\["Run fissure sealant bench replay", "sealant_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/sealant-inspection-trial\.gd"/);
  assert.match(app, /CHAIRSIDE_CATALOG\.COMPOSITE if lesson_id == "composite" else CHAIRSIDE_CATALOG\.SEALANT/);
  assert.match(app, /_procedure_drills\.start\(index\)/);
  assert.match(app, /bench\.record_practice\(lab\.score, lab\.stage == 3, lab\.events\)/);
});

test('shared bench records selected and expected IDs, preserves score and case-specific finish', () => {
  assert.match(bench, /"selected_id": selected, "expected_id": expected/);
  assert.match(bench, /"chair_attempts": _chair_attempts\.duplicate\(true\)/);
  assert.match(bench, /str\(_lesson\.get\("finish_event", "simulate_cure"\)\)/);
  assert.match(bench, /_lesson\["tool"\]\["expected"\]/);
  assert.match(bench, /_practice_button\.disabled = _score != 2 or _verified/);
  assert.match(bench, /_finish_button\.disabled = not _verified or _completed/);
  assert.match(bench, /"case_reference": _lesson\["reference"\]/);
  assert.match(bench, /var folder := "user:\/\/lesson-results\/" \+ Crypto/);
});

test('replay is isolated and tests wrong/correct picks, rejected chair action, and clean restart', () => {
  assert.match(composite, /if not user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(composite, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
  assert.match(composite, /KL_BENCH_PICK_tool_ultrasonic_scaler/);
  assert.match(composite, /KL_BENCH_PICK_tool_curing_light/);
  assert.match(composite, /KL_BENCH_PICK_material_glass_ionomer/);
  assert.match(composite, /material_light_cure_sealant/);
  assert.match(composite, /if not await _complete\(lab\):/);
  assert.match(composite, /not retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(composite, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(composite, /KL_BENCH_RESET/);
  assert.match(composite, /report\["clean_reset"\] = true/);
  assert.match(sealant, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(sealant, /await _run_lesson\("sealant"\)/);
});

test('the two shared 3D CC0 assets remain pin-verified without adding a model', () => {
  assert.match(build, /'34385','Curing Light \(Dental Practice and Surgery\)\.glb'/);
  assert.match(build, /59c21274e9bed7b1c1239a7a04091685f1eb41dedf4a9acdb4cfdd864cb500f7/);
  assert.match(build, /'34384','Ultrasonic Scaler \(Dental Practice and Surgery\)\.glb'/);
  assert.match(build, /5e83a4f0be8c36c40d77997a6f9dfe0d406f6ea9f427f41079cee405d7354bd1/);
  assert.match(build, /sha256\(bytes\)!==sourceSha256/);
  assert.match(build, /'sealant-inspection-trial\.gd'/);
  assert.match(build, /chairsideLessons:\['composite','sealant'(?:,'[a-z_]+')*\]/);
});
