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
const bridgeTrial = get('native-godot/bridge-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-bridge-framework.tscn');

test('one added fixed-bridge lesson preserves eleven preceding bench IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE) := \{/gm)||[]).length, 12);
  for(const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "bridge"/);
});

test('existing two-target bridge chair and its source reference remain unchanged', () => {
  assert.match(drills, /\["bridge", "Fixed bridge try-in"/);
  assert.match(drills, /bridge spanning one missing tooth/);
  assert.match(chair, /"bridge": \["gap", "Bridge", \["Seat across the supports", "Check the pontic landmark"\], "seat"\]/);
  assert.match(chair, /"bridge": "bridges"/);
  assert.match(catalog, /const ADA_BRIDGES := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/bridges"/);
  assert.match(catalog, /"reference": ADA_BRIDGES/);
  assert.match(catalog, /"finish_event": "record_bridge_mock_try_in"/);
  assert.match(catalog, /not clinical cementation, abutment preparation, fit measurement/);
});

test('schematic three-unit bridge is distinguished from a single synthetic crown', () => {
  assert.match(catalog, /"choices": \["tool\.bridge_framework", "tool\.crown_shell"\]/);
  assert.match(catalog, /"expected": "tool\.bridge_framework"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-bridge-framework\.tscn/);
  assert.match(scene, /\[node name="SyntheticThreeUnitFixedBridge" type="Node3D"\]/);
  assert.match(scene, /LeftAbutmentStudyShell/);
  assert.match(scene, /RightAbutmentStudyShell/);
  assert.match(scene, /PonticNotTissueContactMeasurement/);
  assert.match(scene, /PonticTeachingMarkerNotFitMeasurement/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-bridge-framework\.tscn','assets\/bench\/synthetic-bridge-framework\.tscn'\)/);
  assert.match(bench, /bridge framework are synthetic 3D geometry/);
});

test('case-specific support/pontic card is labeled a fit reference, not a material', () => {
  assert.match(catalog, /"label": "study object"/);
  assert.match(catalog, /"label": "fit reference"/);
  assert.match(catalog, /"choices": \["material\.bridge_support_reference", "material\.crown_fit_reference"\]/);
  assert.match(catalog, /"expected": "material\.bridge_support_reference"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record mock bridge seating and pontic landmark"/);
  assert.match(catalog, /No clinical fit, cementation, implant loading or patient outcome was assessed/);
});

test('Journey, build and dedicated runner add only bridge while preserving previous routes', () => {
  for (const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench']
  ]) assert.ok(app.includes('"'+name+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run fixed bridge try-in bench replay", "bridge_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/bridge-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge'\]/);
  assert.match(builder, /'bridge-inspection-trial\.gd'/);
  assert.match(bridgeTrial, /await _run_lesson\("bridge"\)/);
});

test('guarded replay includes wrong/right IDs, rejected target, chair score 20, clean restart and journal integrity', () => {
  assert.match(bridgeTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_bridge_framework/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_crown_shell/);
  assert.match(replay, /"tool\.crown_shell" if lesson_id == "bridge"/);
  assert.match(replay, /"material\.crown_fit_reference" if lesson_id == "bridge"/);
  assert.match(replay, /KL_BENCH_PICK_tool_crown_shell" if lesson_id == "bridge"/);
  assert.match(replay, /KL_BENCH_PICK_tool_bridge_framework/);
  assert.match(replay, /KL_BENCH_PICK_material_crown_fit_reference/);
  assert.match(replay, /material_bridge_support_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess.get_file_as_bytes\(JOURNAL\)/);
});
