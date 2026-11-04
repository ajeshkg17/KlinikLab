import test from 'node:test';
import assert from 'node:assert/strict';
import { readSourceContract } from './source-contract-text.mjs';

const read = path => readSourceContract('../'+path, import.meta.url);

test('SR64 progress reset verifies exact user:// disk JSON, does not silently claim cleared memory as persistence', () => {
  const app = read('native-godot/app.gd');
  assert.match(app, /const PROGRESS := "user:\/\/kliniklab-native-progress-v2\.json"/);
  assert.match(app, /func _save_progress\(\) -> bool:/);
  assert.match(app, /ProjectSettings\.globalize_path\(PROGRESS\)/);
  assert.match(app, /DirAccess\.make_dir_recursive_absolute\(absolute_path\.get_base_dir\(\)\)/);
  assert.match(app, /file\.flush\(\)/);
  assert.match(app, /file\.get_error\(\)/);
  assert.match(app, /func _reset_progress_on_disk\(\) -> bool:/);
  assert.match(app, /JSON\.parse_string\(FileAccess\.get_file_as_string\(PROGRESS\)\)/);
  assert.match(app, /var reset_disk_ok: bool = reset_write_ok and _reset_progress_on_disk\(\)/);
  assert.match(app, /RESET NOT CONFIRMED ON DISK/);
  assert.match(app, /_progress\["practicalChecklist"\] = \{\}/);
  assert.match(app, /Active local progress file: /);
  const reset = app.slice(app.indexOf('func _reset_progress()'), app.indexOf('func _show_coverage()'));
  assert.ok(reset.indexOf('var reset_disk_ok') < reset.indexOf('\n\t_refresh()'), 'verify before claiming reset');
  assert.doesNotMatch(reset, /FileAccess\.open\(PROGRESS, FileAccess\.READ_WRITE\)/);
});

test('SR64 native FPS look remains mouse-owned, physical-pixel first with nonzero fallback, and focus safe',()=>{
 const app = read('native-godot/app.gd'), walk = read('native-godot/clinic-walk-smoke.gd');
 assert.match(app,/get_window\(\)\.focus_exited\.connect\(_on_walk_focus_lost\)/);
 assert.match(app,/get_window\(\)\.visibility_changed\.connect\(_on_walk_visibility_changed\)/);
 assert.match(app,/func _on_walk_focus_lost\(\) -> void:\n[\s\S]{0,250}?_release_walk_mouse\(\)/);
 assert.match(app,/if _walk_mouse_captured and look_delta == Vector2\.ZERO:\n\t\t\tlook_delta = motion\.relative/);
 assert.match(app,/if look_delta == Vector2\.ZERO:\n\t\t\treturn/);
 assert.match(app,/DisplayServer\.get_name\(\) != "headless"/);
 assert.match(app,/window\.mode == Window\.MODE_MINIMIZED/);
 assert.match(walk,/SR64_FPS_DELTA_DRAG_FOCUS_HUD_PASS/);
 assert.match(walk,/SR64 captured zero-screen-delta fallback did not visibly rotate scene camera/);
 assert.match(walk,/SR64 uncaptured right-button drag failed to rotate actual 3D camera/);
 assert.match(walk,/SR64 focus-exited release left captured HUD or invisible cursor/);
 assert.doesNotMatch(app,/if _walk_active:\n\t\t_direct_bur_mode = true/);
});

test('SR64 CC0 environment framing uses imported mesh bounds and environment-specific lighting, not fabricated anatomy',()=>{
 const app = read('native-godot/app.gd');
 const layout = read('native-godot/visual-layout-smoke.gd');
 assert.match(app,/func _environment_room_bounds\(\) -> AABB:/);
 assert.match(app,/for node_name in \["KL_SOURCE_CC0_WHOLE_CLINIC", "KL_SOURCE_CC0_REAL_OPERATORY_CHAIR"\]:/);
 assert.match(app,/_expand_visible_mesh_bounds\(room_part, extrema\)/);
 const camera = app.slice(app.indexOf('func _frame_environment_camera()'),app.indexOf('func _build_app()'));
 assert.doesNotMatch(camera,/var world_center := Vector3\(3\.0, -1\.8, -19\.0\)/);
 assert.match(camera,/var target: AABB = _environment_room_bounds\(\)/);
 assert.match(camera,/camera\.position = Vector3\(eye_x, eye_y, eye_z\)/);
 assert.match(app,/world\.environment\.ambient_light_energy = 0\.36 if show_room else 0\.85/);
 assert.match(app,/key\.light_energy = 0\.65 if show_room else 1\.6/);
 assert.match(app,/fill\.light_energy = 0\.42 if show_room else 1\.2/);
 assert.match(layout,/SR64_REAL_CC0_ROOM_CENTERED_FIT_AND_LIGHTING_FIVE_SIZES_PASS/);
 assert.match(layout,/\[1536,816\]/);
});

test('SR64 strict real-Godot user-file, walk and layout gates enforced in CI',()=>{
 const appSmoke=read('native-godot/actual-app-smoke.gd');
 const walkSmoke=read('native-godot/clinic-walk-smoke.gd');
 const layout=read('native-godot/visual-layout-smoke.gd');
 const ci=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 assert.match(appSmoke,/SR64_REAL_USER_DISK_RESET_RELOAD_PASS/);
 assert.match(appSmoke,/app\.call\("_load_progress"\)/);
 assert.match(appSmoke,/SR64 reset rendered empty UI but persisted file still held records/);
 assert.match(walkSmoke,/SR64_FPS_DELTA_DRAG_FOCUS_HUD_PASS/);
 assert.match(layout,/SR64_REAL_CC0_ROOM_CENTERED_FIT_AND_LIGHTING_FIVE_SIZES_PASS/);
 assert.match(ci,/node --test tests\/sr64_ownerpc_reset_room_input\.test\.mjs/);
 for(const marker of ['SR64_REAL_USER_DISK_RESET_RELOAD_PASS','SR64_FPS_DELTA_DRAG_FOCUS_HUD_PASS','SR64_REAL_CC0_ROOM_CENTERED_FIT_AND_LIGHTING_FIVE_SIZES_PASS']) {
  assert.ok(ci.includes('grep -F "'+marker+'"'),marker);
 }
});
