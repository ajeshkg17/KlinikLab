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
const crownTrial = get('native-godot/crown-inspection-trial.gd');
const crownScene = get('native-godot/assets/bench/synthetic-crown-shell.tscn');

test('one additional crown lesson retains all ten preceding stable bench IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN) := \{/gm)||[]).length, 11);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "crown"/);
});

test('existing crown chair scenario, actions, and source reference remain unchanged', () => {
  assert.match(drills, /\["crown", "Crown try-in"/);
  assert.match(drills, /Matched crown, working model and fit record/);
  assert.match(chair, /"crown": \["crown", "Crown", \["Seat on the prepared model", "Check the margin landmark"\], "seat"\]/);
  assert.match(chair, /"crown": "crowns"/);
  assert.match(catalog, /const ADA_CROWNS := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/crowns"/);
  assert.match(catalog, /"reference": ADA_CROWNS/);
  assert.match(catalog, /"finish_event": "record_crown_mock_try_in"/);
  assert.match(catalog, /does not simulate a hollow crown's actual fit/);
});

test('synthetic crown geometry and matching 3D choice cannot claim measured margins', () => {
  assert.match(catalog, /"choices": \["tool\.crown_shell", "tool\.inlay_insert"\]/);
  assert.match(catalog, /"expected": "tool\.crown_shell"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-crown-shell\.tscn/);
  assert.match(crownScene, /\[node name="SyntheticFullCoverageCrown" type="Node3D"\]/);
  assert.match(crownScene, /IllustrativeCervicalCoverageNotHollowClinicalFit/);
  assert.match(crownScene, /OcclusalDome/);
  assert.match(crownScene, /CervicalMarginTeachingMarkerNotGapMeasurement/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-crown-shell\.tscn','assets\/bench\/synthetic-crown-shell\.tscn'\)/);
  assert.match(bench, /crown shell.*synthetic 3D geometry/);
});

test('crown card is a fit reference, not a clinical measurement or material', () => {
  assert.match(catalog, /"label": "study object"/);
  assert.match(catalog, /"label": "fit reference"/);
  assert.match(catalog, /"choices": \["material\.crown_fit_reference", "material\.inlay_outline_reference"\]/);
  assert.match(catalog, /"expected": "material\.crown_fit_reference"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record crown seating and cervical landmark check"/);
  assert.match(catalog, /No clinical fit, margin quality, cementation or patient outcome was assessed/);
});

test('Journey and builder register only the crown addition with independent replay', () => {
  for(const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench']
  ]) assert.ok(app.includes('"'+name+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run crown try-in bench replay", "crown_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/crown-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'crown-inspection-trial\.gd'/);
  assert.match(crownTrial, /await _run_lesson\("crown"\)/);
});

test('shared replay asserts IDs, chair reject, verified 20/20, finish, reset and private journal', () => {
  assert.match(crownTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_crown_shell/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_inlay_insert/);
  assert.match(replay, /"tool\.inlay_insert" if lesson_id == "crown"/);
  assert.match(replay, /"material\.inlay_outline_reference" if lesson_id == "crown"/);
  assert.match(replay, /KL_BENCH_PICK_tool_inlay_insert" if lesson_id == "crown"/);
  assert.match(replay, /KL_BENCH_PICK_tool_crown_shell/);
  assert.match(replay, /KL_BENCH_PICK_material_inlay_outline_reference/);
  assert.match(replay, /material_crown_fit_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
