import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const lab = readSourceContract('../native-godot/procedure-lab.gd', import.meta.url);

test('chair eye-height label stays on one line with reserved header width', () => {
  const ui = lab.slice(lab.indexOf('func _build_ui() -> void:'), lab.indexOf('func _label('));
  assert.match(ui, /title\.autowrap_mode = TextServer\.AUTOWRAP_OFF/);
  assert.match(ui, /title\.clip_text = true/);
  assert.match(ui, /eye_label\.name = "KL_LAB_EYE_HEIGHT_LABEL"/);
  assert.match(ui, /eye_label\.autowrap_mode = TextServer\.AUTOWRAP_OFF/);
  assert.match(ui, /eye_label\.custom_minimum_size\.x = 90\.0/);
  assert.match(ui, /height\.custom_minimum_size\.x = 116\.0/);
  assert.match(ui, /height\.value_changed\.connect\(_set_eye_height\)/);
});

test('active target caption is in the fixed 2D instruction row, never over model geometry', () => {
  const ui = lab.slice(lab.indexOf('func _build_ui() -> void:'), lab.indexOf('func _label('));
  const target = lab.slice(lab.indexOf('func _target('), lab.indexOf('func _aim_selected_target('));
  const status = lab.slice(lab.indexOf('func _show_status('), lab.indexOf('func _event('));
  assert.match(ui, /_active_target_caption\.name = "KL_LAB_ACTIVE_TARGET_CAPTION"/);
  assert.match(ui, /_active_target_caption\.autowrap_mode = TextServer\.AUTOWRAP_OFF/);
  assert.match(ui, /_active_target_caption\.clip_text = true/);
  assert.ok(ui.indexOf('layout.add_child(_active_target_caption)') < ui.indexOf('layout.add_child(_view)'), 'instruction row is above, not inside, the model viewport');
  assert.match(target, /body\.add_child\(collision\)/);
  assert.match(target, /body\.add_child\(label\)/);
  assert.match(target, /_target_picker\.add_item\(caption\)/);
  assert.match(status, /var show_target: bool = stage < 3 and _targets\.has\(next\)/);
  assert.match(status, /_active_target_caption\.text = "Current target · " \+ current_label\.text/);
  assert.match(status, /label\.visible = false/);
  assert.match(status, /var next := "tool" if stage == 0 else "site_%d" % next_target if stage == 1 else "return" if held else "verify"/);
});
