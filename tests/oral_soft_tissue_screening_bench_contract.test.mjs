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
const oralTrial = get('native-godot/oral-exam-inspection-trial.gd');
const mirror = get('native-godot/assets/bench/synthetic-examination-mirror.tscn');

test('exactly one additional oral-exam bench keeps all seven older lesson identities', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM) := \{/gm)||[]).length, 8);
  for (const id of [
    'composite_light_cure_intro', 'fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro', 'professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro', 'periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro', 'oral_soft_tissue_observation_intro'
  ]) assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "oral_exam"/);
});

test('fictional soft-tissue scenario preserves two model-only annotation actions and original chair citation', () => {
  assert.match(drills, /\["oral_exam", "Oral soft-tissue screening"/);
  assert.match(drills, /Soft-tissue chart and examination mirror/);
  assert.match(chair, /"oral_exam": \["soft", "Examination mirror", \["Locate simulated finding", "Record location"\], "mark"\]/);
  assert.match(chair, /"oral_exam": "oral-cancer"/);
  assert.match(catalog, /const ADA_ORAL_CANCER := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/oral-cancer"/);
  assert.match(catalog, /"reference": ADA_ORAL_CANCER/);
  assert.match(catalog, /"finish_event": "record_soft_tissue_observation"/);
  assert.match(catalog, /not an oral cancer diagnosis/);
  assert.match(catalog, /no lesion classification, risk assessment, palpation, biopsy or patient screening is performed/);
});

test('new schematic 3D mouth mirror is distinguished from periodontal probe', () => {
  assert.match(catalog, /"choices": \["tool\.examination_mirror", "tool\.periodontal_probe"\]/);
  assert.match(catalog, /"expected": "tool\.examination_mirror"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-examination-mirror\.tscn/);
  assert.match(mirror, /\[node name="SyntheticExaminationMirror" type="Node3D"\]/);
  assert.match(mirror, /IllustrativeReflectiveDiscNotClinicalDevice/);
  assert.match(mirror, /MirrorRim/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-examination-mirror\.tscn','assets\/bench\/synthetic-examination-mirror\.tscn'\)/);
  assert.match(bench, /examination mirror.*synthetic 3D geometry/);
  assert.match(catalog, /not a diagnostic sensor/);
});

test('observation record choice is labelled as a record and not dental material', () => {
  assert.match(catalog, /"label": "observation record"/);
  assert.match(catalog, /"choices": \["material\.soft_tissue_location_record", "material\.site_chart"\]/);
  assert.match(catalog, /"expected": "material\.soft_tissue_location_record"/);
  assert.match(bench, /str\(step\.get\("label", "material"\)\)/);
  assert.match(catalog, /"finish": "Record model finding and location for review"/);
  assert.match(catalog, /not oral-cancer findings, clinical screening results or patient data/);
});

test('Journey and build list eight lessons, with new independent oral-exam replay', () => {
  for (const [id, name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench']
  ]) assert.ok(app.includes('"' + name + '", "KL_OPEN_' + id + '_BENCH"'), 'missing ' + id);
  assert.match(app, /\["Run oral soft-tissue screening bench replay", "oral_exam_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/oral-exam-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'oral-exam-inspection-trial\.gd'/);
  assert.match(oralTrial, /await _run_lesson\("oral_exam"\)/);
});

test('shared replay checks rejected and corrected IDs, verified chair, clean reset and journal bytes', () => {
  assert.match(oralTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_examination_mirror/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_periodontal_probe/);
  assert.match(replay, /"tool\.periodontal_probe" if lesson_id in \["bitewing", "oral_exam"\]/);
  assert.match(replay, /"material\.site_chart" if lesson_id in \["bitewing", "oral_exam"(?:, "[a-z_]+")*\]/);
  assert.match(replay, /KL_BENCH_PICK_tool_periodontal_probe" if lesson_id in \["bitewing", "oral_exam"\]/);
  assert.match(replay, /KL_BENCH_PICK_tool_examination_mirror/);
  assert.match(replay, /material_soft_tissue_location_record/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
