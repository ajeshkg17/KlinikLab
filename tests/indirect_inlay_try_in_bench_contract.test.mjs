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
const inlayTrial = get('native-godot/inlay-inspection-trial.gd');
const insert = get('native-godot/assets/bench/synthetic-inlay-insert.tscn');

test('exactly one new inlay bench preserves all nine preceding stable IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY) := \{/gm)||[]).length, 10);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "inlay"/);
});

test('existing two-target inlay chair and topic reference remain unchanged', () => {
  assert.match(drills, /\["inlay", "Indirect inlay try-in"/);
  assert.match(drills, /Matched inlay and prepared model/);
  assert.match(chair, /"inlay": \["crown", "Inlay", \["Seat in the prepared outline", "Check outline landmark"\], "seat"\]/);
  assert.match(chair, /"inlay": "fillings-gold-inlays"/);
  assert.match(catalog, /const ADA_INLAYS := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/fillings-gold-inlays"/);
  assert.match(catalog, /"reference": ADA_INLAYS/);
  assert.match(catalog, /"finish_event": "record_inlay_mock_try_in"/);
  assert.match(catalog, /precise marginal gaps are not measured/);
});

test('synthetic 3D inlay study insert differs from existing mock facial veneer', () => {
  assert.match(catalog, /"choices": \["tool\.inlay_insert", "tool\.veneer_shell"\]/);
  assert.match(catalog, /"expected": "tool\.inlay_insert"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-inlay-insert\.tscn/);
  assert.match(insert, /\[node name="SyntheticIndirectInlayInsert" type="Node3D"\]/);
  assert.match(insert, /IllustrativeInlayCoreNotClinicalCavity/);
  assert.match(insert, /OcclusalTeachingSurface/);
  assert.match(insert, /OutlineLandmarkNotMeasuredMargin/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-inlay-insert\.tscn','assets\/bench\/synthetic-inlay-insert\.tscn'\)/);
  assert.match(bench, /inlay insert are synthetic 3D geometry/);
});

test('case-specific inlay outline card is a fit reference, not a dental material', () => {
  assert.match(catalog, /"label": "study object"/);
  assert.match(catalog, /"label": "fit reference"/);
  assert.match(catalog, /"choices": \["material\.inlay_outline_reference", "material\.veneer_fit_reference"\]/);
  assert.match(catalog, /"expected": "material\.inlay_outline_reference"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record mock inlay seating and outline landmark"/);
  assert.match(catalog, /No clinical marginal adaptation, adhesive cementation or patient outcome was assessed/);
});

test('Journey, build and dedicated replay register inlay without removing older routes', () => {
  for (const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench']
  ]) assert.ok(app.includes('"'+name+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run indirect inlay try-in bench replay", "inlay_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/inlay-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay'\]/);
  assert.match(builder, /'inlay-inspection-trial\.gd'/);
  assert.match(inlayTrial, /await _run_lesson\("inlay"\)/);
});

test('shared replay checks wrong/right IDs, rejected chair target, 20/20, finish, clean reset and journal bytes', () => {
  assert.match(inlayTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_inlay_insert/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_veneer_shell/);
  assert.match(replay, /"tool\.veneer_shell" if lesson_id == "inlay"/);
  assert.match(replay, /"material\.veneer_fit_reference" if lesson_id == "inlay"/);
  assert.match(replay, /KL_BENCH_PICK_tool_veneer_shell" if lesson_id == "inlay"/);
  assert.match(replay, /KL_BENCH_PICK_tool_inlay_insert/);
  assert.match(replay, /KL_BENCH_PICK_material_veneer_fit_reference/);
  assert.match(replay, /material_inlay_outline_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess.get_file_as_bytes\(JOURNAL\)/);
});
