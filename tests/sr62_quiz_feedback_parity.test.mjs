import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('SR62 browser quiz answer parity: selected response and feedback become visible without changing grading', () => {
 const browser = read('app.js');
 const app = read('native-godot/app.gd');
 assert.match(browser, /b\.classList\.add\(ok\?'good':'bad'\)/);
 assert.match(browser, /else this\.report\(s\.why\|\|s\.explain/);
 assert.match(app, /func _sync_quiz_feedback\(station: String, index: int\) -> void:/);
 assert.match(app, /_quiz_feedback_status\.name = "KL_QUIZ_FEEDBACK_STATUS"/);
 assert.match(app, /_answer_label\.name = "KL_QUIZ_FEEDBACK_DETAIL"/);
 assert.match(app, /"↻ Review suggested · choose another response"/);
 assert.match(app, /"✓ Correct source response · next question unlocked"/);
 assert.match(app, /"↻ Review selection · "/);
 assert.match(app, /"✓ Correct selection · "/);
 assert.match(app, /_sync_quiz_feedback\(station, _quiz_index\)/);
 assert.match(app, /_sync_quiz_feedback\(station, index\)/);
 assert.match(app, /option\.disabled = correct/);
 const model = app.slice(app.indexOf('func _sync_quiz_feedback('), app.indexOf('func _show_quiz(',app.indexOf('func _sync_quiz_feedback(')));
 assert.doesNotMatch(model, /_save_progress|_record_practical|_direct_cut_world_ray|cut_to|_answer\(/);
});

test('SR62 multiple-choice question and saved feedback precede long clinic history on desktop', () => {
 const app = read('native-godot/app.gd');
 const render = app.slice(app.indexOf('func _refresh()'), app.indexOf('func _ensure_fdi36_reference()',app.indexOf('func _refresh()')));
 assert.match(render, /var quiz_first: bool = _view == "clinic" and STATION_IDS\[_station_index\] in \["interview", "handover", "viva", "clinic"\]/);
 assert.match(render, /if quiz_first:\n\t\t\t_show_station\(\)/);
 assert.ok(render.indexOf('if quiz_first:') < render.indexOf('Complaint: '));
 assert.match(render, /if not practical_first and not quiz_first:\n\t\t\t_show_station\(\)/);
 assert.match(app, /_quiz_feedback_status = null/);
 assert.match(app, /_progress\["answers"\] = \{\}/);
 assert.match(app, /"selected": choice, "correct": correct, "sourceQuestion": index/);
});

test('SR62 real headless Godot regression covers all six FDI cases times four quiz tracks, retry, re-entry, no cutting and CI gating',()=>{
 const smoke = read('native-godot/actual-app-smoke.gd');
 const layout = read('native-godot/visual-layout-smoke.gd');
 const ci = read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 for(const marker of ['SR62_SIX_FDI_FOUR_QUIZ_PERSISTENT_FEEDBACK_PASS','for case_i in range(6):','for station_i in [0,2,5,6]:','SR62 saved wrong response was hidden','SR62 solved feedback, locked options','SR62 saved correct feedback and Next did not restore','SR62 reset retained formative choice records']) {
  assert.ok(smoke.includes(marker),marker);
 }
 assert.match(layout,/SR62_TASK_FIRST_QUIZ_FEEDBACK_SIX_DESKTOP_SIZES_PASS/);
 assert.match(ci,/node --test tests\/sr62_quiz_feedback_parity\.test\.mjs/);
 assert.match(ci,/grep -F "SR62_SIX_FDI_FOUR_QUIZ_PERSISTENT_FEEDBACK_PASS"/);
 assert.match(ci,/grep -F "SR62_TASK_FIRST_QUIZ_FEEDBACK_SIX_DESKTOP_SIZES_PASS"/);
 assert.doesNotMatch(smoke,/(?:OS\.execute|HTTPRequest|exported-app-capture|godot-worker|KLINIKLAB_PC_CAPTURE)/);
});
