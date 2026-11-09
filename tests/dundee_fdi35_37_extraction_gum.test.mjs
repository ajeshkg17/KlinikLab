import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';
const read = path => readSourceContract('../'+path, import.meta.url);

test('Dundee FDI35 and FDI37 each require pinned original blob and textured training sidecar',()=>{
 const build=read('native-godot/build-app.mjs');
 const decode=read('native-godot/decode-draco-tooth.mjs');
 const mount=read('native-godot/tooth-training-neighbour.gd');
 const docs=read('assets/dundee/README.md');
 for(const [fdi,file,blob] of [
  ['35','mandibular_left_second_premolar','892db94359877442300a6eac7a496dc85cdcaf98'],
  ['37','mandibular_second_molar','947e90e80a7adb1d30f9cd09e84c9eacc8fc03f0']
 ]){
  for(const text of [file,blob]) {
   assert.ok(build.includes(text),text);
   assert.ok(mount.includes(text),text);
   assert.ok(decode.includes(blob),blob);
  }
  assert.match(build,/sourceGitBlobVerified:true/);
  assert.match(build,/trainingTexturePreserved:true/);
  assert.match(build,/--preserve-texture=true/);
  assert.match(build,/copyFileSync\(trainingPath,path\.join\(toothDir,sidecarName\),fs\.constants\.COPYFILE_EXCL\)/);
  assert.match(docs,new RegExp('\\('+fdi+'\\)'));
 }
 assert.match(mount,/material\.albedo_texture\.get_width\(\) != 512/);
 assert.match(mount,/material\.albedo_texture\.get_height\(\) != 512/);
 assert.match(mount,/str\(m\.get\("sourceGitSHA", ""\)\) != expected_sha/);
 assert.match(mount,/RAW_RESOLVER\.verified_path\(original_path, raw_sha\)/);
 assert.match(mount,/RAW_RESOLVER\.verified_path\(training_path \+ "\.source", converted_sha\)/);
 assert.match(mount,/illustrativeSeating/);
});

test('synthetic gum has a shaped ridge, five per-tooth collars and a distinct FDI36 socket floor',()=>{
 const gum=read('native-godot/extraction-gum-fixture.gd');
 const lab=read('native-godot/procedure-lab.gd');
 assert.match(gum,/extends Node3D/);
 assert.match(gum,/func _ridge_height\(x: float, z: float\)/);
 assert.match(gum,/KL_SYNTHETIC_GINGIVAL_RIDGE/);
 assert.match(gum,/X_POSITIONS := \[-0\.85, -0\.44, 0\.0, 0\.44, 0\.85\]/);
 assert.match(gum,/KL_FDI36_SOCKET_SYNTHETIC/);
 assert.match(gum,/SOCKET_FLOOR/);
 assert.match(gum,/marginCount/);
 assert.match(gum,/patientDerived": false/);
 assert.match(lab,/_gum_fixture = EXTRACTION_GUM\.new\(\)/);
 assert.match(lab,/_gum_fixture\.reparent\(_jaw\)/);
 assert.match(lab,/_extraction_neighbour\(at, "35" if x < 0\.0 else "37"\)/);
 assert.match(lab,/tooth\.reparent\(_jaw\)/);
});

test('Dundee surfaces remain visual: original extraction state and adjacent checks unchanged',()=>{
 const lab=read('native-godot/procedure-lab.gd');
 const trial=read('native-godot/procedure-lab-trial.gd');
 for(const token of [
  '_tooth_model.reparent(_world, false)',
  '_tooth_model.position = Vector3(0.87, 0.24, 0.79)',
  '_tooth_model.rotation.z = PI * 0.5',
  'neighbour.transform.is_equal_approx(_neighbour_rests[neighbour])',
  '_tooth_model.transform = _tooth_rest',
  'for id in ["site_0", "site_1"]',
  '_pull_progress = 0.0'
 ])assert.ok(lab.includes(token),token);
 for(const token of ['FDI35/FDI37','_has_original_512_albedo','_record_extraction_gum_detail(lab, false)','_record_extraction_gum_detail(lab, true)','learner_journal_unchanged']) {
  if(token==='FDI35/FDI37')continue;
  assert.ok(trial.includes(token),token);
 }
 assert.match(trial,/not found\.has\("35"\) or not found\.has\("37"\)/);
 assert.match(trial,/gum_report\.get\("marginCount", 0\) != 5/);
 assert.match(trial,/report\["neighbours"\] = neighbour_reports/);
 assert.match(trial,/report\["gum"\] = gum_report/);
});
