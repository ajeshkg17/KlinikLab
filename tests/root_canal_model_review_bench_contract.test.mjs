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
const endoTrial = get('native-godot/endo-inspection-trial.gd');
const stylus = get('native-godot/assets/bench/synthetic-canal-tracing-stylus.tscn');

test('one added root-canal map bench preserves fifteen earlier stable lesson IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO) := \{/gm)||[]).length,16);
  for(const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro',
    'complete_denture_mock_arch_fitting_intro','partial_denture_mock_support_fitting_intro',
    'implant_mock_restoration_site_review_intro',
    'endo_mock_chamber_canal_map_review_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "endo"/);
});

test('unchanged two-target canal map chair uses existing AAE source', () => {
  assert.match(drills, /const AAE := "https:\/\/www\.aae\.org\/patients\/root-canal-treatment\/"/);
  assert.match(drills, /\["endo", "Root canal model review"/);
  assert.match(drills, /Assigned canal diagram and endodontic training tray/);
  assert.match(chair, /"endo": \["canal", "Canal tracing instrument", \["Trace the chamber", "Trace the assigned canal"\], "mark"\]/);
  assert.match(catalog, /const AAE_ROOT_CANAL := "https:\/\/www\.aae\.org\/patients\/root-canal-treatment\/"/);
  assert.match(catalog, /"reference": AAE_ROOT_CANAL/);
  assert.match(catalog, /"finish_event": "record_endo_mock_canal_map_review"/);
  assert.match(catalog, /not root canal therapy, working-length determination, anatomical identification/);
});

test('schematic 3D pointer clearly differs from an actual canal file and image pointer', () => {
  assert.match(catalog, /"choices": \["tool\.canal_tracing_stylus", "tool\.image_pointer"\]/);
  assert.match(catalog, /"expected": "tool\.canal_tracing_stylus"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-canal-tracing-stylus\.tscn/);
  assert.match(stylus, /\[node name="SyntheticCanalDiagramTracingStylus" type="Node3D"\]/);
  assert.match(stylus, /WideTeachingShaftNotEndodonticFile/);
  assert.match(stylus, /RoundedDiagramMarkerNotCanalInsertionTip/);
  assert.match(stylus, /AssignedCanalMapIdentificationBand/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-canal-tracing-stylus\.tscn','assets\/bench\/synthetic-canal-tracing-stylus\.tscn'\)/);
  assert.match(bench, /canal tracing stylus are synthetic 3D geometry/);
});

test('assigned canal-map reference is not a clinical file or patient X-ray', () => {
  assert.match(catalog, /"label": "study pointer"/);
  assert.match(catalog, /"label": "canal reference"/);
  assert.match(catalog, /"choices": \["material\.assigned_canal_diagram", "material\.assigned_bitewing_image"\]/);
  assert.match(catalog, /"expected": "material\.assigned_canal_diagram"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record fictional chamber and canal map tracing"/);
  assert.match(catalog, /No real root anatomy, treatment, canal preparation, working length, diagnosis or patient outcome was assessed/);
});

test('Journey, packaging and dedicated replay add only endo after earlier fifteen lessons', () => {
  for(const [id,label] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench'],
    ['FULL_DENTURE','Open complete denture fitting bench'],
    ['PARTIAL_DENTURE','Open removable partial denture fitting bench'],
    ['IMPLANT','Open implant restoration review bench'],
    ['ENDO','Open root canal model review bench']
  ]) assert.ok(app.includes('"'+label+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run root canal model review bench replay", "endo_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/endo-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture','implant','endo'\]/);
  assert.match(builder, /'endo-inspection-trial\.gd'/);
  assert.match(endoTrial, /await _run_lesson\("endo"\)/);
});

test('shared replay requires wrong/right IDs, rejected chair, 20/20, finish, reset and isolated journal', () => {
  assert.match(endoTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_canal_tracing_stylus/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_image_pointer/);
  assert.match(replay, /"tool\.image_pointer" if lesson_id == "endo"/);
  assert.match(replay, /"material\.assigned_bitewing_image" if lesson_id == "endo"/);
  assert.match(replay, /KL_BENCH_PICK_tool_image_pointer" if lesson_id == "endo"/);
  assert.match(replay, /KL_BENCH_PICK_tool_canal_tracing_stylus/);
  assert.match(replay, /KL_BENCH_PICK_material_assigned_bitewing_image/);
  assert.match(replay, /material_assigned_canal_diagram/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
