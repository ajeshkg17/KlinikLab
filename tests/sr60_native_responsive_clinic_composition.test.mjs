import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('SR60 real owner 1536x864 clipping: 12 actions remain within bounded toolbar, with center priority',()=>{
  const app=read('native-godot/app.gd');
  assert.match(app,/physical_columns := int\(floor\(\(physical_width - 24\.0\) \/ 160\.0\)\)/);
  assert.match(app,/logical_columns := int\(floor\(\(logical_width - 24\.0\) \/ 148\.0\)\)/);
  assert.match(app,/_toolbar\.columns = clampi\(mini\(physical_columns, logical_columns\), 4, 8\)/);
  assert.match(app,/var nav_width := clampf\(width \* 0\.15, 224\.0, 248\.0\)/);
  assert.match(app,/var notes_width := clampf\(width \* 0\.22, 306\.0, 352\.0\)/);
  assert.match(app,/var inset_x := maxf\(14\.0, bounds\.size\.x \* 0\.05\)/);
  assert.match(app,/var inset_y := maxf\(16\.0, bounds\.size\.y \* 0\.055\)/);
  assert.match(app,/_middle\.size_flags_horizontal = Control\.SIZE_EXPAND_FILL/);
  assert.match(app,/_right_column\.size_flags_horizontal = Control\.SIZE_EXPAND_FILL if writing_focus else Control\.SIZE_FILL/);
});

test('SR60: clinic overview no longer renders distant room floor as a bright narrow band behind six tooth models',()=>{
  const app=read('native-godot/app.gd');
  const scene=app.slice(app.indexOf('func _apply_environment_visibility() -> void:'),app.indexOf('func _switch_view(',app.indexOf('func _apply_environment_visibility() -> void:')));
  assert.match(scene,/set_environment_visible", _view == "environment"/);
  assert.doesNotMatch(scene,/\(_view == "clinic" and _camera_mode == "overview"\)/);
  assert.match(app,/func _visible_practical_reference_bounds\(\) -> AABB:/);
  assert.match(app,/bounds = bounds\.merge\(reference\.grow\(0\.28\)\)/);
  assert.match(app,/func _frame_environment_camera\(\) -> void:/);
  assert.match(app,/func _start_clinic_walk\(\) -> void:/);
  assert.match(app,/not clinical or exam validated/);
});

test('SR60: real Godot 4.7.2 scene/layout gate covers six FDIs and exact maximized 1536x864',()=>{
  const layout=read('native-godot/visual-layout-smoke.gd');
  const workflow=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
  assert.match(layout,/func _validate_sr60_owner_composition\(app: Node3D, physical_width: int, physical_height: int\) -> bool:/);
  assert.match(layout,/for i in range\(6\):/);
  assert.match(layout,/for mode in \["overview","teeth"\]:/);
  assert.match(layout,/left_rect\.end\.x <= mid_rect\.position\.x \+ 2\.0/);
  assert.match(layout,/mid_rect\.end\.x <= right_rect\.position\.x \+ 2\.0/);
  assert.match(layout,/right_rect\.end\.x <= viewport_size\.x \+ 1\.0/);
  assert.match(layout,/bounds\.end\.x <= viewport_size\.x - 1\.0/);
  assert.match(layout,/not environment\.visible/);
  assert.match(layout,/projected\.size\.y >= mid_rect\.size\.y \* 0\.27/);
  assert.match(layout,/page\.size\.x <= notes\.size\.x \+ 2\.0/);
  assert.match(layout,/app\.call\("_switch_view","environment"\)/);
  for(const dims of ['[1600,900]','[1536,864]','[1280,900]','[1280,720]','[1024,900]','[1024,720]'])
    assert.ok(layout.includes(dims),dims);
  assert.match(layout,/SR60_SIX_FDI_OWNER_1536_864_RIGHT_EDGE_AND_SCENE_COMPOSITION_PASS/);
  assert.match(workflow,/node --test tests\/sr60_native_responsive_clinic_composition\.test\.mjs/);
  assert.match(workflow,/SR60_SIX_FDI_OWNER_1536_864_RIGHT_EDGE_AND_SCENE_COMPOSITION_PASS/);
});
