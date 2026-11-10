import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const get = path => readSourceContract('../' + path, import.meta.url);
const catalog = get('native-godot/chairside-catalog.gd');
const app = get('native-godot/app.gd');
const builder = get('native-godot/build-app.mjs');
const bench = get('native-godot/chairside-bench.gd');
const chair = get('native-godot/procedure-scenarios.gd');
const drills = get('native-godot/procedure-drills.gd');
const replay = get('native-godot/composite-inspection-trial.gd');
const chartTrial = get('native-godot/chart-inspection-trial.gd');
const probe = get('native-godot/assets/bench/synthetic-periodontal-probe.tscn');

test('exactly one additional chart lesson retains all five earlier bench identities', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART) := \{/gm) || []).length, 6);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro'
  ]) assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "chart"/);
});

test('chair source, two location-only actions, and uncalibrated case are preserved', () => {
  assert.match(drills, /\["chart", "Periodontal charting"/);
  assert.match(chair, /"chart": \["arch", "Probe", \["Record left site", "Record right site"\], "mark"\]/);
  assert.match(chair, /"chart": "periodontics"/);
  assert.match(catalog, /const ADA_CHART := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/periodontics"/);
  assert.match(catalog, /"reference": ADA_CHART/);
  assert.match(catalog, /"finish_event": "record_periodontal_sites"/);
  assert.match(catalog, /does NOT generate pocket depths/);
  assert.match(catalog, /No actual pocket depth, clinical finding/);
});

test('new synthetic 3D probe is distinguished from original source-pinned scaler', () => {
  assert.match(catalog, /"choices": \["tool\.periodontal_probe", "tool\.ultrasonic_scaler"\]/);
  assert.match(catalog, /"expected": "tool\.periodontal_probe"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-periodontal-probe\.tscn/);
  assert.match(probe, /\[node name="SyntheticPeriodontalProbe" type="Node3D"\]/);
  assert.match(probe, /IllustrativeTipNotCalibrated/);
  assert.match(probe, /BluntTip/);
  assert.match(probe, /MarkerBandA/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-periodontal-probe\.tscn','assets\/bench\/synthetic-periodontal-probe\.tscn'\)/);
  assert.match(builder, /5e83a4f0be8c36c40d77997a6f9dfe0d406f6ea9f427f41079cee405d7354bd1/);
  assert.match(builder, /sha256\(bytes\)!==sourceSha256/);
});

test('record choice is a site chart vs a shade guide, not mislabeled as material', () => {
  assert.match(catalog, /"label": "site record"/);
  assert.match(catalog, /"choices": \["material\.site_chart", "material\.shade_guide"\]/);
  assert.match(catalog, /"expected": "material\.site_chart"/);
  assert.match(catalog, /"finish": "Confirm both simulated periodontal site records"/);
  assert.match(bench, /str\(step\.get\("label", "material"\)\)/);
  assert.match(bench, /periodontal probe are synthetic 3D geometry/);
  assert.match(bench, /"selected_id": selected, "expected_id": expected/);
});

test('Journey, builder and guarded replay add only chart and retain previous routes', () => {
  for (const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'], ['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'], ['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'], ['CHART','Open periodontal charting bench']
  ]) assert.ok(app.includes('"' + name + '", "KL_OPEN_' + id + '_BENCH"'), 'missing ' + id);
  assert.match(app, /\["Run periodontal charting bench replay", "chart_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/chart-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart'\]/);
  assert.match(builder, /'chart-inspection-trial\.gd'/);
  assert.match(chartTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(chartTrial, /await _run_lesson\("chart"\)/);
});

test('shared replay enforces wrong/right IDs, chair rejection, 20/20, reset and journal identity', () => {
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_periodontal_probe/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_ultrasonic_scaler/);
  assert.match(replay, /"material\.shade_guide" if lesson_id == "chart"/);
  assert.match(replay, /KL_BENCH_PICK_tool_periodontal_probe/);
  assert.match(replay, /KL_BENCH_PICK_material_shade_guide/);
  assert.match(replay, /material_site_chart/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
