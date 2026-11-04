import test from 'node:test';
import assert from 'node:assert/strict';
import { readSourceContract } from './source-contract-text.mjs';
import { readFileSync } from 'node:fs';
const read = path => readSourceContract('../'+path, import.meta.url);
const app=read('native-godot/app.gd');
const visual=read('native-godot/visual-layout-smoke.gd');
const workflow=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');

test('SR55 source-native toolbar preserves all 10 views and two cameras without zero-width scroll strips',()=>{
 assert.match(app,/var _toolbar: GridContainer/);
 assert.match(app,/var _toolbar_view_buttons: Dictionary/);
 assert.match(app,/var _toolbar_camera_buttons: Dictionary/);
 assert.match(app,/_toolbar = GridContainer\.new\(\)/);
 assert.match(app,/_toolbar\.name = "KL_NATIVE_RESPONSIVE_TOOLBAR"/);
 // SR60 retains all 12 SR55 actions with bounded adaptive columns.
 assert.match(app,/var physical_columns := int\(floor\(\(physical_width - 24\.0\) \/ 160\.0\)\)/);
 assert.match(app,/_toolbar\.columns = clampi\(mini\(physical_columns, logical_columns\), 4, 8\)/);
 assert.match(app,/get_window\(\)\.size\.x/);
 assert.match(app,/logical_width \/ physical_width/);
 assert.match(app,/toolbar_font_size := clampi\(int\(ceil\(14\.0 \* inverse_canvas_scale\)\), 14, 22\)/);
 assert.match(app,/toolbar_height := maxf\(42\.0, ceil\(40\.0 \* inverse_canvas_scale\)\)/);
 assert.match(app,/b\.custom_minimum_size = Vector2\(142, 42\)/);
 assert.match(app,/b\.autowrap_mode = TextServer\.AUTOWRAP_OFF/);
 assert.match(app,/b\.clip_text = false/);
 assert.match(app,/b\.toggle_mode = true/);
 assert.match(app,/_toolbar_view_buttons\[section\] = b/);
 assert.match(app,/_toolbar_camera_buttons\[mode\] = camera_button/);
 assert.match(app,/_toolbar\.add_child\(b\)/);
 assert.match(app,/_toolbar\.add_child\(camera_button\)/);
 assert.match(app,/func _sync_toolbar_selection\(\) -> void:/);
 assert.match(app,/\(_toolbar_view_buttons\[id\] as Button\)\.set_pressed_no_signal\(id == _view\)/);
 assert.match(app,/\(_toolbar_camera_buttons\[mode\] as Button\)\.set_pressed_no_signal\(mode == _camera_mode\)/);
 assert.match(app,/func _update_responsive_layout\(\) -> void:\s*\n\s*_update_toolbar_columns\(\)/);
 assert.doesNotMatch(app,/var tab_scroll := ScrollContainer\.new\(\)/);
 const tabs=['clinic','environment','learning','journey','language','anatomy','radiology','scans','progress','coverage'];
 assert.ok(app.includes('for section in ['+tabs.map(s=>'"'+s+'"').join(', ')+']:'),'source tab and navigation order changed');
 assert.ok(app.includes('for mode in ["overview", "teeth"]:'),'camera controls missing');
 assert.match(app,/b\.pressed\.connect\(_switch_view\.bind\(section\)\)/);
 assert.match(app,/camera_button\.pressed\.connect\(_set_camera_mode\.bind\(mode\)\)/);
});

test('SR55 owner-rejected 1280x720 and 1536x864 included in actual headless Godot layout/interaction gates',()=>{
 assert.match(visual,/func _validate_toolbar\(app: Node3D, window_width: int, window_height: int, expected_columns: int\)/);
 assert.match(visual,/\[\[1280,720,7\],\[1536,864,8\],\[1024,720,6\],\[1600,900,8\]\]/);
 assert.match(visual,/grid\.get_child_count\(\) == 12/);
 assert.match(visual,/b\.size\.x >= 142\.0/);
 assert.match(visual,/chip_physical\.x >= 142\.0/);
 assert.match(visual,/font_physical >= 13\.0/);
 assert.match(visual,/app\.get_window\(\)\.size\.x == window_width/);
 assert.match(visual,/rect\.end\.x <= viewport_right \+ 2\.0/);
 assert.match(visual,/rect\.end\.y <= viewport_bottom \+ 1\.0/);
 assert.match(visual,/view_buttons\["progress"\]/);
 assert.match(visual,/camera_buttons\["overview"\]/);
 assert.match(visual,/SR55_RESPONSIVE_TWELVE_ACTION_TOOLBAR_1280_720_1536_864_PASS/);
 assert.match(workflow,/node --test tests\/sr55_native_responsive_toolbar\.test\.mjs/);
 assert.match(workflow,/SR55_RESPONSIVE_TWELVE_ACTION_TOOLBAR_1280_720_1536_864_PASS/);
});