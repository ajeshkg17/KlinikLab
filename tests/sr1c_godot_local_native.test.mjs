import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const script=read('visual-qa/godot-local-clinical/main.gd');
const descriptor=read('visual-qa/godot-local-clinical/project.godot');
const scene=read('visual-qa/godot-local-clinical/main.tscn');
const runner=read('visual-qa/sr1c-build-godot-local.ps1');
const roadmap=read('visual-qa/PHASE_ROADMAP.md');
const arch=read('visual-qa/SERVER_RENDERING_ARCHITECTURE.md');
const guide=read('visual-qa/SR1C_GODOT_LOCAL_CLINICAL_RENDER.md');

test('Authoritative roadmap/architecture select Godot 4.7.2 first, retain failed Unreal evidence and defer streaming',()=>{
 assert(roadmap.startsWith('# Engine decision override'));
 for(const t of ['Godot 4.7.2','Unreal 5.8.4 status: EXPLORATORY/PAUSED',
   '14,856','14,936','Dundee','Unity Hub','Quest','SR1C_GODOT_LOCAL_CLINICAL_RENDER.md'])
   assert(roadmap.includes(t),t);
 assert(arch.startsWith('> **New binding engine selection'));
 for(const t of ['Godot 4.7.2','not accepted','Quest','WebRTC'])assert(arch.includes(t),t);
 assert(guide.includes('C:\\klab-sr1b-clinical-57801f1c-20261031-174525'));
 assert(guide.includes('C:\\klab-sr1b-clinical-d5371fe0-20261031-183117'));
 assert(guide.includes('not accepted')||guide.includes('REJECTED'));
});

test('Godot project uses native Vulkan Forward+ rather than default OpenGL/Quest or Unreal',()=>{
 assert(descriptor.includes('config/name="KlinikLab SR1C Native Godot FDI16"'));
 assert(descriptor.includes('renderer/rendering_method="forward_plus"'));
 assert(descriptor.includes('rendering_device/driver="vulkan"'));
 assert(descriptor.includes('rendering_device/fallback_to_opengl3=false'));
 assert(scene.includes('path="res://main.gd"'));
 assert(!script.includes('dundee')&&!script.includes('Dundee'));
 assert(!descriptor.includes('PixelStreaming')&&!descriptor.includes('Quest'));
});
test('Original production source faces and materials are directly submitted into ten strict Godot ArrayMesh sections',()=>{
 for(const t of [
 'FileAccess.get_sha256(SOURCE_PREFIX + source_name)',
 'manifest.get("sourceGitSHA", "")',
 'var parsed_mesh: Dictionary = _parse_obj(source_path)',
 'get("byMaterial", {})',
 '"enamel", "dentin", "pulp", "cementum", "caries"',
 'indices.append(start + 2)',
 'mesh_arrays[Mesh.ARRAY_INDEX] = indices',
 'mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, mesh_arrays)',
 'mesh.surface_get_array_index_len(0) != expected * 3',
 'mesh.surface_set_material(0, surface_material)',
 'surface_material.cull_mode = BaseMaterial3D.CULL_DISABLED',
 'root.name = "KL_FDI16_" + state.to_upper()',
 'state_report["nativeSurfaceCount"] != 5',
 '!= 14856',
 '!= 14936',
 'RenderingServer.get_current_rendering_method()',
 '!= "forward_plus"']) assert(script.includes(t),t);
 assert(!script.includes('StaticMesh.create_static_mesh_description'));
 assert(!script.includes('reduce_mesh'));
});

test('Original viewport PNG capture occurs after frame_post_draw and never self-accepts GPU or clinical image',()=>{
 assert(script.includes('await RenderingServer.frame_post_draw'));
 assert(script.includes('get_viewport().get_texture().get_image()'));
 assert(script.includes('image.save_png(output)'));
 assert(script.includes('nativeScreenshotReviewed": false'));
 assert(script.includes('processGpuVerified": false'));
 assert(script.includes('status"] = "NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU"'));
 assert(script.includes('_capture_folder()'));
});

test('Godot local Windows runner refuses reused paths, hashes production OBJ, preserves all exact original source counts',()=>{
 for(const t of [
 'Refusing to overwrite/reuse Godot evidence',
 'git -C $repo rev-parse HEAD',
 '--expected-sha=$sha',
 'FileHash',
 'enamel=10320','enamel=10308','pulp=207',
 'cementum=4105','caries=111',
 'SOURCE_EXPORTED_GODOT_PROJECT_READY_NOT_RENDERED',
 'godotEditorVersionConfirmedOnThisRun=$false',
 'nativeScreenshotReviewed=$false',
 'processSpecificGpuVerified=$false',
 'questVerified=$false',
 'capture-path.txt',
 'expected-sha.txt',
 ])assert(runner.includes(t),t);
});
test('Existing source exporter still generates the same 14856/14936 FDI16 faces in actual production code',()=>{
 const cmd=process.execPath;
 const p=spawnSync(cmd,['--test','tests/sr1b_local_kliniklab_export.test.mjs'],
  {cwd:root,encoding:'utf8',timeout:30000});
 assert.equal(p.status,0,p.stderr||p.stdout);
});
