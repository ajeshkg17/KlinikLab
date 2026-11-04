import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path,import.meta.url),'utf8');

test('SR49 native FSP/KP text-first layout matches browser hidden source sample reasoning', () => {
 const browser=read('app.js'), app=read('native-godot/app.gd');
 assert.match(browser,/letterView\(\)/);
 assert.match(browser,/writtenView\(\)/);
 assert.match(browser,/Reveal sample reasoning after your own answer/);
 assert.match(app,/func _writing_focus_active\(\) -> bool:/);
 assert.match(app,/_view == "clinic" and STATION_IDS\[_station_index\] in \["letter", "written"\]/);
 assert.match(app,/elif _writing_focus_active\(\):\n\t\t# Source\/browser text-first FSP\/KP writing:[^\n]*\n\t\t_show_station\(\)/);
 assert.match(app,/_middle\.visible = _view in \["clinic", "environment", "anatomy", "scans"\] and not writing_focus/);
 assert.match(app,/_right_column\.size_flags_horizontal = Control\.SIZE_EXPAND_FILL if writing_focus else Control\.SIZE_FILL/);
 assert.match(app,/KL_WRITING_REVEAL_SOURCE/);
 assert.match(app,/KL_WRITING_SOURCE_REFERENCE/);
 assert.match(app,/_writing_reference_panel\.visible = false/);
 assert.match(app,/func _toggle_writing_reference\(\) -> void:/);
 assert.match(app,/field\.custom_minimum_size = Vector2\(0, 130\)/);
 assert.match(app,/field\.wrap_mode = TextEdit\.LINE_WRAPPING_BOUNDARY/);
});

test('SR49 whole app tests writing focus, reveal, retained drafts and practical scene restoration', () => {
 const smoke=read('native-godot/actual-app-smoke.gd');
 const layout=read('native-godot/visual-layout-smoke.gd');
 const workflow=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 assert.match(smoke,/SR49_FSP_KP_WRITING_FOCUS_SIX_CASES_PASS/);
 assert.match(smoke,/for case_i in range\(6\):/);
 assert.match(smoke,/SR49 draft lost or revealed reference persisted/);
 assert.match(smoke,/SR49 practical scene not restored/);
 assert.match(layout,/SR49_NATIVE_WRITING_FOCUS_1600_1280_LAYOUT_PASS/);
 assert.match(layout,/_validate_writing_focus\(app,1600,station_i\)/);
 assert.match(layout,/_validate_writing_focus\(app,1280,station_i\)/);
 assert.match(workflow,/tests\/sr49_native_writing_focus\.test\.mjs/);
 assert.match(workflow,/SR49_FSP_KP_WRITING_FOCUS_SIX_CASES_PASS/);
 assert.match(workflow,/SR49_NATIVE_WRITING_FOCUS_1600_1280_LAYOUT_PASS/);
});
