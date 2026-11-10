import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const get = path => readSourceContract('../' + path, import.meta.url);
const app = get('native-godot/app.gd');
const build = get('native-godot/build-app.mjs');
const catalog = get('native-godot/chairside-catalog.gd');
const bench = get('native-godot/chairside-bench.gd');
const replay = get('native-godot/composite-inspection-trial.gd');
const cleaningReplay = get('native-godot/cleaning-inspection-trial.gd');
const synthetic = get('native-godot/assets/bench/synthetic-polishing-cup.tscn');
const scenarios = get('native-godot/procedure-scenarios.gd');
const drills = get('native-godot/procedure-drills.gd');

test('one new cleaning lesson retains composite, sealant and fluoride lesson identities', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING) := \{/gm) || []).length, 4);
  for (const id of ['composite_light_cure_intro','fissure_sealant_light_cure_intro','fluoride_varnish_coating_intro','professional_cleaning_polishing_intro'])
    assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "cleaning"/);
});

test('fictional polishing case uses existing chair source and two soft-deposit markers', () => {
  assert.match(scenarios, /"cleaning": \["arch", "Polishing cup", \["Remove left deposit", "Remove right deposit"\], "remove"\]/);
  assert.match(drills, /\["cleaning", "Professional cleaning"/);
  assert.match(scenarios, /"cleaning": "plaque"/);
  assert.match(catalog, /const ADA_PLAQUE := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/plaque"/);
  assert.match(catalog, /"reference": ADA_PLAQUE/);
  assert.match(catalog, /"finish_event": "record_cleaning_polish_markers"/);
  assert.match(catalog, /soft-plaque\/stain deposits/);
});

test('new tool and paste choices are modelled, compared and credibly attributed', () => {
  assert.match(catalog, /"choices": \["tool\.polishing_cup", "tool\.ultrasonic_scaler"\]/);
  assert.match(catalog, /"expected": "tool\.polishing_cup"/);
  assert.match(catalog, /"choices": \["material\.prophylaxis_paste", "material\.fluoride_varnish"\]/);
  assert.match(catalog, /"expected": "material\.prophylaxis_paste"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-polishing-cup\.tscn/);
  assert.match(synthetic, /\[node name="SyntheticPolishingCup" type="Node3D"\]/);
  assert.match(synthetic, /TorusMesh_rim/);
  assert.match(synthetic, /MeshInstance3D/);
  assert.match(build, /copy\('native-godot\/assets\/bench\/synthetic-polishing-cup\.tscn','assets\/bench\/synthetic-polishing-cup\.tscn'\)/);
  assert.match(build, /5e83a4f0be8c36c40d77997a6f9dfe0d406f6ea9f427f41079cee405d7354bd1/);
  assert.match(bench, /polishing cup are synthetic 3D geometry/);
});

test('Journey, builder and procedure router preserve all previous benches', () => {
  for (const [id,title] of [
    ['COMPOSITE','Open composite restoration bench'],
    ['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],
    ['CLEANING','Open professional cleaning bench']
  ]) {
    assert.ok(app.includes('"' + title + '", "KL_OPEN_' + id + '_BENCH"'));
  }
  assert.match(app, /\["Run professional cleaning bench replay", "cleaning_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/cleaning-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning"\]/);
  assert.match(build, /chairsideLessons:\['composite','sealant','fluoride','cleaning'\]/);
  assert.match(build, /'cleaning-inspection-trial\.gd'/);
});

test('shared replay checks incorrect/correct IDs, rejected chair target, completion and restart', () => {
  assert.match(cleaningReplay, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(cleaningReplay, /await _run_lesson\("cleaning"\)/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_polishing_cup/);
  assert.match(replay, /KL_BENCH_PICK_tool_polishing_cup/);
  assert.match(replay, /material_prophylaxis_paste/);
  assert.match(replay, /var wrong_tool := "tool.curing_light" if lesson_id == "fluoride" else "tool.ultrasonic_scaler"/);
  assert.match(replay, /var wrong_material := "material.light_cure_sealant" if lesson_id == "fluoride" else "material.fluoride_varnish" if lesson_id == "cleaning"/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /report\["score"\] = 20/);
});

test('existing guard requires private profile, no upload token and learner journal byte identity', () => {
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
  assert.match(bench, /"selected_id": selected, "expected_id": expected/);
  assert.match(bench, /"chair_attempts": _chair_attempts\.duplicate\(true\)/);
  assert.match(bench, /"source_sha": FileAccess\.get_file_as_string\("res:\/\/source\/expected-sha\.txt"\)/);
});
