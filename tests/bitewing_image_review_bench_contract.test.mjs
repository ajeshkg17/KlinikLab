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
const bitewingTrial = get('native-godot/bitewing-inspection-trial.gd');
const pointer = get('native-godot/assets/bench/synthetic-image-pointer.tscn');

test('one additional bitewing bench retains all six preceding lesson IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING) := \{/gm)||[]).length, 7);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro'
  ]) assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "bitewing"/);
});

test('fictional image-review chair has assigned proximal and unreadable-overlap markers', () => {
  assert.match(drills, /\["bitewing", "Bitewing image review"/);
  assert.match(drills, /https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/x-rays/);
  assert.match(chair, /"bitewing": \["image", "Image pointer", \["Identify proximal surfaces", "Flag overlap"\], "mark"\]/);
  assert.match(catalog, /const ADA_XRAYS := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/x-rays"/);
  assert.match(catalog, /"reference": ADA_XRAYS/);
  assert.match(catalog, /"finish_event": "record_bitewing_image_annotations"/);
  assert.match(catalog, /not a real dental X-ray/);
  assert.match(catalog, /NOT READABLE/);
});

test('synthetic pointer is NOT an imaging device and is compared against prior 3D probe', () => {
  assert.match(catalog, /"choices": \["tool\.image_pointer", "tool\.periodontal_probe"\]/);
  assert.match(catalog, /"expected": "tool\.image_pointer"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-image-pointer\.tscn/);
  assert.match(pointer, /\[node name="SyntheticImageAnnotationPointer" type="Node3D"\]/);
  assert.match(pointer, /RoundedAnnotationTipNotImagingDevice/);
  assert.match(pointer, /MeshInstance3D/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-image-pointer\.tscn','assets\/bench\/synthetic-image-pointer\.tscn'\)/);
  assert.match(bench, /image pointer.*synthetic 3D geometry/);
});

test('assigned image reference versus periodontal site chart is labeled as an image reference', () => {
  assert.match(catalog, /"label": "image reference"/);
  assert.match(catalog, /"choices": \["material\.assigned_bitewing_image", "material\.site_chart"\]/);
  assert.match(catalog, /"expected": "material\.assigned_bitewing_image"/);
  assert.match(bench, /str\(step\.get\("label", "material"\)\)/);
  assert.match(catalog, /"finish": "Record proximal landmark and unreadable overlap"/);
  assert.match(catalog, /No radiograph was taken or interpreted for clinical diagnosis/);
});

test('Journey/build/routing retains six earlier benches and adds just bitewing', () => {
  for (const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'], ['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'], ['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'], ['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench']
  ]) assert.ok(app.includes('"' + name + '", "KL_OPEN_' + id + '_BENCH"'), 'missing ' + id);
  assert.match(app, /\["Run bitewing image review bench replay", "bitewing_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/bitewing-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'bitewing-inspection-trial\.gd'/);
});

test('shared replay checks wrong/correct IDs, chair rejection, 20/20, reset and byte-identical journal', () => {
  assert.match(bitewingTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(bitewingTrial, /await _run_lesson\("bitewing"\)/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_image_pointer/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_periodontal_probe/);
  assert.match(replay, /"tool\.periodontal_probe" if lesson_id in \["bitewing", "oral_exam"\]/);
  assert.match(replay, /"material\.site_chart" if lesson_id in \["bitewing", "oral_exam"(?:, "[a-z_]+")*\]/);
  assert.match(replay, /KL_BENCH_PICK_tool_periodontal_probe" if lesson_id in \["bitewing", "oral_exam"\]/);
  assert.match(replay, /KL_BENCH_PICK_tool_image_pointer/);
  assert.match(replay, /KL_BENCH_PICK_material_site_chart/);
  assert.match(replay, /material_assigned_bitewing_image/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
