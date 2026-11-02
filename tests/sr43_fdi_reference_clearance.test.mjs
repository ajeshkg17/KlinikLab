import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const candidates=[
 {fdi:'11',caseId:'anterior',id:'63be208b66214c5d9afb647bdaa8a81e'},
 {fdi:'48',caseId:'surgery',id:'6ab34e265b73467a94be29b3887a1c64'},
 {fdi:'46',caseId:'perio',id:'79ea3b60a12441c3acb11b204bc21bea'}];
test('SR43 exact-side candidates disclose license and prevent unverified asset import',()=>{
 const registry=read('native-godot/fdi-reference-clearance.gd');
 for(const c of candidates){
  assert.match(registry,new RegExp('"'+c.fdi+'":\\{"caseId":"'+c.caseId+'"'));
  assert.ok(registry.includes(c.id));
 }
 assert.equal((registry.match(/"status":"not-cleared"/g)||[]).length,3);
 assert.equal((registry.match(/"license":"CC BY-NC-SA \(per source listing\)"/g)||[]).length,3);
 assert.match(registry,/NonCommercial\/ShareAlike redistribution review pending/);
 assert.match(registry,/no imported mesh/);
 assert.match(registry,/NOT clinically validated/);
 assert.doesNotMatch(registry,/load\(|FileAccess\.open\(|HTTPRequest|OS\.execute/);
});
test('SR43 native practical displays clearance without modifying source browser or cutter',()=>{
 const app=read('native-godot/app.gd');
 const build=read('native-godot/build-app.mjs');
 const smoke=read('native-godot/actual-app-smoke.gd');
 assert.match(app,/FDI\[_case_index\] in \["16", "11", "48", "46"\]/);
 assert.match(app,/res:\/\/fdi-reference-clearance\.gd/);
 assert.match(app,/_page\.add_child\(_heading\(disclosure, 13\)\)/);
 assert.match(build,/'fdi-reference-clearance\.gd'/);
 assert.match(smoke,/SR43_FDI_REFERENCE_CLEARANCE_DISCLOSURE_PASS/);
});
