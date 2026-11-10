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
const alignerTrial = get('native-godot/aligner-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-aligner-stage04.tscn');

test('one additional stage-04 aligner bench preserves all seventeen previous stable lesson IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER) := \{/gm) || []).length, 18);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro',
    'complete_denture_mock_arch_fitting_intro','partial_denture_mock_support_fitting_intro',
    'implant_mock_restoration_site_review_intro','endo_mock_chamber_canal_map_review_intro',
    'retreat_mock_prior_current_record_review_intro','aligner_mock_stage04_fit_review_intro'
  ]) assert.ok(catalog.includes('"id": "' + id + '"'), 'missing ' + id);
  assert.match(catalog, /"scenario": "aligner"/);
});

test('pre-existing two-action aligner chair and AAO source remain untouched', () => {
  assert.match(drills, /const AAO := "https:\/\/aaoinfo\.org\/treatments\/aligners\/"/);
  assert.match(drills, /\["aligner", "Clear aligner fitting"/);
  assert.match(drills, /Assigned aligner stage and matching arch model/);
  assert.match(chair, /"aligner": \["arch", "Numbered aligner", \["Seat the assigned stage", "Check the seating landmark"\], "seat"\]/);
  assert.match(catalog, /const AAO_ALIGNERS := "https:\/\/aaoinfo\.org\/treatments\/aligners\/"/);
  assert.match(catalog, /"reference": AAO_ALIGNERS/);
  assert.match(catalog, /"finish_event": "record_aligner_mock_stage04_review"/);
  assert.match(catalog, /No clinical fit, aligner force, attachment engagement, tooth movement, wear schedule/);
});

test('original synthetic stage-04 tray differs from complete denture with visible stage markers', () => {
  assert.match(catalog, /"choices": \["tool\.aligner_stage04_tray", "tool\.complete_denture_arch"\]/);
  assert.match(catalog, /"expected": "tool\.aligner_stage04_tray"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-aligner-stage04\.tscn/);
  assert.match(scene, /\[node name="SyntheticStage04AlignerTeachingTray" type="Node3D"\]/);
  assert.equal((scene.match(/^\[node name="TranslucentArchCell/gm) || []).length, 10);
  assert.equal((scene.match(/^\[node name="Stage04IdentifierBar/gm) || []).length, 4);
  assert.match(scene, /NotCalibratedPolymerShell/);
  assert.match(scene, /transparency = 1/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-aligner-stage04\.tscn','assets\/bench\/synthetic-aligner-stage04\.tscn'\)/);
  assert.match(bench, /clear aligner stage-04 tray.*synthetic 3D geometry/);
});

test('matching stage reference is an assigned fictional diagram rather than clinical material', () => {
  assert.match(catalog, /"label": "study appliance"/);
  assert.match(catalog, /"label": "stage reference"/);
  assert.match(catalog, /"choices": \["material\.assigned_aligner_stage04_plan", "material\.complete_denture_arch_reference"\]/);
  assert.match(catalog, /"expected": "material\.assigned_aligner_stage04_plan"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record assigned aligner stage and model seating landmark"/);
  assert.match(catalog, /No orthodontic biomechanics, fit measurement, tooth movement, treatment planning or patient outcome was assessed/);
});

test('Journey, build and independent runner add only aligner and preserve all earlier routes', () => {
  for(const [id,label] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench'],
    ['FULL_DENTURE','Open complete denture fitting bench'],['PARTIAL_DENTURE','Open removable partial denture fitting bench'],
    ['IMPLANT','Open implant restoration review bench'],['ENDO','Open root canal model review bench'],
    ['RETREAT','Open retreatment record comparison bench'],['ALIGNER','Open clear aligner stage matching bench']
  ]) assert.ok(app.includes('"'+label+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run clear aligner stage matching bench replay", "aligner_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/aligner-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat", "aligner"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture','implant','endo','retreat','aligner'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'aligner-inspection-trial\.gd'/);
  assert.match(alignerTrial, /await _run_lesson\("aligner"\)/);
});

test('shared replay asserts wrong/right IDs, rejected chair target, 20/20, finish, reset and journal bytes', () => {
  assert.match(alignerTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat", "aligner"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_aligner_stage04_tray/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_complete_denture_arch/);
  assert.match(replay, /"tool\.complete_denture_arch" if lesson_id == "aligner"/);
  assert.match(replay, /"material\.complete_denture_arch_reference" if lesson_id == "aligner"/);
  assert.match(replay, /KL_BENCH_PICK_tool_complete_denture_arch" if lesson_id == "aligner"/);
  assert.match(replay, /KL_BENCH_PICK_tool_aligner_stage04_tray/);
  assert.match(replay, /KL_BENCH_PICK_material_complete_denture_arch_reference/);
  assert.match(replay, /material_assigned_aligner_stage04_plan/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess.get_file_as_bytes\(JOURNAL\)/);
});
