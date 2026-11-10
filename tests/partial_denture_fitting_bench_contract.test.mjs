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
const partialTrial = get('native-godot/partial-denture-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-partial-denture.tscn');

test('exactly one added partial-denture lesson preserves the preceding thirteen stable IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE) := \{/gm)||[]).length, 14);
  for (const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro',
    'complete_denture_mock_arch_fitting_intro',
    'partial_denture_mock_support_fitting_intro'
  ]) assert.ok(catalog.includes('"id": "' + id + '"'), 'missing '+id);
  assert.match(catalog, /"scenario": "partial_denture"/);
});

test('pre-existing two-target partial-denture chair and ADA partial-dentures topic are reused', () => {
  assert.match(drills, /\["partial_denture", "Partial denture fitting"/);
  assert.match(drills, /Partial framework and matching tooth-supported model/);
  assert.match(chair, /"partial_denture": \["gap", "Partial denture", \["Seat beside the remaining teeth", "Check the support landmark"\], "seat"\]/);
  assert.match(chair, /"partial_denture": "dentures-partial"/);
  assert.match(catalog, /const ADA_PARTIAL_DENTURES := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/dentures-partial"/);
  assert.match(catalog, /"reference": ADA_PARTIAL_DENTURES/);
  assert.match(catalog, /"finish_event": "record_partial_denture_mock_fitting"/);
  assert.match(catalog, /No insertion path, clasp retention, pressure areas, clinical fit/);
});

test('synthetic partial framework and support markers are visibly distinct from full denture', () => {
  assert.match(catalog, /"choices": \["tool\.partial_denture_framework", "tool\.complete_denture_arch"\]/);
  assert.match(catalog, /"expected": "tool\.partial_denture_framework"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-partial-denture\.tscn/);
  assert.match(scene, /\[node name="SyntheticRemovablePartialDentureFramework" type="Node3D"\]/);
  assert.match(scene, /LeftOpenFrameworkArmNotRetentionCalibrated/);
  assert.match(scene, /RightOpenFrameworkArmNotRetentionCalibrated/);
  assert.match(scene, /LeftIllustrativeClaspLoopNotClinicalContact/);
  assert.match(scene, /RightIllustrativeClaspLoopNotClinicalContact/);
  assert.match(scene, /AssignedSupportLandmarkNotClaspForceMeasurement/);
  assert.equal((scene.match(/^\[node name="IllustrativeReplacementTooth/gm)||[]).length,3);
  assert.equal((scene.match(/^\[node name="PartialReplacementSaddle/gm)||[]).length,3);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-partial-denture\.tscn','assets\/bench\/synthetic-partial-denture\.tscn'\)/);
  assert.match(bench, /removable partial framework.*synthetic 3D geometry/);
});

test('case-specific remaining-teeth support diagram is labeled a support reference, not material', () => {
  assert.match(catalog, /"label": "study object"/);
  assert.match(catalog, /"label": "support reference"/);
  assert.match(catalog, /"choices": \["material\.partial_denture_support_reference", "material\.complete_denture_arch_reference"\]/);
  assert.match(catalog, /"expected": "material\.partial_denture_support_reference"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record simulated partial seating and support landmark"/);
  assert.match(catalog, /No retention, clasp force, support quality, clinical fit or patient outcome was assessed/);
});

test('Journey, build and runner add only partial denture after thirteen prior lesson routes', () => {
  for(const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench'],
    ['FULL_DENTURE','Open complete denture fitting bench'],
    ['PARTIAL_DENTURE','Open removable partial denture fitting bench']
  ]) assert.ok(app.includes('"'+name+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run removable partial denture fitting bench replay", "partial_denture_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/partial-denture-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'partial-denture-inspection-trial\.gd'/);
  assert.match(partialTrial, /await _run_lesson\("partial_denture"\)/);
});

test('shared replay requires rejected/corrected selections, chair 20/20, unique finish, reset and byte-identical journal', () => {
  assert.match(partialTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_partial_denture_framework/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_complete_denture_arch/);
  assert.match(replay, /"tool\.complete_denture_arch" if lesson_id == "partial_denture"/);
  assert.match(replay, /"material\.complete_denture_arch_reference" if lesson_id == "partial_denture"/);
  assert.match(replay, /KL_BENCH_PICK_tool_complete_denture_arch" if lesson_id == "partial_denture"/);
  assert.match(replay, /KL_BENCH_PICK_tool_partial_denture_framework/);
  assert.match(replay, /KL_BENCH_PICK_material_complete_denture_arch_reference/);
  assert.match(replay, /material_partial_denture_support_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});
