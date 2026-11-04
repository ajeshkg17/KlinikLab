import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('SR51 FDI case camera targets unmodified synthetic and source geometry in the central viewport',()=>{
  const app=read('native-godot/app.gd');
  const source=read('native-godot/volume-cut.gd');
  assert.match(source,/position\.x = 2\.9/);
  assert.match(app,/const CAMERA_FOV := 40\.0/);
  assert.match(app,/const CAMERA_ENV_FOV := 42\.0/);
  assert.match(app,/func _camera_content_rect\(\) -> Rect2:/);
  assert.match(app,/func _editable_camera_bounds\(\) -> AABB:/);
  assert.match(app,/mesh\.global_transform \* \(local\.position \+ local\.size/);
  assert.match(app,/func _practical_camera_bounds\(\) -> AABB:/);
  // SR59 supersedes the clipped fixed overview envelope with complete
  // transformed source mesh bounds for either camera mode when visible.
  assert.match(app,/func _visible_practical_reference_bounds\(\) -> AABB:/);
  assert.match(app,/bounds = bounds\.merge\(reference\.grow\(0\.28\)\)/);
  assert.doesNotMatch(app,/var compare_pair: bool = _camera_mode == "overview"/);
  assert.match(app,/func _frame_visible_camera\(\) -> void:/);
  assert.match(app,/camera\.position = Vector3\(eye_x, eye_y, eye_z\)/);
  assert.match(app,/camera\.rotation = Vector3\.ZERO/);
  assert.match(app,/content\.get_center\(\)/);
  assert.match(app,/call_deferred\("_frame_visible_camera"\)/);
  assert.match(app,/var entering_practical := _station_index != 4 and index == 4 and _view == "clinic"/);
  assert.match(app,/var leaving_practical := _station_index == 4 and index != 4 and _view == "clinic"/);
  assert.match(app,/if entering_practical or leaving_practical:/);
  assert.match(app,/_camera_mode = "teeth" if entering_practical else "overview"/);
  assert.match(app,/if _view != "environment" or _walk_active or _scene == null:/);
  assert.match(app,/func _frame_environment_camera\(\) -> void:/);
});

test('SR51 Godot 4.7.2 tests projected mesh bounds, all six FDI identities and three desktop widths',()=>{
  const layout=read('native-godot/visual-layout-smoke.gd');
  const workflow=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
  const nav=read('tests/sr50_native_navigation_responsive.test.mjs');
  assert.match(layout,/const CAMERA_FDI := \["16", "36", "11", "26", "48", "46"\]/);
  assert.match(layout,/func _projected_bounds\(mesh: MeshInstance3D, cam: Camera3D\) -> Rect2:/);
  assert.match(layout,/mesh\.global_transform \* local/);
  assert.match(layout,/cam\.unproject_position\(world\)/);
  assert.match(layout,/for case_index in range\(6\):/);
  assert.match(layout,/for window_width in \[1600, 1280, 1024\]:/);
  assert.match(layout,/pixels\.end\.x <= rect\.end\.x - 2\.0/);
  assert.match(layout,/pixels\.size\.y > rect\.size\.y \* 0\.28/);
  assert.match(layout,/nav_cases\[case_index\]\.button_pressed and nav_stations\[4\]\.button_pressed/);
  assert.match(layout,/case_index in \[0,1,3\]/);
  assert.match(layout,/SR51_SIX_FDI_THREE_WIDTH_CAMERA_FRAMING_PASS/);
  assert.match(nav,/func _frame_visible_camera/);
  assert.match(workflow,/tests\/sr51_native_camera_framing\.test\.mjs/);
  assert.match(workflow,/SR51_SIX_FDI_THREE_WIDTH_CAMERA_FRAMING_PASS/);
});
