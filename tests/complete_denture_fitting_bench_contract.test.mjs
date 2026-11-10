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
const dentureTrial = get('native-godot/full-denture-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-complete-denture.tscn');

test('one new complete denture lesson retains twelve preceding stable bench IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE) := \{/gm)||[]).length, 13);
  for(const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro',
    'complete_denture_mock_arch_fitting_intro'
  ]) assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "full_denture"/);
});

test('unchanged two-target denture chair and original ADA denture topic', () => {
  assert.match(drills, /\["full_denture", "Complete denture fitting"/);
  assert.match(drills, /complete removable denture/);
  assert.match(chair, /"full_denture": \["soft", "Complete denture", \["Seat the complete arch", "Check the posterior landmark"\], "seat"\]/);
  assert.match(catalog, /const ADA_DENTURES := "https:\/\/www\.ada\.org\/resources\/ada-library\/oral-health-topics\/dentures"/);
  assert.match(catalog, /"reference": ADA_DENTURES/);
  assert.match(catalog, /"finish_event": "record_complete_denture_mock_fitting"/);
  assert.match(catalog, /cannot measure fit, retention, stability, pressure areas, occlusion/);
});

test('original schematic U-shaped 3D arch compared against fixed bridge', () => {
  assert.match(catalog, /"choices": \["tool\.complete_denture_arch", "tool\.bridge_framework"\]/);
  assert.match(catalog, /"expected": "tool\.complete_denture_arch"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-complete-denture\.tscn/);
  assert.match(scene, /\[node name="SyntheticCompleteRemovableDentureArch" type="Node3D"\]/);
  assert.match(scene, /GumArchSegment1/);
  assert.match(scene, /GumArchSegment10/);
  assert.match(scene, /IllustrativeTooth10/);
  assert.match(scene, /PosteriorLandmarkNotPressureAreaOrFitMeasurement/);
  assert.equal((scene.match(/^\[node name="GumArchSegment/gm)||[]).length,10);
  assert.equal((scene.match(/^\[node name="IllustrativeTooth/gm)||[]).length,10);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-complete-denture\.tscn','assets\/bench\/synthetic-complete-denture\.tscn'\)/);
  assert.match(bench, /complete denture arch are synthetic 3D geometry/);
});

test('full arch reference is labeled as an arch record, not dental material', () => {
  assert.match(catalog, /"label": "study object"/);
  assert.match(catalog, /"label": "arch reference"/);
  assert.match(catalog, /"choices": \["material\.complete_denture_arch_reference", "material\.bridge_support_reference"\]/);
  assert.match(catalog, /"expected": "material\.complete_denture_arch_reference"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record simulated full-arch seating and posterior landmark"/);
  assert.match(catalog, /No retention, pressure-area, occlusal, clinical-fit or patient outcome was assessed/);
});

test('Journey, builder and standalone runner retain twelve earlier routes', () => {
  for (const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench'],
    ['FULL_DENTURE','Open complete denture fitting bench']
  ]) assert.ok(app.includes('"'+name+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run complete denture fitting bench replay", "full_denture_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/full-denture-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture'\]/);
  assert.match(builder, /'full-denture-inspection-trial\.gd'/);
  assert.match(dentureTrial, /await _run_lesson\("full_denture"\)/);
});

test('shared replay retains rejected/corrected IDs, /20 chair, restart and journal guard', () => {
  assert.match(dentureTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_complete_denture_arch/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_bridge_framework/);
  assert.match(replay, /"tool\.bridge_framework" if lesson_id == "full_denture"/);
  assert.match(replay, /"material\.bridge_support_reference" if lesson_id == "full_denture"/);
  assert.match(replay, /KL_BENCH_PICK_tool_bridge_framework" if lesson_id == "full_denture"/);
  assert.match(replay, /KL_BENCH_PICK_tool_complete_denture_arch/);
  assert.match(replay, /KL_BENCH_PICK_material_bridge_support_reference/);
  assert.match(replay, /material_complete_denture_arch_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
