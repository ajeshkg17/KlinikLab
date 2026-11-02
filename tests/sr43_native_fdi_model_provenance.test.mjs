import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('SR43 learner-facing practical labels distinguish verified, illustrative and unavailable/licence-blocked models',()=>{
 const app=read('native-godot/app.gd');
 const registry=read('native-godot/fdi-reference-clearance.gd');
 const smoke=read('native-godot/actual-app-smoke.gd');
 assert.match(app,/MODEL STATUS: SOURCE-VERIFIED SURFACE REFERENCE — FDI 26/);
 assert.match(app,/MODEL STATUS: SOURCE-VERIFIED SURFACE REFERENCE — FDI 36/);
 assert.match(app,/MODEL STATUS: ILLUSTRATIVE ONLY — FDI 16/);
 assert.match(app,/MIRRORED FROM SOURCE FDI 26/);
 assert.match(app,/NOT source-verified right-side anatomy/);
 assert.match(app,/in \["16", "11", "48", "46"\]/);
 assert.match(registry,/MODEL STATUS: UNAVAILABLE \/ LICENCE REVIEW BLOCKED/);
 for(const fdi of ['11','48','46']) {
  assert.match(registry,new RegExp('"'+fdi+'":'));
  assert.match(registry,/CC BY-NC-SA \(per source listing\)/);
  assert.match(registry,/NonCommercial\/ShareAlike redistribution review pending/);
 }
 assert.match(registry,/"16":\{"caseId":"molar"/);
 assert.match(registry,/DTU \/ 3Shape — 3Shape FDI 16 Meshes from Intraoral Scans/);
 assert.match(registry,/CC BY-NC-SA 4\.0/);
 assert.match(registry,/not bundled/);
 assert.match(smoke,/clearance_cases := \{"16":"molar","11":"anterior","48":"surgery","46":"perio"\}/);
 assert.match(smoke,/MODEL STATUS: UNAVAILABLE \/ LICENCE REVIEW BLOCKED/);
 assert.match(smoke,/FDI %s exact-side candidate/);
});
test('SR43 verified labels do not imply calibrated internal anatomy or editable cutting volume',()=>{
 const app=read('native-godot/app.gd');
 for(const fdi of ['26','36']) {
  assert.match(app,new RegExp('SOURCE-VERIFIED SURFACE REFERENCE — FDI '+fdi));
 }
 assert.match(app,/not clinically validated crown-preparation geometry or internal anatomy/);
 assert.match(app,/not validated internal tissue\/canal anatomy/);
 assert.match(app,/Synthetic working volume remains separate/);
 assert.match(app,/Editable synthetic working volume remains separate/);
});
test('SR43 clearance helper is included in exact standalone build and no unlicensed model is bundled',()=>{
 const build=read('native-godot/build-app.mjs');
 assert.match(build,/'fdi-reference-clearance\.gd'/);
 assert.match(build,/nativeDundeeFDI36License:'CC-BY-4\.0'/);
 assert.match(build,/nativeDundeeFDI26License:'CC-BY-4\.0'/);
 assert.doesNotMatch(build,/dente-11a|dente-48a|dente-46c|3Shape_FDI_16_Meshes/);
});
