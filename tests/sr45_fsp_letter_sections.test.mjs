import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('SR45 browser Arztbrief four sections map precisely to native structured FSP inputs',()=>{
 const browser=read('app.js');
 const app=read('native-godot/app.gd');
 for(const id of ['anamnese','befund','diagnose','therapie']) {
  assert.match(browser,new RegExp('id="d-'+id+'"'));
  assert.match(app,new RegExp('"'+id+'"'));
 }
 for(const label of ['Anamnese und Leitsymptom','Untersuchungsbefund','Verdachts-/Differenzialdiagnose','Therapie / weiteres Vorgehen'])assert.ok(app.includes(label),label);
 assert.match(app,/KL_FSP_LETTER_/);
 assert.match(app,/Existing single-field draft retained in first section/);
 assert.match(app,/No automatic validated FSP\/KP grading/);
});
test('SR45 letter autosaves before switching case/station/view and remains local, report-compatible, resettable',()=>{
 const app=read('native-godot/app.gd');
 assert.match(app,/func _save_draft\(\) -> void:/);
 assert.match(app,/letterSectionsByCase/);
 assert.match(app,/notes"\] as Dictionary\)\[_writing_key\]/);
 assert.match(app,/sections\)\.substr\(0,10000\)/);
 assert.match(app,/func _select_case\(index: int\) -> void:[\s\S]{0,130}_save_draft\(\)/);
 assert.match(app,/func _select_station\(index: int\) -> void:[\s\S]{0,130}_save_draft\(\)/);
 assert.match(app,/func _clear_page\(\) -> void:\n\t_save_quiz_recall\(\)\n\t_language_save_draft\(\)\n\t_save_draft\(\)/);
 assert.match(app,/_progress\["letterSectionsByCase"\] = \{\}/);
 const smoke=read('native-godot/actual-app-smoke.gd');
 assert.match(smoke,/SR45_FSP_FOUR_SECTION_LETTER_SIX_CASES_PASS/);
 assert.match(smoke,/Existing legacy Arztbrief draft/);
 assert.match(smoke,/case_i in range\(6\)/);
});
