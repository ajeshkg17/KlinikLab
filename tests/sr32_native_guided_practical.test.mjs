import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('native-godot/app.gd');
test('SR32 original six FDI and seven stations remain unchanged',()=>{
 assert.match(app,/const CASE_IDS := \["molar", "endo", "anterior", "crown", "surgery", "perio"\]/);
 assert.match(app,/const FDI := \["16", "36", "11", "26", "48", "46"\]/);
 assert.match(app,/const STATION_IDS := \["interview", "letter", "handover", "written", "practical", "viva", "clinic"\]/);
 assert.match(app,/func _language_save_draft\(/);
 assert.match(app,/func _show_language_studio\(/);
 assert.match(app,/func _practical_tool\(/);
 assert.match(app,/func _practical_target\(/);
 assert.match(app,/func _practical_choice\(/);
});
test('SR32 optional guided practical shows only the chosen original task and stored answer status',()=>{
 for(const value of ['var _procedure_guided := false','var _procedure_step_index := 0',
  'func _set_procedure_guided(enabled: bool) -> void:',
  'func _procedure_move_step(delta: int) -> bool:',
  'func _handle_procedure_input(event: InputEvent) -> void:',
  'if _procedure_guided and step_index != _procedure_step_index:',
  '(_progress["answers"] as Dictionary).get(_key() + ":" + str(step_index), {})',
  'start_guide.pressed.connect(_set_procedure_guided.bind(true))',
  'show_all.pressed.connect(_set_procedure_guided.bind(false))',
  'KEY_N','KEY_P',
  'focused is LineEdit or focused is TextEdit or focused is OptionButton'])
  assert.ok(app.includes(value),value);
 const guide=app.slice(app.indexOf('func _procedure_move_step('),app.indexOf('func _load_source()'));
 assert.match(guide,/clampi\(_procedure_step_index \+ delta, 0, steps.size\(\) - 1\)/);
 assert.match(guide,/_direct_bur_mode = false/);
 assert.doesNotMatch(guide,/(?:cut_to|_direct_cut_world_ray|_record_practical|_mark_studied|_journey_procedure)\(/);
});
test('SR32 preserves single Godot input dispatcher and separate direct bur permission',()=>{
 assert.equal((app.match(/^func _input\(event: InputEvent\) -> void:/gm)||[]).length,1);
 assert.match(app,/_handle_walk_input\(event\)\n\t_handle_procedure_input\(event\)/);
 assert.match(app,/if not _direct_bur_mode or _middle == null or _scene == null:/);
 assert.match(app,/_walk_enter_procedure\(\) -> bool:[\s\S]*?_set_procedure_guided\(true\)/);
 assert.match(app,/func _direct_cut_world_ray\(origin: Vector3, direction: Vector3\) -> bool:/);
});
test('SR32 ships source-exact Godot regression and no owner-PC worker/queue mutation',()=>{
 const builder=read('native-godot/build-app.mjs');
 const workflow=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 const smoke=read('native-godot/guided-practical-smoke.gd');
 assert.match(builder,/guided-practical-smoke\.gd/);
 assert.match(workflow,/SR32_NATIVE_GUIDED_PRACTICAL_SIX_FDI_FSP_KP_PASS/);
 for(const marker of ['KEY_N','KEY_P','KEY_E','FDIS','fspKpByTask','_direct_bur_mode','_practical_target'])
  assert.ok(smoke.includes(marker),marker);
 assert.doesNotMatch(smoke,/(?:OS\.execute|HTTPRequest|KLINIKLAB_PC_CAPTURE|exported-app-capture|godot-worker)/);
});

test('SR33 review-first action skips correct source tasks without scoring or cutting',()=>{
 for(const marker of ['func _procedure_jump_to_review() -> bool:', 'KEY_R',
   'review_button.pressed.connect(_procedure_jump_to_review)',
   'review_button.disabled = needs_review == 0',
   'var candidate: int = (_procedure_step_index + offset) % steps.size()',
   'if not bool(record.get("correct", false)):'])
  assert.ok(app.includes(marker),marker);
 const navigation=app.slice(app.indexOf('func _procedure_jump_to_review()'),app.indexOf('func _handle_procedure_input('));
 assert.match(navigation,/_direct_bur_mode = false/);
 assert.doesNotMatch(navigation,/(?:_record_practical|_save_progress|cut_to|_direct_cut_world_ray|_mark_studied)\(/);
 const smoke=read('native-godot/guided-practical-smoke.gd');
 for(const marker of ['KEY_R','sole review task','All-correct source tasks','wrap-around','removedSamplePoints'])
  assert.ok(smoke.toLowerCase().includes(marker.toLowerCase()),marker);
});


test('SR34 manual practical checklist is persisted, per-case, and distinct from answers and cutting',()=>{
 for(const marker of ['"practicalChecklist": {}','func _procedure_checklist_complete(step_index: int) -> bool:',
  'func _procedure_set_checklist(step_index: int, completed: bool) -> void:',
  'checklist_state.toggled.connect(_procedure_toggle_checklist.bind(step_index))',
  '_save_progress()','Learner checklist: %d/%d manually completed']) assert.ok(app.includes(marker),marker);
 const impl=app.slice(app.indexOf('func _procedure_checklist_complete('),app.indexOf('func _handle_procedure_input('));
 assert.doesNotMatch(impl,/(?:_record_practical|_direct_cut_world_ray|_apply_cut|cut_to|_journey_procedure|_mark_studied)\(/);
 const smoke=read('native-godot/guided-practical-smoke.gd');
 for(const marker of ['SR34_NATIVE_PRACTICAL_CHECKLIST_PERSISTENCE_PASS','_procedure_set_checklist','_load_progress','practicalChecklist','before_answers']) assert.ok(smoke.includes(marker),marker);
});
