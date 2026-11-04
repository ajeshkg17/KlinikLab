import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('SR52 browser quiz requires correct answer before Next, and finishes final case/station', () => {
 const browser = read('app.js');
 const native = read('native-godot/app.gd');
 assert.match(browser,/next\(\)\{if\(!this\.done\)/);
 assert.match(browser,/if\(this\.step<n-1\)/);
 assert.match(browser,/this\.local\.complete\.push\(key\)/);
 assert.match(browser,/this\.station\.id\+'_'+this\.caseData\.id/);
 assert.match(native,/func _show_quiz\(station: String\) -> void:/);
 assert.match(native,/_quiz_next_button = _button\("Finish station ✓" if _quiz_index == questions\.size\(\) - 1 else "Next source question"\)/);
 assert.match(native,/_quiz_next_button\.disabled = not bool\(existing\.get\("correct", false\)\)/);
 assert.match(native,/if not _quiz_revealed and not \(_progress\["answers"\] as Dictionary\)\.has\(answer_key\):/);
 assert.match(native,/if bool\(\(\(_progress\["answers"\] as Dictionary\)\.get\(answer_key, \{\}\) as Dictionary\)\.get\("correct", false\)\):/);
 assert.match(native,/option\.disabled = true/);
 assert.match(native,/if not bool\(\(\(_progress\["answers"\] as Dictionary\)\.get\(key, \{\}\) as Dictionary\)\.get\("correct", false\)\):/);
 assert.match(native,/if _quiz_index >= questions\.size\(\) - 1:/);
 assert.match(native,/\(_progress\["studied"\] as Dictionary\)\[_key\(\)\] = true/);
 assert.doesNotMatch(native,/_quiz_index = \(_quiz_index \+ 1\) % questions\.size\(\)/);
});

test('SR52 Godot headless regression covers six FDI x four quiz stations including wrong retry, completion and reset', () => {
 const native = read('native-godot/app.gd');
 const smoke = read('native-godot/actual-app-smoke.gd');
 const workflow = read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 assert.match(native,/func _quiz_recall_id\(station: String, index: int\) -> String:/);
 assert.match(native,/if station == "interview" and correct:/);
 assert.match(native,/station != STATION_IDS\[_station_index\] or index != _quiz_index/);
 assert.match(smoke,/for case_i in range\(6\):/);
 assert.match(smoke,/for station_i in \[0,2,5,6\]:/);
 assert.match(smoke,/for question_i in range\(questions\.size\(\)\):/);
 assert.match(smoke,/wrong_idx: int = \(correct_idx \+ 1\) % 3/);
 assert.match(smoke,/SR52 unrevealed source choice accepted/);
 assert.match(smoke,/SR52 wrong source answer unexpectedly advanced/);
 assert.match(smoke,/SR52 correct source answer did not unlock Next/);
 assert.match(smoke,/SR52 final question wrapped to beginning/);
 assert.match(smoke,/SR52 active-recall note lost through finished station navigation/);
 assert.match(smoke,/SR52 reset retained quiz record/);
 assert.match(smoke,/SR52_SIX_FDI_FOUR_QUIZ_FINISH_GATING_PASS/);
 assert.match(workflow,/tests\/sr52_native_quiz_finish_gating\.test\.mjs/);
 assert.match(workflow,/SR52_SIX_FDI_FOUR_QUIZ_FINISH_GATING_PASS/);
});
