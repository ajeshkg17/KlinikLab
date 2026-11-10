import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const get = path => readSourceContract('../' + path, import.meta.url);
const catalog = get('native-godot/chairside-catalog.gd');
const app = get('native-godot/app.gd');
const builder = get('native-godot/build-app.mjs');
const chair = get('native-godot/procedure-scenarios.gd');
const drills = get('native-godot/procedure-drills.gd');
const shared = get('native-godot/chairside-bench.gd');
const replay = get('native-godot/composite-inspection-trial.gd');
const rootTrial = get('native-godot/root-planing-inspection-trial.gd');

test('exactly one new lesson adds root planing to four preceding benches', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING) := \{/gm)||[]).length, 5);
  for (const id of ['composite_light_cure_intro', 'fissure_sealant_light_cure_intro',
                    'fluoride_varnish_coating_intro', 'professional_cleaning_polishing_intro',
                    'root_planing_ultrasonic_intro'])
    assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "root_planing"/);
});

test('case is explicitly ultrasonic and its unchanged chair has two root-surface targets and original ADA reference', () => {
  assert.match(drills, /\["root_planing", "Scaling and root planing"/);
  assert.match(chair, /"root_planing": \["roots", "Scaler", \["Clear marked root surface", "Clear second root surface"\], "remove"\]/);
  assert.match(chair, /"root_planing": "scaling-and-root-planing"/);
  assert.match(catalog, /const ADA_ROOT_PLANING := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/scaling-and-root-planing"/);
  assert.match(catalog, /"reference": ADA_ROOT_PLANING/);
  assert.match(catalog, /"finish_event": "record_root_surface_instrumentation"/);
  assert.match(catalog, /no actual periodontal treatment or root smoothing is simulated/);
});

test('instrument and case-consumable comparisons reuse existing 3D models', () => {
  assert.match(catalog, /"choices": \["tool\.ultrasonic_scaler", "tool\.polishing_cup"\]/);
  assert.match(catalog, /"expected": "tool\.ultrasonic_scaler"/);
  assert.match(catalog, /"choices": \["material\.clean_water_coolant", "material\.prophylaxis_paste"\]/);
  assert.match(catalog, /"expected": "material\.clean_water_coolant"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-polishing-cup\.tscn/);
  assert.match(catalog, /res:\/\/assets\/bench\/ultrasonic-scaler\.glb/);
  assert.match(builder, /5e83a4f0be8c36c40d77997a6f9dfe0d406f6ea9f427f41079cee405d7354bd1/);
  assert.match(builder, /sha256\(bytes\)!==sourceSha256/);
  assert.match(catalog, /"swatch": Color\("#bbdfe7"\)/);
});

test('Journey, registry, and scenario routing retain all four older benches', () => {
  for(const [id,name] of [
    ['COMPOSITE', 'Open composite restoration bench'],
    ['SEALANT', 'Open fissure sealant bench'],
    ['FLUORIDE', 'Open fluoride varnish bench'],
    ['CLEANING', 'Open professional cleaning bench'],
    ['ROOT_PLANING', 'Open scaling and root planing bench']
  ])
    assert.ok(app.includes('"' + name + '", "KL_OPEN_' + id + '_BENCH"'));
  assert.match(app, /\["Run scaling and root planing bench replay", "root_planing_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/root-planing-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing'\]/);
  assert.match(builder, /'root-planing-inspection-trial\.gd'/);
});

test('new replay asserts wrong/correct tool and material IDs, chair rejection, finish, score and clean reset', () => {
  assert.match(rootTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(rootTrial, /await _run_lesson\("root_planing"\)/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_ultrasonic_scaler/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_polishing_cup/);
  assert.match(replay, /"tool\.polishing_cup" if lesson_id == "root_planing"/);
  assert.match(replay, /"material\.prophylaxis_paste" if lesson_id == "root_planing"/);
  assert.match(replay, /KL_BENCH_PICK_tool_polishing_cup" if lesson_id == "root_planing"/);
  assert.match(replay, /KL_BENCH_PICK_tool_ultrasonic_scaler/);
  assert.match(replay, /KL_BENCH_PICK_material_prophylaxis_paste/);
  assert.match(replay, /material_clean_water_coolant/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
});

test('private-run profile and learner-journal byte guards remain active', () => {
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
  assert.match(shared, /"selected_id": selected, "expected_id": expected/);
  assert.match(shared, /"chair_attempts": _chair_attempts\.duplicate\(true\)/);
  assert.match(shared, /"source_sha": FileAccess\.get_file_as_string\("res:\/\/source\/expected-sha\.txt"\)/);
});
