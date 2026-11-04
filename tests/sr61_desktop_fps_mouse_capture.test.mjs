import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('SR61 FPS capture is explicit and confined to environment center 3D, never dental tools', () => {
  const app = read('native-godot/app.gd');
  assert.match(app, /var _walk_mouse_captured := false/);
  assert.match(app, /func _capture_walk_mouse\(\) -> void:/);
  assert.match(app, /func _release_walk_mouse\(\) -> void:/);
  assert.match(app, /mouse.button_index == MOUSE_BUTTON_LEFT and mouse.pressed and not _walk_mouse_captured and _middle != null and _middle.get_global_rect\(\).has_point\(mouse.position\)/);
  assert.match(app, /Input.mouse_mode = Input.MOUSE_MODE_CAPTURED/);
  assert.match(app, /if owned_capture and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:/);
  assert.match(app, /Input.mouse_mode = Input.MOUSE_MODE_VISIBLE/);
  assert.match(app, /motion.screen_relative if _walk_mouse_captured else motion.relative/);
  const handlers = app.slice(app.indexOf('func _capture_walk_mouse()'), app.indexOf('func _start_clinic_walk()'));
  assert.doesNotMatch(handlers, /cut_to|_direct_cut_world_ray|_store_cut|_save_progress|_record_practical/);
  assert.equal((app.match(/^func _input\(event: InputEvent\) -> void:/gm) ?? []).length, 1);
});

test('SR61 Escape-first-release, second-exit, window defocus and view switch clear cursor ownership', () => {
  const app = read('native-godot/app.gd');
  assert.match(app, /if key.keycode == KEY_ESCAPE or key.physical_keycode == KEY_ESCAPE:/);
  assert.match(app, /if _walk_mouse_captured:\n\t{4}_release_walk_mouse\(\)\n\t{3}else:\n\t{4}_stop_clinic_walk\(\)/);
  assert.match(app, /what == NOTIFICATION_WM_WINDOW_FOCUS_OUT or what == NOTIFICATION_APPLICATION_FOCUS_OUT/);
  assert.match(app, /func _exit_tree\(\) -> void:\n\t_release_walk_mouse\(\)/);
  assert.match(app, /func _stop_clinic_walk\(\) -> void:\n\t_release_walk_mouse\(\)/);
  const switchFn = app.slice(app.indexOf('func _switch_view(view: String)'), app.indexOf('func _sync_navigation_selection()', app.indexOf('func _switch_view(view: String)')));
  assert.match(switchFn, /if view != "environment":\n\t\t_release_walk_mouse\(\)/);
  for (const fn of ['_walk_enter_procedure', '_walk_enter_language_station']) {
    const start = app.indexOf('func ' + fn + '() -> bool:');
    const end = app.indexOf('\nfunc ', start + 1);
    assert.ok(start >= 0 && end > start);
    assert.match(app.slice(start, end), /_release_walk_mouse\(\)/, fn);
  }
});

test('SR61 Headless runtime and six desktop geometry gates are wired; watcher remains untouched', () => {
  const smoke = read('native-godot/clinic-walk-smoke.gd');
  const layout = read('native-godot/visual-layout-smoke.gd');
  const ci = read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
  assert.match(smoke, /SR61_DESKTOP_FPS_MOUSE_CAPTURE_RELEASE_FOCUS_PASS/);
  for (const marker of ['scene_click','outside_click','screen_relative','first Escape must release','window defocus left mouse captured']) {
    assert.ok(smoke.includes(marker), marker);
  }
  assert.match(layout, /SR61_FPS_POINTER_HUD_SIX_DESKTOP_SIZES_PASS/);
  for (const size of ['[1600,900]', '[1536,864]', '[1280,900]', '[1280,720]', '[1024,900]', '[1024,720]'])
    assert.ok(layout.includes(size), size);
  assert.match(ci, /node --test tests\/sr61_desktop_fps_mouse_capture\.test\.mjs/);
  assert.match(ci, /grep -F "SR61_DESKTOP_FPS_MOUSE_CAPTURE_RELEASE_FOCUS_PASS"/);
  assert.match(ci, /grep -F "SR61_FPS_POINTER_HUD_SIX_DESKTOP_SIZES_PASS"/);
  assert.doesNotMatch(smoke, /(?:OS\.execute|HTTPRequest|exported-app-capture|godot-worker|KLINIKLAB_PC_CAPTURE)/);
});
