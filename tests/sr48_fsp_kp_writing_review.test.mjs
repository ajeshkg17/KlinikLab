import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../'+p, import.meta.url), 'utf8');

test('SR48 FSP/KP review retains browser structural checks and explicit assessment limits', () => {
 const browser = read('app.js'), native = read('native-godot/app.gd');
 assert.match(browser, /evaluateLetter\(\)/);
 assert.match(browser, /evaluatePlan\(\)/);
 assert.match(browser, /n>=35/);
 assert.match(browser, /Plan A and Plan B must describe two different alternatives/);
 assert.match(native, /func _writing_structure_feedback\(station: String\) -> String:/);
 assert.match(native, /value\.length\(\) >= 35/);
 assert.match(native, /full_text\.contains\(fdi_reference\)/);
 assert.match(native, /plan_a\.text\.strip_edges\(\)\.to_lower\(\) == plan_b\.text\.strip_edges\(\)\.to_lower\(\)/);
 assert.match(native, /NOT a formal FSP assessment/);
 assert.match(native, /NOT a formal KP assessment/);
 assert.doesNotMatch(native, /HTTPRequest\.new\(\)/);
});

test('SR48 provides learner-initiated review, no answer grading and six-case Godot regression', () => {
 const app = read('native-godot/app.gd'), smoke = read('native-godot/actual-app-smoke.gd');
 assert.match(app, /KL_WRITING_STRUCTURE_REVIEW/);
 assert.match(app, /KL_WRITING_STRUCTURE_FEEDBACK/);
 assert.match(app, /review\.pressed\.connect\(_review_writing\.bind\(station\)\)/);
 assert.match(app, /func _review_writing\(station: String\) -> void:/);
 assert.match(app, /_save_draft\(\) # Preserve edits before the learner navigates away/);
 assert.match(smoke, /SR48_FSP_KP_WRITING_REVIEW_SIX_CASES_PASS/);
 assert.match(smoke, /for case_i in range\(6\):[\s\S]*SR48 FSP/);
 assert.match(smoke, /SR48 KP duplicate-treatment warning missing/);
 assert.match(smoke, /SR48 reset kept reviewed writing drafts/);
});
