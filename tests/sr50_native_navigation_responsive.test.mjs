import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('SR50 compact native six-FDI navigation preserves source station identity and full tooltips', () => {
 const native = read('native-godot/app.gd');
 const browser = read('app.js');
 assert.match(browser,/const STATIONS=\[/);
 assert.match(native,/const STATION_IDS := \["interview", "letter", "handover", "written", "practical", "viva", "clinic"\]/);
 assert.match(native,/const NAV_STATION_SHORT := \[/);
 // SR60 reduces excess sidebar width without changing SR50's
 // two-chip FDI grid, source labels, or minimum readable nav width.
 assert.match(native,/nav_width := clampf\(width \* 0\.15, 224\.0, 248\.0\)/);
 assert.match(native,/_nav_case_grid\.columns = 2/);
 assert.match(native,/btn\.name = "KL_FDI_CASE_" \+ str\(c\["fdi"\]\)/);
 assert.match(native,/btn\.name = "KL_STATION_" \+ STATION_IDS\[i\]/);
 assert.match(native,/btn\.tooltip_text = "FDI %s · %s · %s"/);
 assert.match(native,/btn\.tooltip_text = str\(st\["title"\]\) \+ " · " \+ str\(st\["subtitle"\]\)/);
 assert.match(native,/btn\.autowrap_mode = TextServer\.AUTOWRAP_OFF/);
 assert.match(native,/btn\.toggle_mode = true/);
 assert.match(native,/func _sync_navigation_selection\(\) -> void:/);
 assert.match(native,/set_pressed_no_signal\(i == _case_index\)/);
 assert.match(native,/set_pressed_no_signal\(i == _station_index\)/);
 assert.doesNotMatch(native,/var btn := _button\("%d · %s" % \[i \+ 1, str\(st\["title"\]\)\]\)/);
});

test('SR50 responsive FDI navigation remains separate from SR51 viewport camera framing', () => {
 const native = read('native-godot/app.gd');
 const layout = read('native-godot/visual-layout-smoke.gd');
 const app = read('native-godot/actual-app-smoke.gd');
 const workflow = read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 assert.match(native,/func _practical_camera_bounds\(\) -> AABB:/);
 assert.match(native,/func _frame_visible_camera\(\) -> void:/);
 assert.match(layout,/SR50_FDI_NAV_1600_1280_1024_LAYOUT_PASS/);
 assert.match(layout,/for nav_width in \[1600,1280,1024\]:/);
 assert.match(layout,/grid\.get_child\(0\)\.position\.y == grid\.get_child\(1\)\.position\.y/);
 assert.match(layout,/nav\.horizontal_scroll_mode == ScrollContainer\.SCROLL_MODE_DISABLED/);
 assert.match(app,/SR50_FDI_NAV_SIX_CASE_SEVEN_STATION_PASS/);
 assert.match(app,/for case_i in range\(6\):/);
 assert.match(app,/for station_i in range\(7\):/);
 assert.match(workflow,/tests\/sr50_native_navigation_responsive\.test\.mjs/);
 assert.match(workflow,/SR50_FDI_NAV_SIX_CASE_SEVEN_STATION_PASS/);
 assert.match(workflow,/SR50_FDI_NAV_1600_1280_1024_LAYOUT_PASS/);
});
