import test from 'node:test';
import assert from 'node:assert/strict';
import { readSourceContract } from './source-contract-text.mjs';
import fs from 'node:fs';
const read = path => readSourceContract('../'+path, import.meta.url);
test('SR46 native KP written plan matches browser diagnosis, two alternatives and follow-up',()=>{
 const browser=read('app.js'),app=read('native-godot/app.gd');
 for(const key of ['diagnosis','planA','planB','followup']){
  assert.ok(browser.includes('id="p-'+key+'"'),key);
  assert.ok(app.includes('"'+key+'"'),key);
 }
 for(const name of ['Arbeitsdiagnose und erforderliche Zusatzbefunde','Behandlungsplan A — Zahnerhalt / bevorzugte Option','Behandlungsplan B — Alternative','Aufklärung, Einwilligung, Nachsorge'])assert.ok(app.includes(name),name);
 assert.match(app,/KL_KP_PLAN_/);
 assert.match(app,/Existing one-field KP plan retained under diagnosis/);
 assert.match(app,/planSectionsByCase/);
 assert.match(app,/Sample plans are illustrative, not treatment advice/);
});
test('SR46 KP plan drafts are local and saved across case and station transitions, report and reset',()=>{
 const app=read('native-godot/app.gd'),smoke=read('native-godot/actual-app-smoke.gd');
 assert.match(app,/func _select_case\(index: int\) -> void:[\s\S]{0,220}_save_draft\(\)/);
 assert.match(app,/func _select_station\(index: int\) -> void:[\s\S]{0,140}_save_draft\(\)/);
 assert.match(app,/func _clear_page\(\) -> void:\n\t_language_save_draft\(\)\n\t_save_draft\(\)\n\t_save_quiz_recall\(\)/);
 assert.match(app,/_progress\["planSectionsByCase"\] = \{\}/);
 assert.match(app,/notes"\] as Dictionary\)\[_writing_key\] = "\\n\\n".join\(sections\)/);
 assert.match(smoke,/SR46_KP_FOUR_SECTION_PLAN_SIX_CASES_PASS/);
 assert.match(smoke,/Existing KP single-field note/);
 assert.match(smoke,/case_i in range\(6\)/);
 assert.doesNotMatch(app,/HTTPRequest\.new\(\)/);
});
