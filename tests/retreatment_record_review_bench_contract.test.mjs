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
const retreatTrial = get('native-godot/retreat-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-record-comparison-pointer.tscn');

test('one additional retreatment record bench retains sixteen earlier lesson IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT) := \{/gm)||[]).length,17);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro',
    'complete_denture_mock_arch_fitting_intro','partial_denture_mock_support_fitting_intro',
    'implant_mock_restoration_site_review_intro','endo_mock_chamber_canal_map_review_intro',
    'retreat_mock_prior_current_record_review_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "retreat"/);
});

test('unchanged prior/current comparison chair uses the existing AAE retreatment link', () => {
  assert.match(drills, /const RETREAT := "https:\/\/www\.aae\.org\/patients\/root-canal-treatment\/endodontic-treatment-options\/endodontic-retreatment\/"/);
  assert.match(drills, /\["retreat", "Endodontic retreatment review"/);
  assert.match(drills, /Prior treatment images and the assigned retreatment case/);
  assert.match(chair, /"retreat": \["comparison", "Image pointer", \["Mark prior model reference", "Flag current discrepancy"\], "mark"\]/);
  assert.match(catalog, /const AAE_RETREATMENT := "https:\/\/www\.aae\.org\/patients\/root-canal-treatment\/endodontic-treatment-options\/endodontic-retreatment\/"/);
  assert.match(catalog, /"reference": AAE_RETREATMENT/);
  assert.match(catalog, /"finish_event": "record_retreat_mock_record_comparison"/);
  assert.match(catalog, /does not determine treatment failure, pathology, healing, retreatment indications/);
});

test('original 3D two-panel pointer is explicitly non-diagnostic', () => {
  assert.match(catalog, /"choices": \["tool\.record_comparison_pointer", "tool\.canal_tracing_stylus"\]/);
  assert.match(catalog, /"expected": "tool\.record_comparison_pointer"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-record-comparison-pointer\.tscn/);
  assert.match(scene, /\[node name="SyntheticPriorCurrentRecordComparisonPointer" type="Node3D"\]/);
  assert.match(scene, /WideDiagramOnlyHandleNotDentalInstrument/);
  assert.match(scene, /TwoPanelComparisonBarNotPatientImaging/);
  assert.match(scene, /PriorPanelTeachingMarkerNotDiagnosis/);
  assert.match(scene, /CurrentPanelTeachingMarkerNotDiagnosis/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-record-comparison-pointer\.tscn','assets\/bench\/synthetic-record-comparison-pointer\.tscn'\)/);
  assert.match(bench, /record comparison pointer are synthetic 3D geometry/);
});

test('assigned prior/current record differs from one synthetic canal map', () => {
  assert.match(catalog, /"label": "study pointer"/);
  assert.match(catalog, /"label": "record reference"/);
  assert.match(catalog, /"choices": \["material\.assigned_prior_current_record", "material\.assigned_canal_diagram"\]/);
  assert.match(catalog, /"expected": "material\.assigned_prior_current_record"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record fictional prior landmark and current discrepancy"/);
  assert.match(catalog, /No radiographic diagnosis, pathology, retreatment decision, clinical result or patient outcome was assessed/);
});

test('Journey and build add only retreat after all sixteen prior routes', () => {
  for (const [id,label] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench'],
    ['FULL_DENTURE','Open complete denture fitting bench'],
    ['PARTIAL_DENTURE','Open removable partial denture fitting bench'],
    ['IMPLANT','Open implant restoration review bench'],
    ['ENDO','Open root canal model review bench'],
    ['RETREAT','Open retreatment record comparison bench']
  ]) assert.ok(app.includes('"'+label+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run retreatment record comparison bench replay", "retreat_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/retreat-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture','implant','endo','retreat'\]/);
  assert.match(builder, /'retreat-inspection-trial\.gd'/);
  assert.match(retreatTrial, /await _run_lesson\("retreat"\)/);
});

test('guarded replay checks wrong/right IDs, rejected target, /20, finish, reset and isolated journal', () => {
  assert.match(retreatTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_record_comparison_pointer/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_canal_tracing_stylus/);
  assert.match(replay, /"tool\.canal_tracing_stylus" if lesson_id == "retreat"/);
  assert.match(replay, /"material\.assigned_canal_diagram" if lesson_id == "retreat"/);
  assert.match(replay, /KL_BENCH_PICK_tool_canal_tracing_stylus" if lesson_id == "retreat"/);
  assert.match(replay, /KL_BENCH_PICK_tool_record_comparison_pointer/);
  assert.match(replay, /KL_BENCH_PICK_material_assigned_canal_diagram/);
  assert.match(replay, /material_assigned_prior_current_record/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess.get_file_as_bytes\(JOURNAL\)/);
});
