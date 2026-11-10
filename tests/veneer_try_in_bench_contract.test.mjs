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
const veneerTrial = get('native-godot/veneer-inspection-trial.gd');
const shell = get('native-godot/assets/bench/synthetic-veneer-shell.tscn');

test('exactly one new veneer lesson preserves eight pre-existing bench IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER) := \{/gm)||[]).length, 9);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro'
  ]) assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "veneer"/);
});

test('mock veneer fit and incisal landmark use unchanged two-target chair and exact ADA topic', () => {
  assert.match(drills, /\["veneer", "Veneer try-in"/);
  assert.match(drills, /mock laboratory veneer is ready for a fit-and-appearance review/);
  assert.match(chair, /"veneer": \["anterior", "Veneer", \["Seat facial shell", "Check incisal landmark"\], "seat"\]/);
  assert.match(chair, /"veneer": "veneers"/);
  assert.match(catalog, /const ADA_VENEERS := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/veneers"/);
  assert.match(catalog, /"reference": ADA_VENEERS/);
  assert.match(catalog, /"finish_event": "record_veneer_mock_try_in"/);
  assert.match(catalog, /not a cementation, preparation, colour matching, marginal-fit measurement/);
});

test('clearly synthetic 3D veneer object is compared with the original study mirror', () => {
  assert.match(catalog, /"choices": \["tool\.veneer_shell", "tool\.examination_mirror"\]/);
  assert.match(catalog, /"expected": "tool\.veneer_shell"/);
  assert.match(catalog, /"label": "study object"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-veneer-shell\.tscn/);
  assert.match(shell, /\[node name="SyntheticFacialVeneerShell" type="Node3D"\]/);
  assert.match(shell, /IllustrativeFacialSilhouette/);
  assert.match(shell, /UncalibratedBacking/);
  assert.match(shell, /IncisalTeachingMarkerNotAMarginMeasurement/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-veneer-shell\.tscn','assets\/bench\/synthetic-veneer-shell\.tscn'\)/);
  assert.match(bench, /veneer shell.*synthetic 3D geometry/);
});

test('case-specific matched veneer fit card is correctly labeled a reference, not material', () => {
  assert.match(catalog, /"label": "fit reference"/);
  assert.match(catalog, /"choices": \["material\.veneer_fit_reference", "material\.site_chart"\]/);
  assert.match(catalog, /"expected": "material\.veneer_fit_reference"/);
  assert.match(bench, /str\(step\.get\("label", "material"\)\)/);
  assert.match(catalog, /"finish": "Record mock veneer seating and incisal alignment check"/);
  assert.match(catalog, /No adhesive bonding, measured margin, clinical fit or real patient outcome is claimed/);
});

test('Journey and build register one veneer bench while preserving all eight earlier routes', () => {
  for (const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench']
  ]) assert.ok(app.includes('"' + name + '", "KL_OPEN_' + id + '_BENCH"'), 'missing ' + id);
  assert.match(app, /\["Run veneer try-in bench replay", "veneer_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/veneer-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'veneer-inspection-trial\.gd'/);
  assert.match(veneerTrial, /await _run_lesson\("veneer"\)/);
});

test('shared replay enforces wrong/right IDs, chair rejection, 20/20 verification, finish, reset and private journal', () => {
  assert.match(veneerTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_veneer_shell/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_examination_mirror/);
  assert.match(replay, /"tool\.examination_mirror" if lesson_id == "veneer"/);
  assert.match(replay, /"material\.site_chart" if lesson_id in \["bitewing", "oral_exam", "veneer"\]/);
  assert.match(replay, /KL_BENCH_PICK_tool_examination_mirror" if lesson_id == "veneer"/);
  assert.match(replay, /KL_BENCH_PICK_tool_veneer_shell/);
  assert.match(replay, /material_veneer_fit_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
