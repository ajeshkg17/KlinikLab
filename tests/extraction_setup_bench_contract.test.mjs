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
const extractionTrial = get('native-godot/extraction-bench-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-training-forceps.tscn');

test('exactly one new extraction setup lesson completes the twenty-scenario catalog without dropping nineteen earlier IDs', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm) || []).length, 20);
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
    'mouthguard_mock_upper_arch_coverage_intro','extraction_mock_tool_site_check_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "extraction"/);
  assert.equal((drills.match(/^\s*\["[a-z_]+",/gm) || []).length, 20);
});

test('original extraction chair, tooth and adjacent model actions, and existing topic mapping are unchanged', () => {
  assert.match(drills, /\["extraction", "Extraction simulation setup"/);
  assert.match(drills, /Model tooth identification and the assigned extraction tray/);
  assert.match(chair, /"extraction": \["arch", "Training forceps", \["Release the assigned tooth", "Check both adjacent teeth"\], "extract"\]/);
  assert.match(chair, /"extraction": "extractions"/);
  assert.match(catalog, /const ADA_EXTRACTIONS := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/extractions"/);
  assert.match(catalog, /"reference": ADA_EXTRACTIONS/);
  assert.match(catalog, /"finish_event": "record_extraction_mock_setup_review"/);
  assert.match(catalog, /does not establish a real tooth identity, clinical consent, local anaesthesia/);
});

test('new 3D training forceps explicitly blunt and nonclinical; prior periodontal probe unchanged', () => {
  assert.match(catalog, /"choices": \["tool\.training_forceps_study", "tool\.periodontal_probe"\]/);
  assert.match(catalog, /"expected": "tool\.training_forceps_study"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-training-forceps\.tscn/);
  assert.match(scene, /\[node name="SyntheticBluntTrainingForcepsNotClinicalInstrument" type="Node3D"\]/);
  assert.match(scene, /LeftOversizedPracticeHandle/);
  assert.match(scene, /RightOversizedPracticeHandle/);
  assert.match(scene, /TrainingPivotNotTorqueCalibrated/);
  assert.match(scene, /LeftRoundedModelJawNotDentalGrippingSurface/);
  assert.match(scene, /RightRoundedModelJawNotDentalGrippingSurface/);
  assert.match(scene, /TeachingOnlyModelInstrumentFlag/);
  assert.equal((scene.match(/^\[sub_resource /gm) || []).length, 7);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-training-forceps\.tscn','assets\/bench\/synthetic-training-forceps\.tscn'\)/);
  assert.match(bench, /blunt training forceps are synthetic 3D geometry/);
});

test('matching fictional target-tooth-and-neighbour checklist is not a clinical chart', () => {
  assert.match(catalog, /"label": "study instrument"/);
  assert.match(catalog, /"label": "site checklist"/);
  assert.match(catalog, /"choices": \["material\.assigned_extraction_tooth_and_adjacent_record", "material\.site_chart"\]/);
  assert.match(catalog, /"expected": "material\.assigned_extraction_tooth_and_adjacent_record"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record fictional assigned-tooth and adjacent-model checks"/);
  assert.match(catalog, /No real extraction, tooth identity verification, clinical safety, anatomical measurement, patient treatment or outcome was assessed/);
});

test('Journey, builder and dedicated runner add extraction after nineteen earlier lesson routes', () => {
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
    ['MOUTHGUARD','Open custom mouthguard fitting bench'],['EXTRACTION','Open extraction simulation setup bench']
  ]) assert.ok(app.includes('"'+label+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run extraction simulation setup bench replay", "extraction_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/extraction-bench-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat", "aligner", "mouthguard", "extraction"\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture','implant','endo','retreat','aligner','mouthguard','extraction'\]/);
  assert.match(builder, /'extraction-bench-inspection-trial\.gd'/);
  assert.match(extractionTrial, /await _run_lesson\("extraction"\)/);
});

test('shared guarded replay verifies rejected and corrected IDs, chair /20, finish, clean restart and journal bytes', () => {
  assert.match(extractionTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant", "endo", "retreat", "aligner", "mouthguard", "extraction"\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_training_forceps_study/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_periodontal_probe/);
  assert.match(replay, /"tool\.periodontal_probe" if lesson_id == "extraction"/);
  assert.match(replay, /"material\.site_chart" if lesson_id == "extraction"/);
  assert.match(replay, /KL_BENCH_PICK_tool_periodontal_probe" if lesson_id == "extraction"/);
  assert.match(replay, /KL_BENCH_PICK_tool_training_forceps_study/);
  assert.match(replay, /KL_BENCH_PICK_material_site_chart/);
  assert.match(replay, /material_assigned_extraction_tooth_and_adjacent_record/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess.get_file_as_bytes\(JOURNAL\)/);
});
