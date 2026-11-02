import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('SR47 browser expert active recall precedes multiple-choice reveal in four quiz tracks',()=>{
 const browser=read('app.js'),app=read('native-godot/app.gd');
 assert.match(browser,/Freie Antwort · zuerst selbst formulieren/);
 assert.match(browser,/reveal-answers/);
 assert.match(browser,/free-response/);
 assert.match(app,/func _quiz_recall_id\(station: String, index: int\)/);
 assert.match(app,/func _reveal_quiz_options\(\)/);
 assert.match(app,/KL_QUIZ_ACTIVE_RECALL/);
 assert.match(app,/KL_QUIZ_REVEAL_CHOICES/);
 assert.match(app,/if not _quiz_revealed and existing.is_empty\(\)/);
 assert.match(app,/KL_QUIZ_OPTION_/);
 assert.match(app,/station in \["interview", "handover", "viva", "clinic"\]/);
});
test('SR47 formative recall survives navigation but never grades or cuts',()=>{
 const app=read('native-godot/app.gd'),smoke=read('native-godot/actual-app-smoke.gd');
 assert.match(app,/"quizRecall": \{\}/);
 assert.match(app,/_progress\["quizRecall"\] = drafts/);
 assert.match(app,/func _clear_page\(\) -> void:\n\t_language_save_draft\(\)\n\t_save_draft\(\)\n\t_save_quiz_recall\(\)/);
 assert.match(app,/func _next_question\(\) -> void:\n\t_save_quiz_recall\(\)\n\t_quiz_revealed = false/);
 assert.match(app,/_progress\["quizRecall"\] = \{\}/);
 assert.match(app,/not an official FSP\/KP examination grade/);
 assert.match(smoke,/SR47_FOUR_QUIZ_STATIONS_SIX_FDI_ACTIVE_RECALL_PASS/);
 assert.match(smoke,/station_i in \[0,2,5,6\]/);
 assert.match(smoke,/case_i in range\(6\)/);
});
