import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('SR59 fixes the actual owner-pixel camera/header regression cause without removing source disclosure', () => {
  const app = read('native-godot/app.gd');
  const legacy = read('visual-qa/sr1c-godot-clinic-overview.gd');
  assert.match(legacy, /KL_NATIVE_WORKSPACE_STATUS_HUD/);
  assert.match(legacy, /Workspace migration prototype/);
  assert.match(app, /get_node_or_null\("KL_NATIVE_WORKSPACE_STATUS_HUD"\)/);
  assert.match(app, /obsolete_hud\.visible = false/);
  assert.match(app, /_status_footer\.name = "KL_NATIVE_STATUS_FOOTER"/);
  assert.match(app, /not clinical or exam validated/);
  assert.match(app, /outer\.add_child\(_status_footer\)/);
  assert.match(app, /top\.add_child\(_toolbar\)/);
  assert.match(app, /_toolbar\.add_child\(camera_button\)/);
  assert.match(app, /func _update_toolbar_columns\(\) -> void:/);
});

test('SR59 camera fits actual imported reference mesh AABB, not one anchor or fixed envelope', () => {
  const app = read('native-godot/app.gd');
  for (const fragment of [
    'func _expand_visible_mesh_bounds(root: Node, extrema: Dictionary) -> void:',
    'instance.get_aabb()',
    'instance.global_transform * (local.position + local.size',
    'if root is Node3D and not (root as Node3D).is_visible_in_tree():',
    'func _visible_practical_reference_bounds() -> AABB:',
    'roots.append(_tooth16_mirror)',
    'roots.append(_tooth36_reference)',
    'roots.append(_tooth26_reference)',
    'KL_FDI16_BEFORE',
    'KL_FDI16_AFTER',
    'func _practical_camera_bounds() -> AABB:',
    '_visible_practical_reference_bounds()',
    'bounds = bounds.merge(reference.grow(0.28))',
    'if _view == "clinic" and _station_index == 4:',
    'call_deferred("_frame_visible_camera")'
  ]) assert.ok(app.includes(fragment), fragment);
  assert.doesNotMatch(app, /compare_pair: bool = _camera_mode == "overview"/);
  assert.doesNotMatch(app, /return AABB\(Vector3\(-4\.55, -1\.95, -1\.65\)/);
  const fdi = read('native-godot/tooth36-reference.gd');
  assert.match(fdi, /_tooth\.position = Vector3\(-2\.7,0\.15,0\.0\)/);
  assert.match(fdi, /mandibular_first_molar-godot\.glb/);
  assert.match(app, /if _case_index == 1:/);
});

test('SR59 CI gates entire source reference footprint and header at four actual desktop sizes', () => {
  const layout = read('native-godot/visual-layout-smoke.gd');
  const workflow = read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
  assert.match(layout, /func _validate_six_fdi_full_reference_fit\(app: Node3D, physical_width: int, physical_height: int\)/);
  assert.match(layout, /func _project_world_box\(box: AABB, camera: Camera3D\) -> Rect2:/);
  assert.match(layout, /func _validate_header_separation\(app: Node3D, physical_width: int, physical_height: int\)/);
  assert.match(layout, /for case_i in range\(6\):/);
  assert.match(layout, /for mode in \["overview", "teeth"\]:/);
  assert.match(layout, /actual_ref: AABB = app.call\("_visible_practical_reference_bounds"\)/);
  assert.match(layout, /ref_pixels\.position\.x >= safe\.position\.x \+ 1\.0/);
  assert.match(layout, /ref_pixels\.end\.x <= safe\.end\.x - 1\.0/);
  assert.match(layout, /actual_ref\.size\.length_squared\(\) < 0\.000001/);
  for (const size of ['[1600,900]','[1280,900]','[1024,900]','[1280,720]'])
    assert.ok(layout.includes(size), size);
  assert.match(layout, /SR59_ALL_SIX_FDI_REAL_REFERENCE_FULL_BOUNDS_AND_HEADER_FOUR_SIZES_PASS/);
  assert.match(workflow, /tests\/sr59_reference_viewport_header\.test\.mjs/);
  assert.match(workflow, /SR59_ALL_SIX_FDI_REAL_REFERENCE_FULL_BOUNDS_AND_HEADER_FOUR_SIZES_PASS/);
});
