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
const implantTrial = get('native-godot/implant-inspection-trial.gd');
const scene = get('native-godot/assets/bench/synthetic-implant-crown.tscn');

test('one new implant review lesson preserves fourteen preceding bench identities', () => {
  assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT) := \{/gm)||[]).length, 15);
  for(const id of [
    'composite_light_cure_intro','fissure_sealant_light_cure_intro',
    'fluoride_varnish_coating_intro','professional_cleaning_polishing_intro',
    'root_planing_ultrasonic_intro','periodontal_charting_site_record_intro',
    'bitewing_image_annotation_intro','oral_soft_tissue_observation_intro',
    'veneer_mock_try_in_intro','inlay_mock_indirect_try_in_intro',
    'crown_mock_full_coverage_try_in_intro','bridge_mock_three_unit_try_in_intro',
    'complete_denture_mock_arch_fitting_intro','partial_denture_mock_support_fitting_intro',
    'implant_mock_restoration_site_review_intro'
  ]) assert.ok(catalog.includes('"id": "'+id+'"'), 'missing '+id);
  assert.match(catalog, /"scenario": "implant"/);
});

test('existing implant chair, its two target names and topic source stay unchanged', () => {
  assert.match(drills, /\["implant", "Implant restoration review"/);
  assert.match(drills, /Matching implant restoration and implant model/);
  assert.match(chair, /"implant": \["implant", "Implant restoration", \["Match the restoration to the site", "Check the interface landmark"\], "seat"\]/);
  assert.match(chair, /"implant": "implants"/);
  assert.match(catalog, /const ADA_IMPLANTS := "https:\/\/www\.mouthhealthy\.org\/all-topics-a-z\/implants"/);
  assert.match(catalog, /"reference": ADA_IMPLANTS/);
  assert.match(catalog, /"finish_event": "record_implant_mock_site_review"/);
  assert.match(catalog, /not implant surgery, torque selection, clinical abutment fitting/);
});

test('synthetic 3D implant-crown model is distinct from the tooth-supported crown shell', () => {
  assert.match(catalog, /"choices": \["tool\.implant_crown_study", "tool\.crown_shell"\]/);
  assert.match(catalog, /"expected": "tool\.implant_crown_study"/);
  assert.match(catalog, /res:\/\/assets\/bench\/synthetic-implant-crown\.tscn/);
  assert.match(scene, /\[node name="SyntheticImplantCrownStudyAssembly" type="Node3D"\]/);
  assert.match(scene, /IllustrativeImplantSupportNotClinicalThreadOrSurgicalGuide/);
  assert.match(scene, /SchematicAbutmentNeckNotCalibratedConnection/);
  assert.match(scene, /IllustrativeCrownNoOcclusalOrFitMeasurement/);
  assert.match(scene, /ImplantInterfaceTeachingMarkerNotTorqueMeasurement/);
  assert.match(builder, /copy\('native-godot\/assets\/bench\/synthetic-implant-crown\.tscn','assets\/bench\/synthetic-implant-crown\.tscn'\)/);
  assert.match(bench, /implant-crown assembly.*synthetic 3D geometry/);
});

test('fictional site-reference selection does not claim implant measurement or clinical fit', () => {
  assert.match(catalog, /"label": "study object"/);
  assert.match(catalog, /"label": "site reference"/);
  assert.match(catalog, /"choices": \["material\.implant_site_interface_reference", "material\.crown_fit_reference"\]/);
  assert.match(catalog, /"expected": "material\.implant_site_interface_reference"/);
  assert.match(bench, /step\.get\("label", "instrument"\)/);
  assert.match(bench, /step\.get\("label", "material"\)/);
  assert.match(catalog, /"finish": "Record simulated implant-site match and interface landmark"/);
  assert.match(catalog, /No implant-system compatibility, screw torque, osseointegration, loading, clinical fit or patient outcome was assessed/);
});

test('Journey, packaged assets and dedicated runner add only implant and preserve earlier routes', () => {
  for (const [id,name] of [
    ['COMPOSITE','Open composite restoration bench'],['SEALANT','Open fissure sealant bench'],
    ['FLUORIDE','Open fluoride varnish bench'],['CLEANING','Open professional cleaning bench'],
    ['ROOT_PLANING','Open scaling and root planing bench'],['CHART','Open periodontal charting bench'],
    ['BITEWING','Open bitewing image review bench'],['ORAL_EXAM','Open oral soft-tissue screening bench'],
    ['VENEER','Open veneer try-in bench'],['INLAY','Open indirect inlay try-in bench'],
    ['CROWN','Open crown try-in bench'],['BRIDGE','Open fixed bridge try-in bench'],
    ['FULL_DENTURE','Open complete denture fitting bench'],
    ['PARTIAL_DENTURE','Open removable partial denture fitting bench'],
    ['IMPLANT','Open implant restoration review bench']
  ]) assert.ok(app.includes('"'+name+'", "KL_OPEN_'+id+'_BENCH"'), 'missing '+id);
  assert.match(app, /\["Run implant restoration review bench replay", "implant_bench"\]/);
  assert.match(app, /trial_script = "res:\/\/implant-inspection-trial\.gd"/);
  assert.match(app, /scenario not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant"(?:, "[a-z_]+")*\]/);
  assert.match(builder, /chairsideLessons:\['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture','implant'(?:,'[a-z_]+')*\]/);
  assert.match(builder, /'implant-inspection-trial\.gd'/);
  assert.match(implantTrial, /await _run_lesson\("implant"\)/);
});

test('shared replay asserts rejected and corrected choices, chair 20/20, finish, reset and journal bytes', () => {
  assert.match(implantTrial, /extends "res:\/\/composite-inspection-trial\.gd"/);
  assert.match(replay, /if lesson_id not in \["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay", "crown", "bridge", "full_denture", "partial_denture", "implant"(?:, "[a-z_]+")*\]:/);
  assert.match(replay, /KL_BENCH_ROTATE_LEFT_tool_implant_crown_study/);
  assert.match(replay, /KL_BENCH_ROTATE_RIGHT_tool_crown_shell/);
  assert.match(replay, /"tool\.crown_shell" if lesson_id == "implant"/);
  assert.match(replay, /"material\.crown_fit_reference" if lesson_id == "implant"/);
  assert.match(replay, /KL_BENCH_PICK_tool_crown_shell" if lesson_id == "implant"/);
  assert.match(replay, /KL_BENCH_PICK_tool_implant_crown_study/);
  assert.match(replay, /KL_BENCH_PICK_material_crown_fit_reference/);
  assert.match(replay, /material_implant_site_interface_reference/);
  assert.match(replay, /int\(report\["chair_attempts"\]\[0\]\["score"\]\) != 20/);
  assert.match(replay, /retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\) != config\[kind\]\["expected"\]/);
  assert.match(replay, /str\(retries\["chair"\]\["selected_id"\]\) == str\(retries\["chair"\]\["expected_id"\]\)/);
  assert.match(replay, /event\["event"\] == config\["finish_event"\]/);
  assert.match(replay, /report\["clean_reset"\] = true/);
  assert.match(replay, /user_data\.begins_with\(profile\) or OS\.has_environment\("KLINIKLAB_GITHUB_TOKEN"\)/);
  assert.match(replay, /journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess.get_file_as_bytes\(JOURNAL\)/);
});
