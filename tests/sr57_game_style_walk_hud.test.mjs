import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('SR57 game-like HUD is explicit, readable, within the center pane and pointer transparent',()=>{
 const app=read('native-godot/app.gd');
 for(const source of ['_build_walk_hud()','KL_WALK_HUD','KL_WALK_MODE_BANNER','KL_WALK_CENTER_RETICLE','KL_WALK_GUIDANCE_PANEL','KL_WALK_STATION_GUIDANCE',
  'OPERATORY','FSP/KP','Esc exits','right-drag','WASD / arrows','Shift quicker'])
  assert.ok(app.includes(source),source);
 assert.match(app,/body\.add_child\(_middle\)\n\t_build_walk_hud\(\)/);
 assert.match(app,/func _update_walk_hud\(\) -> void:/);
 assert.match(app,/_walk_hud\.visible = active/);
 assert.match(app,/_walk_hud\.mouse_filter = Control\.MOUSE_FILTER_IGNORE/);
 assert.match(app,/_walk_hud_top\.mouse_filter = Control\.MOUSE_FILTER_IGNORE/);
 assert.match(app,/_walk_hud_panel\.mouse_filter = Control\.MOUSE_FILTER_IGNORE/);
 assert.match(app,/_walk_hud_reticle\.mouse_filter = Control\.MOUSE_FILTER_IGNORE/);
 assert.match(app,/_walk_hud_guide\.mouse_filter = Control\.MOUSE_FILTER_IGNORE/);
 assert.match(app,/_walk_hud_title\.mouse_filter = Control\.MOUSE_FILTER_IGNORE/);
 assert.match(app,/_walk_hud_panel\.anchor_top = 1\.0/);
 assert.match(app,/_walk_hud_top\.offset_right = minf\(width, 316\.0\)/);
 assert.match(app,/start_walk := _button\("Start clinic walkthrough/);
 assert.match(app,/camera\.fov = 64\.0/);
 assert.match(app,/func _apply_walk_camera\(\) -> void:[\s\S]*?_update_walk_hud\(\)/);
 assert.match(app,/if not _walk_active or _view != "environment" or _walk == null:/);
 const hudSection=app.slice(app.indexOf("func _build_walk_hud()"),app.indexOf("func _walk_keyboard_allowed()"));
 assert.doesNotMatch(hudSection,/cut_to|_direct_cut_world_ray|_record_practical/);
});

test('SR57 walk controller preserves movement bounds and adds optional limited pace plus station bearings',()=>{
 const walk=read('native-godot/clinic-walk-intent.gd');
 const app=read('native-godot/app.gd');
 for(const key of ['START','OPERATORY','LANGUAGE_STATION','WORLD_MIN','WORLD_MAX','REACH','const FAST_MULTIPLIER := 1.5','_guidance(target: Vector3)','operatory_guidance()','language_guidance()','in_operatory_range()','in_language_station_range()'])
  assert.ok(walk.includes(key),key);
 assert.match(walk,/func apply_move_intent\(intent: Vector2, delta: float, fast: bool = false\)/);
 assert.match(walk,/intent\.limit_length\(1\.0\)/);
 assert.match(walk,/minf\(delta, 0\.1\)/);
 assert.match(walk,/clampf\(next\.x, WORLD_MIN\.x, WORLD_MAX\.x\)/);
 assert.match(walk,/clampf\(next\.z, WORLD_MIN\.y, WORLD_MAX\.y\)/);
 assert.match(walk,/no collision model/i); // no calibration claim
 assert.match(app,/Input\.is_physical_key_pressed\(KEY_SHIFT\)/);
 assert.match(app,/_walk\.call\("apply_move_intent", direction, delta, fast\)/);
 assert.match(app,/_walk\.call\("operatory_guidance"\)/);
 assert.match(app,/_walk\.call\("language_guidance"\)/);
 const enter=app.slice(app.indexOf('func _walk_enter_procedure() -> bool:'),app.indexOf('func _walk_enter_language_station() -> bool:'));
 assert.match(enter,/in_operatory_range/);
 assert.match(enter,/_direct_bur_mode = false/);
 assert.match(enter,/_select_station\(4\)/);
 assert.match(enter,/_set_procedure_guided\(true\)/);
});

test('SR57 exact-head CI gates real Godot HUD and movement/layout markers',()=>{
 const walk=read('native-godot/clinic-walk-smoke.gd');
 const layout=read('native-godot/visual-layout-smoke.gd');
 const ci=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 assert.match(walk,/SR57_FIRST_PERSON_CAMERA_HUD_SPRINT_BEARING_PASS/);
 assert.match(walk,/nonfinite movement must be ignored/);
 assert.match(walk,/Movement alone activated procedure/);
 assert.match(walk,/Escape did not restore the clinic overview/);
 assert.match(layout,/func _validate_walk_hud\(app: Node3D, window_width: int, window_height: int\)/);
 for(const size of ['[1600,900]','[1280,900]','[1024,900]','[1280,720]']) assert.ok(layout.includes(size),size);
 assert.match(layout,/SR57_WALK_HUD_1600_1280_1024_720_LAYOUT_PASS/);
 assert.match(ci,/tests\/sr57_game_style_walk_hud\.test\.mjs/);
 assert.match(ci,/SR57_FIRST_PERSON_CAMERA_HUD_SPRINT_BEARING_PASS/);
 assert.match(ci,/SR57_WALK_HUD_1600_1280_1024_720_LAYOUT_PASS/);
});
