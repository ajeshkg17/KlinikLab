import test from 'node:test';
import assert from 'node:assert/strict';
import { readSourceContract } from './source-contract-text.mjs';

const read = file => readSourceContract('../' + file, import.meta.url);

test('extraction packages precisely identified FDI35/37 originals and SHA-verified 512px textured derivatives', () => {
  const build = read('native-godot/build-app.mjs');
  const decode = read('native-godot/decode-draco-tooth.mjs');
  for (const [fdi, basename, blob] of [
    ['35','mandibular_left_second_premolar','892db94359877442300a6eac7a496dc85cdcaf98'],
    ['37','mandibular_second_molar','947e90e80a7adb1d30f9cd09e84c9eacc8fc03f0'],
  ]) {
    assert.ok(build.includes("fdi:'" + fdi + "',file:'" + basename + "',blob:'" + blob + "'"));
    assert.ok(decode.includes(blob));
  }
  assert.match(build, /originalBlob!==neighbour\.blob/);
  assert.match(build, /--preserve-texture=true/);
  assert.match(build, /trainingTexturePreserved:true,originalTextureSizePx:\[512,512\]/);
  assert.match(build, /'tooth-fdi'\+neighbour\.fdi\+'-neighbour-manifest\.json'/);
  assert.match(build, /dundee-extraction-neighbour\.gd/);
  assert.match(build, /nativeDundeeExtractionNeighbours:neighbourManifests/);
  assert.match(build, /sourceGitSHA:sha,caseId:'extraction'/);
});

test('neighbour runtime refuses unknown FDI, wrong original Git blob, sidecar or texture', () => {
  const loader = read('native-godot/dundee-extraction-neighbour.gd');
  for (const marker of [
    '"35": {','"37": {',
    'manifest_path := "res://source/tooth-fdi%s-neighbour-manifest.json" % fdi',
    'm.get("sourceGitSHA") != source_sha',
    'm.get("originalGitBlobSha") != spec["blob"]',
    'm.get("licenseSPDX") != "CC-BY-4.0"',
    'RAW_RESOLVER.verified_path(raw, original_sha)',
    'RAW_RESOLVER.verified_path(scene_path + ".source", training_sha)',
    'texture.get_width() != 512 or texture.get_height() != 512',
    'mesh.layers = TRAINING_LIGHT_LAYER',
    'mount.position = -bounds.get_center() * factor',
    'mount.scale = Vector3.ONE * factor',
    '"illustrativeChairPlacement": true',
  ]) assert.ok(loader.includes(marker), marker);
  assert.doesNotMatch(loader, /HTTPRequest|OS\.execute|user:\/\//);
});

test('FDI36 extraction retains its original motion but neighbours use source 35 and 37', () => {
  const lab = read('native-godot/procedure-lab.gd');
  assert.match(lab, /tooth = _extraction_molar\(at\) if x == 0\.0 else _extraction_neighbour\(at, "35" if x < 0\.0 else "37"\)/);
  assert.match(lab, /if scenario\["effect"\] == "extract" and absf\(x\) > 0\.5:\n\s+continue/);
  assert.match(lab, /_neighbour_rests\[tooth\] = tooth\.transform/);
  assert.match(lab, /_tooth_model\.reparent\(_world, false\)/);
  assert.match(lab, /_tooth_model\.position = Vector3\(0\.87, 0\.24, 0\.79\)/);
  assert.match(lab, /_tooth_model\.transform = _tooth_rest/);
  assert.match(lab, /_tooth_credit\.text = "FDI 35\/36\/37 Dundee original tooth surfaces\/textures/);
});

test('synthetic gingival collars follow hinged jaw and socket changes visibility only on extraction/restart', () => {
  const lab = read('native-godot/procedure-lab.gd');
  const build = lab.slice(lab.indexOf('func _build_extraction_gingiva() -> void:'), lab.indexOf('func _chair_eye_y() -> float:'));
  for(const marker of [
    'KL_SYNTHETIC_EXTRACTION_GINGIVA_NOT_PATIENT_ANATOMY',
    'KL_SYNTHETIC_FDI36_EXTRACTION_SOCKET',
    'KL_SYNTHETIC_DARK_SOCKET_BOWL',
    'KL_SYNTHETIC_FDI%s_GINGIVAL_MARGIN',
    '_gum_collar_mesh','_gum_socket_mesh',
    '_socket_visual.hide()','gum.reparent(_jaw)',
  ]) assert.ok(build.includes(marker),marker);
  const restart = lab.slice(lab.indexOf('func _restart() -> void:'),lab.indexOf('func _request('));
  const model = lab.slice(lab.indexOf('func _change_model('),lab.indexOf('func _seated_appliance('));
  assert.match(restart, /_socket_visual\.hide\(\)/);
  assert.match(model, /_socket_visual\.show\(\)/);
  assert.doesNotMatch(build, /CollisionShape3D|collision_layer|StaticBody3D/);
});

test('chair replay verifies original texture and both specific neighbours, socket and jaw/reset', () => {
  const trial = read('native-godot/procedure-lab-trial.gd');
  assert.match(trial, /func _extraction_neighbours\(lab: Control\) -> Dictionary:/);
  assert.match(trial, /if not reports\.has\("35"\) or not reports\.has\("37"\):/);
  assert.match(trial, /report\.get\("albedo_px"\) != \[512, 512\]/);
  assert.match(trial, /func _extraction_socket\(lab: Control, exposed: bool\) -> bool:/);
  assert.match(trial, /_extraction_socket\(lab, false\)/);
  assert.match(trial, /_extraction_socket\(lab, true\)/);
  assert.match(trial, /await _record_extraction_socket_detail\(lab\)/);
  assert.match(trial, /neighbour_rests\.size\(\) != 2/);
  assert.match(trial, /neighbour as Node3D\)\.transform = neighbour_rests\[neighbour\]/);
  assert.match(trial, /learner_journal_unchanged/);
  assert.match(trial, /"extraction_neighbours": _extraction_neighbours\(lab\)/);
  assert.match(trial, /"synthetic_socket_exposed": _extraction_socket\(lab, true\)/);
});

test('attribution distinguishes original surfaces from synthetic teaching gum', () => {
  const notice = read('assets/dundee/README.md');
  for(const marker of [
    'FDI 35:', 'FDI 36:', 'FDI 37:',
    'mandibular_left_second_premolar.glb','mandibular_second_molar.glb',
    'synthetic computer-generated teaching geometry','CC BY 4.0',
    'original textures must be **512×512 pixels**'
  ]) assert.ok(notice.includes(marker),marker);
});
