import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = name => fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('SR31 desktop walk is explicit keyboard/mouse input mapped to reusable movement/look intents',()=>{
 const app=read('native-godot/app.gd');
 const model=read('native-godot/clinic-walk-intent.gd');
 for(const marker of ['func _walk_keyboard_allowed()','Input.is_physical_key_pressed(KEY_W)',
  'Input.is_physical_key_pressed(KEY_A)','Input.is_physical_key_pressed(KEY_S)',
  'Input.is_physical_key_pressed(KEY_D)','MOUSE_BUTTON_RIGHT',
  'apply_move_intent','apply_look_intent','func _walk_enter_procedure() -> bool:',
  'key.physical_keycode == KEY_E','func _stop_clinic_walk()'])
  assert.ok(app.includes(marker),marker);
 for(const marker of ['func apply_move_intent(','func apply_look_intent(',
  'func in_operatory_range()','limit_length(1.0)','clampf('])
  assert.ok(model.includes(marker),marker);
 assert.ok(app.includes('not (focused is TextEdit or focused is LineEdit)'));
 assert.ok(app.includes('_middle.get_global_rect().has_point(mouse.position)'));
 assert.equal((app.match(/^func _input\(event: InputEvent\) -> void:/gm)||[]).length,1,'only one _input handler may exist');
 assert.match(app,/func _handle_walk_input\(event: InputEvent\) -> void:/);
 assert.match(app,/func _input\(event: InputEvent\) -> void:\n\t# Single entry point:[\s\S]*?_handle_walk_input\(event\)/);
 assert.match(app,/if not _direct_bur_mode or _middle == null or _scene == null:/);
});

test('SR31 operatory entry is range-gated and opens original FDI practical without drilling',()=>{
 const app=read('native-godot/app.gd');
 const core=read('native-godot/clinic-walk-intent.gd');
 const start=app.indexOf('func _walk_enter_procedure() -> bool:');
 const stop=app.indexOf('\nfunc _load_source() -> bool:',start);
 assert.ok(start>=0 && stop>start);
 const entry=app.slice(start,stop);
 assert.match(entry,/in_operatory_range/);
 assert.match(entry,/_select_station\(4\)/);
 assert.match(entry,/_switch_view\("clinic"\)/);
 assert.match(entry,/_set_camera_mode\("teeth"\)/);
 assert.match(entry,/_direct_bur_mode = false/);
 assert.doesNotMatch(entry,/(cut_to|_direct_cut_world_ray|_record_practical)/);
 assert.match(core,/const REACH := 2\.4/);
 assert.match(core,/const OPERATORY := Vector3/);
 assert.match(app,/const FDI := \["16", "36", "11", "26", "48", "46"\]/);
 assert.match(app,/const STATION_IDS := \["interview", "letter", "handover", "written", "practical", "viva", "clinic"\]/);
 assert.match(app,/func _language_save_draft\(/);
 assert.match(app,/func _show_language_studio\(/);
});

test('SR31 source-built native Godot app ships headless walk smoke and never changes watcher/current job',()=>{
 const builder=read('native-godot/build-app.mjs');
 const workflow=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 const smoke=read('native-godot/clinic-walk-smoke.gd');
 assert.match(builder,/clinic-walk-intent\.gd/);
 assert.match(builder,/clinic-walk-smoke\.gd/);
 assert.match(workflow,/SR31_DESKTOP_WASD_MOUSE_INTENT_FDI_OPERATORY_FSP_KP_PRESERVED_PASS/);
 for(const token of ['FDI36','KEY_E','KEY_ESCAPE','_walk_enter_procedure','fspKpByTask'])
  assert.ok(smoke.includes(token),token);
 assert.doesNotMatch(smoke,/(?:OS\.execute|HTTPRequest|exported-app-capture|godot-worker|KLINIKLAB_PC_CAPTURE)/);
});

test('SR37 E-operatory practical station offers explicit source-only walk return at same pose',()=>{
 const app=read('native-godot/app.gd');
 const smoke=read('native-godot/clinic-walk-smoke.gd');
 assert.match(app,/var _walk_station_return_available := false/);
 assert.match(app,/func _return_to_clinic_walk\(\) -> bool:/);
 const start=app.indexOf('func _return_to_clinic_walk() -> bool:');
 const end=app.indexOf('func _procedure_context_available()',start);
 const fn=app.slice(start,end);
 for (const marker of ['_walk_station_return_available','_station_index == 4','_switch_view("environment")','_apply_walk_camera()','_walk_active = true']) assert.ok(fn.includes(marker));
 assert.doesNotMatch(fn,/_walk.call\("reset"\)|_record_practical\(|_save_progress\(|_direct_cut_world_ray\(/);
 assert.match(app,/Return to clinic walk at operatory \(no grading or drilling\)/);
 assert.match(smoke,/SR37_STATION_RETURN_SAME_POSE_PASS/);
 assert.match(smoke,/resumed_pose.distance_to\(station_pose\)/);
});

test('SR38 walkable clinic exposes a distinct range-gated FSP/KP station with explicit return',()=>{
 const app=read('native-godot/app.gd');
 const walk=read('native-godot/clinic-walk-intent.gd');
 const smoke=read('native-godot/clinic-walk-smoke.gd');
 assert.match(walk,/const OPERATORY := Vector3\(3\.0, 0\.6, -18\.0\)/);
 assert.match(walk,/const LANGUAGE_STATION := Vector3\(-3\.0, 0\.6, -18\.0\)/);
 assert.match(walk,/func in_language_station_range\(\) -> bool:/);
 const enter=app.slice(app.indexOf('func _walk_enter_language_station() -> bool:'),app.indexOf('func _return_to_clinic_walk() -> bool:'));
 assert.match(enter,/in_language_station_range/);
 assert.match(enter,/_switch_view\("language"\)/);
 assert.match(enter,/_walk_language_return_available = true/);
 const back=app.slice(app.indexOf('func _return_to_clinic_walk() -> bool:'),app.indexOf('func _procedure_context_available()'));
 assert.match(back,/_view == "language"/);
 assert.match(back,/_language_save_draft\(\)/);
 assert.match(back,/_switch_view\("environment"\)/);
 assert.match(app,/Enter FSP\/KP language station \(E\)/);
 assert.match(app,/Return to clinic walk from FSP\/KP station/);
 assert.match(app,/if _view == "language" and view != "language":\n\t\t_language_save_draft\(\)/);
 assert.match(smoke,/SR38_RANGE_GATED_FSP_KP_STATION_DRAFT_AND_PRACTICAL_PERSISTENCE_PASS/);
 for(const marker of ['FSP/KP station activated outside its separate range','FSP/KP draft was not saved on station entry','Practical completion was lost while switching to FSP/KP','FSP/KP draft was lost on station return','Practical progress was lost on FSP/KP station return']) assert.ok(smoke.includes(marker),marker);
 assert.doesNotMatch(smoke,/(?:OS\.execute|HTTPRequest|exported-app-capture|godot-worker|KLINIKLAB_PC_CAPTURE)/);
});
