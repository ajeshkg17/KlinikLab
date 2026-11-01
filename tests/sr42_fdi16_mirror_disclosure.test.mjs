import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('SR42 FDI16 must disclose illustrative FDI26 source and must not claim source-verified right-side anatomy',()=>{
 const app=read('native-godot/app.gd');
 const mirror=read('native-godot/tooth16-mirror-reference.gd');
 const original=read('native-godot/tooth26-reference.gd');
 assert.match(app,/MIRRORED FROM SOURCE FDI 26/);
 assert.match(app,/NOT verified right-side anatomy/);
 assert.match(app,/_case_index == 0/);
 assert.match(app,/_update_fdi16_mirror_visibility/);
 assert.match(mirror,/Vector3\(-0\.72,0\.72,0\.72\)/);
 for(const s of ['"fdi":"16"','"sourceFdi":"26"','"mirroredFromContralateral":true','"exactSideSourceAvailable":false','"anatomicalSideValidated":false','"illustrativeOnly":true','"surfaceOnly":true','"clinicalAccuracyValidated":false'])assert.ok(mirror.includes(s),s);
 assert.match(mirror,/KL_FDI16_MIRRORED_SURFACE_ASSET_MISSING_FALLBACK/);
 assert.match(mirror,/res:\/\/source\/tooth-fdi26-manifest\.json/);
 assert.match(original,/KL_DUNDEE_FDI26_CC_BY_4_SURFACE_REFERENCE/);
});
test('SR42 reuses exact FDI26 source bytes without registering new tooth or altering cut volumes',()=>{
 const b=read('native-godot/build-app.mjs');
 const smoke=read('native-godot/actual-app-smoke.gd');
 assert.match(b,/'tooth16-mirror-reference\.gd'/);
 assert.equal((b.match(/const expectedTooth26Blob=/g)||[]).length,1);
 assert.match(smoke,/FDI16 mirror not loaded with source FDI26/);
 assert.match(smoke,/FDI16 mirror missing-asset fallback not exposed/);
 assert.match(smoke,/FDI16 mirrored reference leaked into another practical/);
 assert.doesNotMatch(read('native-godot/tooth16-mirror-reference.gd'),/_apply_cut\(|_record_practical\(|_direct_cut_world_ray\(/);
});
