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
const mouthguardTrial = get('native-godot/mouthguard-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-sports-mouthguard.tscn');

test('exactly one mouthguard lesson added after eighteen preserved stable IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD) := \{/gm) || []).length, 19);
  for(const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro',
    'complete_denture_mock_arch_fitting_intro','partial_denture_mock_support_fitting_intro',
    'implant_mock_restoration_site_review_intro','endo_mock_chamber_canal_map_review_intro',
    'retreat_mock_prior_current_record_review_intro','aligner_mock_stage04_fit_review_intro',
    'mouthguard_mock_upper_arch_coverage_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "mouthguard"/);
});

test('existing mouthguard chair actions and its ADA topic remain unchanged', () => {
  assert.match(drills, /\["mouthguard", "Custom mouthguard fitting"/);
  assert.match(drills, /Mouthguard and matching upper-arch model/);
  assert.match(chair, /"mouthguard": \["arch", "Mouthguard", \["Seat the matching guard", "Check the coverage landmark"\], "seat"\]/);
  assert.match(chair, /"mouthguard": "mouthguards"/);
  assert.match(catalog, /const ADA_MOUTHGUARDS := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/mouthguards"/);
  assert.match(catalog, /"reference": ADA_MOUTHGUARDS/);
  assert.match(catalog, /"finish_event": "record_mouthguard_mock_coverage_review"/);
  assert.match(catalog, /No impact-protection effectiveness, actual guard fit, occlusion, retention/);
});

test('opaque raised-bumper sports guard differs from translucent clear aligner', () => {
  assert.match(catalog, /"choices": \["tool\.sports_mouthguard_study", "tool\.aligner_stage04_tray"\]/);
  assert.match(catalog, /"expected": "tool\.sports_mouthguard_study"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-sports-mouthguard\.tscn/);
  assert.match(scene, /\[node name="SyntheticUpperArchSportsMouthguard" type="Node3D"\]/);
  assert.equal((scene.match(/^\[node name="IllustrativeOcclusalGuardPad/gm)||[]).length, 10);
  assert.equal((scene.match(/^\[node name="RaisedOuterBumperSegment/gm)||[]).length, 10);
  assert.match(scene, /AssignedPosteriorCoverageMarkerNotProtectionTest/);
  assert.match(scene, /NotImpactCalibrated/);
  assert.match(scene, /NotRetentionMeasured/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-sports-mouthguard\.tscn','assets\/bench\/synthetic-sports-mouthguard\.tscn'\)/);
  assert.match(bench, /sports mouthguard.*synthetic 3D geometry/);
});

test('assigned arch coverage reference is not confused with orthodontic stage plan', () => {
  assert.match(catalog, /"label": "study appliance"/);
  assert.match(catalog, /"label": "coverage reference"/);
  assert.match(catalog, /"choices": \["material\.mouthguard_upper_arch_reference", "material\.assigned_aligner_stage04_plan"\]/);
  assert.match(catalog, /"expected": "material\.mouthguard_upper_arch_reference"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record mock guard seating and assigned arch-coverage landmark"/);
  assert.match(catalog, /No protection, impact performance, retention, clinical fit, occlusal adjustment or patient outcome was assessed/);
});

test('Journey and packed runner add only mouthguard after eighteen earlier benches', () => {
  for(const [id,label] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench'],
    ['FULL_DENTURE','Open complete denture fitting bench'],['PARTIAL_DENTURE','Open removable partial denture fitting bench'],
    ['IMPLANT','Open implant restoration review bench'],['ENDO','Open root canal model review bench'],
    ['RETREAT','Open retreatment record comparison bench'],['ALIGNER','Open clear aligner stage matching bench'],
    ['MOUTHGUARD','Open custom mouthguard fitting bench']
  ]) assert.ok(app.includes('"'+label+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run custom mouthguard fitting bench replay", "mouthguard_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/mouthguard-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat", "aligner", "mouthguard"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture','implant','endo','retreat','aligner','mouthguard'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'mouthguard-inspection-trial\.gd'/);
  assert.match(mouthguardTrial, /await _run_lesson\("mouthguard"\)/);
});

test('shared guarded replay verifies wrong/correct IDs, chair rejection, 20/20, finish, reset and journal bytes', () => {
  assert.match(mouthguardTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat", "aligner", "mouthguard"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_sports_mouthguard_study/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_aligner_stage04_tray/);
  assert.match(replay, /"tool\.aligner_stage04_tray" if lesson_id == "mouthguard"/);
  assert.match(replay, /"material\.assigned_aligner_stage04_plan" if lesson_id == "mouthguard"/);
  assert.match(replay, /KL_BENCH_PICK_tool_aligner_stage04_tray" if lesson_id == "mouthguard"/);
  assert.match(replay, /KL_BENCH_PICK_tool_sports_mouthguard_study/);
  assert.match(replay, /KL_BENCH_PICK_material_assigned_aligner_stage04_plan/);
  assert.match(replay, /material_mouthguard_upper_arch_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess.get_file_as_bytes\(JOURNAL\)/);
});
