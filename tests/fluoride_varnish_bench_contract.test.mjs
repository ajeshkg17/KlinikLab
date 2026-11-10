import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const get = path => readSourceContract('../' + path, import.meta.url);
const app = get('native-godot/app.gd');
const build = get('native-godot/build-app.mjs');
const catalog = get('native-godot/chairside-catalog.gd');
const bench = get('native-godot/chairside-bench.gd');
const sharedTrial = get('native-godot/composite-inspection-trial.gd');
const newTrial = get('native-godot/fluoride-inspection-trial.gd');
const syntheticModel = get('native-godot/assets/bench/synthetic-varnish-applicator.tscn');
const scenarios = get('native-godot/procedure-scenarios.gd');
const drills = get('native-godot/procedure-drills.gd');

test('one additional fluoride lesson; composite and sealant are still defined', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE) := \{/gm)||[]).length, 3);
  assert.match(catalog, /"id": "composite_light_cure_intro"/);
  assert.match(catalog, /"id": "fissure_sealant_light_cure_intro"/);
  assert.match(catalog, /"id": "fluoride_varnish_coating_intro"/);
  assert.match(catalog, /"scenario": "fluoride"/);
});

test('uses the existing two-target fluoride chair and its exact ADA reference', () => {
  assert.match(scenarios, /"fluoride": \["arch", "Varnish brush", \["Coat left training surface", "Coat right training surface"\], "coat"\]/);
  assert.match(drills, /\["fluoride", "Fluoride varnish"/);
  assert.match(scenarios, /"fluoride": "fluoride"/);
  assert.match(catalog, /const ADA_FLUORIDE := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/fluoride"/);
  assert.match(catalog, /"reference": ADA_FLUORIDE/);
  assert.match(catalog, /"finish_event": "record_fluoride_varnish_coating"/);
  assert.doesNotMatch(catalog.split('const FLUORIDE := {')[1] || '', /"simulate_cure"/);
});

test('3D comparison distinguishes original CC0 curing light and synthetic brush', () => {
  assert.match(catalog, /"choices": \["tool\.varnish_brush", "tool\.curing_light"\]/);
  assert.match(catalog, /"expected": "tool\.varnish_brush"/);
  assert.match(catalog, /"choices": \["material\.fluoride_varnish", "material\.light_cure_sealant"\]/);
  assert.match(catalog, /"expected": "material\.fluoride_varnish"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-varnish-applicator\.tscn/);
  assert.match(syntheticModel, /\[node name="SyntheticFluorideVarnishApplicator" type="Node3D"\]/);
  assert.match(syntheticModel, /MeshInstance3D/);
  assert.match(build, /copy\('native-godot\/assets\/bench\/synthetic-varnish-applicator\.tscn','assets\/bench\/synthetic-varnish-applicator\.tscn'\)/);
  assert.match(build, /59c21274e9bed7b1c1239a7a04091685f1eb41dedf4a9acdb4cfdd864cb500f7/);
  assert.match(bench, /varnish applicator is synthetic 3D geometry/);
});

test('Journey keeps old lessons/replays and dispatches new fluoride scenario', () => {
  assert.match(app, /\["composite", "Open composite restoration bench", "KL_OPEN_COMPOSITE_BENCH"\]/);
  assert.match(app, /\["sealant", "Open fissure sealant bench", "KL_OPEN_SEALANT_BENCH"\]/);
  assert.match(app, /\["fluoride", "Open fluoride varnish bench", "KL_OPEN_FLUORIDE_BENCH"\]/);
  assert.match(app, /\["Run fluoride varnish bench replay", "fluoride_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/fluoride-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride"\]/);
  assert.match(build, /chairsideLessons:\['composite','sealant','fluoride'\]/);
  assert.match(build, /'fluoride-inspection-trial\.gd'/);
});

test('replay enforces wrong/correct choices, chair rejection, specific finish, reset', () => {
  assert.match(newTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(newTrial, /await _run_lesson\("fluoride"\)/);
  assert.match(sharedTrial, /if lesson_id not in \["composite", "sealant", "fluoride"\]:/);
  assert.match(sharedTrial, /KL_BENCH_ROTATE_LEFT_tool_varnish_brush/);
  assert.match(sharedTrial, /KL_BENCH_PICK_tool_varnish_brush/);
  assert.match(sharedTrial, /material_fluoride_varnish/);
  assert.match(sharedTrial, /var wrong_tool := "tool.curing_light"/);
  assert.match(sharedTrial, /var wrong_material := "material.light_cure_sealant"/);
  assert.match(sharedTrial, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(sharedTrial, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(sharedTrial, /event\["event"\] == config\["finish_event"\]/);
  assert.match(sharedTrial, /KL_BENCH_RESET/);
  assert.match(sharedTrial, /report\["clean_reset"\] = true/);
});

test('trial requires isolated user data and byte-identical learner journal', () => {
  assert.match(sharedTrial, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(sharedTrial, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
  assert.match(bench, /"selected_id": selected, "expected_id": expected/);
  assert.match(bench, /"source_sha": FileAccess\.get_file_as_string\("res:\/\/source\/expected-sha\.txt"\)/);
  assert.match(bench, /"chair_attempts": _chair_attempts\.duplicate\(true\)/);
});
