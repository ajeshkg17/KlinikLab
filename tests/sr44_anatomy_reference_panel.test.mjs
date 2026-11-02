import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('SR44 anatomy panel clearly separates four provenance categories',()=>{
 const p=read('native-godot/anatomy-reference-panel.gd');
 for(const section of ['External morphology / model provenance','Internal structures / clinical anatomy','Source-supported facts / original practical','Illustrative and synthetic educational content']) assert.ok(p.includes(section),section);
 assert.match(p,/CASE_FDI := \{"molar":"16","endo":"36","anterior":"11","crown":"26","surgery":"48","perio":"46"\}/);
 assert.match(p,/ILLUSTRATIVE EXTERNAL SURFACE/);
 assert.match(p,/NO CLEARED EXTERNAL SURFACE IN NATIVE BUILD/);
 assert.match(p,/SOURCE-VERIFIED EXTERNAL SURFACE/);
 assert.match(p,/Original exported practical task titles/);
 assert.match(p,/No source-verified internal enamel, dentin, pulp, root-canal/);
 assert.match(p,/not calibrated treatment/);
 assert.doesNotMatch(p,/HTTPRequest|OS\.execute|FileAccess\.open|URLRequest/);
});
test('SR44 read-only source panel is displayed in all practical cases and bundled with native app',()=>{
 const app=read('native-godot/app.gd');
 const build=read('native-godot/build-app.mjs');
 const smoke=read('native-godot/actual-app-smoke.gd');
 assert.match(app,/res:\/\/anatomy-reference-panel\.gd/);
 assert.match(app,/ANATOMY REFERENCE — educational provenance, NOT clinical validation/);
 assert.match(app,/var source_tasks: Array = _content\["practical"\]\[_case_index\]/);
 assert.match(app,/panel_script\.call\("sections"/);
 assert.match(build,/'anatomy-reference-panel\.gd'/);
 assert.match(smoke,/SR44_ANATOMY_REFERENCE_FOUR_SECTIONS_SIX_FDI_PASS/);
 assert.match(smoke,/Source case .*FDI /);
});
