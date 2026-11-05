import test from 'node:test';
import assert from 'node:assert/strict';
import { readSourceContract } from './source-contract-text.mjs';

const read=p=>readSourceContract('../'+p,import.meta.url);

test('SR66 only the imported CC0 environment overview gets an elevated 3D depth view',()=>{
 const app=read('native-godot/app.gd');
 const section=app.slice(app.indexOf('func _frame_environment_camera()'),app.indexOf('func _build_app()'));
 const clinic=app.slice(app.indexOf('func _frame_visible_camera()'),app.indexOf('func _environment_room_bounds()'));
 assert.match(section,/if _view != "environment" or _walk_active or _scene == null:/);
 assert.match(section,/var target: AABB = _environment_room_bounds\(\)/);
 assert.match(section,/var back: Vector3 = Vector3\(0\.16, 0\.67, 1\.0\)\.normalized\(\)/);
 assert.match(section,/Basis\.looking_at\(-back, Vector3\.UP\)/);
 assert.match(section,/for xx in \[0\.0, 1\.0\]:[\s\S]*?for yy in \[0\.0, 1\.0\]:[\s\S]*?for zz in \[0\.0, 1\.0\]:/);
 assert.match(section,/var pane_offset: Vector2 = content\.get_center\(\) - screen \* 0\.5/);
 assert.match(section,/absf\(focal \* local\.x \+ pane_offset\.x \* local\.z\)/);
 assert.match(section,/absf\(-focal \* local\.y \+ pane_offset\.y \* local\.z\)/);
 assert.match(section,/camera\.basis = view_basis/);
 assert.doesNotMatch(section,/camera\.rotation = Vector3\.ZERO/);
 assert.doesNotMatch(section,/\.scale\s*=|\.mesh\s*=|\.light_energy\s*=/);
 assert.match(clinic,/camera\.rotation = Vector3\.ZERO/,'tooth comparison camera remains unchanged');
 assert.match(app,/world\.environment\.ambient_light_energy = 0\.36 if show_room else 0\.85/);
 assert.match(app,/key\.light_energy = 0\.65 if show_room else 1\.6/);
 assert.match(app,/fill\.light_energy = 0\.42 if show_room else 1\.2/);
});

test('SR66 real Godot headless regression measures perspective coverage at all owner/compact sizes',()=>{
 const smoke=read('native-godot/visual-layout-smoke.gd');
 const ci=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 assert.match(smoke,/func _validate_sr66_oblique_overview\(app: Node3D/);
 for(const size of ['[1280,720]','[1536,816]','[1536,864]','[1600,900]','[1024,720]'])
  assert.ok(smoke.includes(size),size+' missing');
 assert.match(smoke,/_project_world_box\(target, camera\)/);
 assert.match(smoke,/camera\.global_transform\.is_equal_approx\(active_walk_camera\)/);
 assert.match(smoke,/SR66_ROOM_OBLIQUE_PERSPECTIVE_FIVE_SIZES_PASS/);
 assert.match(ci,/node --test tests\/sr66_environment_oblique_overview\.test\.mjs/);
 assert.match(ci,/grep -F "SR66_ROOM_OBLIQUE_PERSPECTIVE_FIVE_SIZES_PASS"/);
 assert.match(smoke,/SR64_REAL_CC0_ROOM_CENTERED_FIT_AND_LIGHTING_FIVE_SIZES_PASS/);
});

test('SR66 preserves original model hashes and source-original licenses, independent of overview camera',()=>{
 const app=read('native-godot/app.gd');
 const cc0=read('native-godot/cc0-clinic.gd');
 const sidecar=read('native-godot/verify-raw-bundle.mjs');
 const code=app.slice(app.indexOf('func _frame_environment_camera()'),app.indexOf('func _build_app()'));
 assert.doesNotMatch(code,/FileAccess|ResourceLoader|load\(|license|write|Input\.set_mouse_mode/);
 for(const hash of ['9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a','63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036'])
  assert.ok(cc0.includes(hash),'original CC0 source hash preserved');
 assert.match(sidecar,/cc0\.licenseSPDX!=='CC0-1\.0'/);
 assert.match(sidecar,/tooth\.licenseSPDX!=='CC-BY-4\.0'/);
 assert.match(sidecar,/crown\.licenseSPDX!=='CC-BY-4\.0'/);
});
