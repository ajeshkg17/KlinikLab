import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const project=JSON.parse(read('visual-qa/ue5_8-kliniklab-local/KlinikLab_SR1B_Local.uproject'));
const runner=read('visual-qa/sr1b-run-local-kliniklab.ps1');
const importer=read('visual-qa/sr1b-unreal-build-clinical-level.py');
const mapConfig=read('visual-qa/ue5_8-kliniklab-local/Config/DefaultEngine.ini');
const roadmap=read('visual-qa/PHASE_ROADMAP.md');
const nativeDoc=read('visual-qa/SR1B_LOCAL_KLINIKLAB_RENDER.md');

test('Isolated native UE5.8 clinical project is not the blank GPU probe and has no Quest/network plugins',()=>{
 assert.equal(project.EngineAssociation,'5.8');
 assert.equal(project.FileVersion,3);
 assert(project.Plugins.some(p=>p.Name==='PythonScriptPlugin'&&p.Enabled));
 assert(project.Plugins.some(p=>p.Name==='EditorScriptingUtilities'&&p.Enabled));
 assert(!project.Plugins.some(p=>/PixelStreaming|OpenXR|WebXR|Quest/i.test(p.Name)));
 assert(mapConfig.includes('DefaultGraphicsRHI_DX12'));
 assert(mapConfig.includes('/Game/Maps/L_KlinikLab_FDI16'));
 assert(!mapConfig.includes('PixelStreaming'));
});
test('Python importer strictly checks hashed source before constructing a native scene with FDI16 before/after meshes',()=>{
 for(const token of [
  "MODEL_NAMES = ('fdi16-before.obj', 'fdi16-after-cut.obj')",
  "manifest.get('sourceGitSHA') == expected",
  "hash_file(folder / name) == digest",
  'unreal.AssetImportTask()',
  'get_num_triangles(0)',
  'importedTrianglesLOD0',
  'unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks',
  'unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)',
  'new_level(LEVEL)',
  'unreal.StaticMeshActor',
  'unreal.TextRenderActor',
  'unreal.CameraActor',
  'KL_FDI16_BEFORE_SOURCE_MESH',
  'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH',
  'EDUCATIONAL GEOMETRY',
  'save_current_level()',
  'independentPixelReviewAccepted',
  'verifiedProcessGPUEngineActivity',
  'quest2Verified'
 ])assert(importer.includes(token),token);
 assert(!importer.includes('unreal.PixelStreaming'));
 assert(!importer.includes('localhost'));
});
test('Local clinical evidence runner is unique, source-pinned and fails closed on absent GPU/image evidence',()=>{
 for(const token of [
  "ValidateSet('Build','Open','Collect')",
  'Refusing to overwrite existing native clinical evidence',
  '--expected-sha=$sha',
  'KLINIKLAB_SR1B_SHA',
  'KLINIKLAB_SR1B_EVIDENCE_DIR',
  'KLINIKLAB_SR1B_MESH_DIR',
  'UnrealEditor-Cmd.exe',
  '-ExecutePythonScript=',
  'HighResShot',
  "Name = 'UnrealEditor.exe'",
  'gpu-engine-3d-pid-samples.json',
  'native-level-file-hashes.json',
  'nativeLevelSHA256',
  'NATIVE_ASSET_FILES_HASHED_NOT_RENDERED',
  "'\\GPU Engine(*)\\Utilization Percentage'",
  'engtype_3d',
  'pid_$($p.ProcessId)_',
  'nativeScreenshotFreshForProcess',
  'selectedD3D12GPUClassification',
  'gpuAdapterLuidMatchedToNVIDIA=$false',
  'independentNativePixelReviewPassed=$false',
  'pixelStreaming2Verified=$false',
  'quest2Verified=$false'
 ])assert(runner.includes(token),token);
 assert(!runner.includes('Start-Process -FilePath $editor -ArgumentList @("-PixelStreaming'));
 assert(!runner.includes('libx264'));
 assert.equal((runner.match(/\[CmdletBinding\(\)\]/g)||[]).length,1);
 assert.equal((runner.match(/# Never touches existing blank-project evidence/g)||[]).length,1);
});
test('Priority order in roadmap and operator guide is unambiguous: native clinical first, Quest deferred',()=>{
 assert(roadmap.indexOf('# Priority override')===0);
 assert(roadmap.indexOf('SR1B NEW highest-priority unresolved gate')>0);
 assert(roadmap.includes('ONLY after (1)–(4) verified, start SR2'));
 assert(nativeDoc.includes('LOCAL KLINIKLAB ON OWNER RTX 5060 FIRST'));
 assert(nativeDoc.includes('No screenshot may be fabricated'));
 assert(nativeDoc.includes('SR1B stays'));
});
test('Unreal build script parses as normal Python without importing unavailable unreal module',t=>{
 const cmd=process.platform==='win32'?'python':'python3';
 const p=spawnSync(cmd,['-c','import ast,sys;ast.parse(open(sys.argv[1],encoding="utf8").read())',
  path.join(root,'visual-qa/sr1b-unreal-build-clinical-level.py')],{encoding:'utf8',timeout:15000});
 if(p.error?.code==='ENOENT'){t.skip('Python not found on this CI host');return}
 assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));
});
test('Five Unreal imported tissue assets form distinct attached clinical tooth assemblies with per-section parity',()=>{
 for(const token of [
  'from sr1b_section_contract import MATERIALS, validate_sections',
  'unreal.StaticMeshActor',
  'attach_to_actor(',
  'unreal.AttachmentRule.KEEP_WORLD',
  'get_attach_parent_actor() == root',
  'get_attached_actors()',
  "require('enamel' in sections",
  "report['actorHierarchy']",
  "report['importedMaterialSections']",
  "manifest['sceneStates']['before']['byMaterial']",
  "manifest['sceneStates']['after']['byMaterial']",
  "report['importedTrianglesLOD0']",
  "sum(item['proceduralTrianglesSubmitted'] for item in groups.values())",
  'get_editor_property(\'static_materials\')',
  "get_editor_property('material_interface')"
 ])assert(importer.includes(token),token);
 assert(!importer.includes('require(len(meshes) == 1'),'must support real UE multi-object OBJ import');
 assert(!importer.includes('merge_static_mesh_actors'),'merging without verified material preservation is not allowed');
 assert(runner.includes('KLINIKLAB_SR1B_SCRIPT_DIR'));
 assert(runner.includes('Missing native section uasset'));
 assert(runner.includes('Aggregate native LOD0 triangle parity failed'));
 assert(runner.split('\\n').length<300,'PowerShell duplicate body detected');
 assert.equal((runner.match(/^if\(\$Mode -eq 'Collect'\)/gm)||[]).length,1);
});
test('Pure native tissue-section contract exercises actual before/after aggregate counts and fails on swapped or missing materials',t=>{
 const cmd=process.platform==='win32'?'python':'python3';
 const p=spawnSync(cmd,[path.join(root,'tests/sr1b_section_contract_test.py')],
  {encoding:'utf8',timeout:20000});
 if(p.error?.code==='ENOENT'){t.skip('Python not found on this CI host');return}
 assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));
});

test('Original triangle stream native fallback is source-hashed, uses Unreal StaticMeshDescription and never accepts a reduced mesh',t=>{
 const strict=[
  'from sr1b_topology_source import read_obj_triangles',
  'read_obj_triangles(path, expected_counts)',
  'def report_mesh_source_build(mesh):',
  "get_static_mesh_description(0)",
  'get_lod_build_settings(mesh, 0)',
  "settings.set_editor_property(flag, False)",
  "subsystem.set_lod_build_settings(mesh, 0, settings)",
  "save_loaded_asset(mesh)",
  'def rebuild_from_source_triangle_stream(mesh, triangles, material):',
  'unreal.StaticMesh.create_static_mesh_description()',
  "smd.create_triangle(group, instances)",
  'mesh.build_from_static_mesh_descriptions([smd], False, False)',
  'get_num_triangles(0)',
  'directSourceMeshDescriptionReconstruction',
  "source_interface.set_editor_property('two_sided', True)",
  "diag['nativeMaterialTwoSided'] = True",
  'SOURCE_OBJ_NATIVE_STATICMESHDESCRIPTION_NO_REDUCTION',
 ];
 for(const part of strict)assert(importer.includes(part),part);
 const cmd=process.platform==='win32'?'python':'python3';
 const p=spawnSync(cmd,[path.join(root,'tests/sr1b_topology_source_test.py')],
  {encoding:'utf8',timeout:30000});
 if(p.error?.code==='ENOENT'){t.skip('Python not installed');return}
 assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));
});

test('UE5.8 production faces bypass destructive StaticMesh render LOD using native persistent procedural mesh buffers',t=>{
 assert(project.Plugins.some(x=>x.Name==='ProceduralMeshComponent'&&x.Enabled),
  'native UE runtime plugin is explicitly enabled');
 for(const token of [
  "from sr1b_procedural_buffers import exact_source_buffers",
  'def native_procedural_tooth_actor(',
  'unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)',
  'k2_gather_subobject_data_for_instance(root)',
  'unreal.AddNewSubobjectParams(',
  'unreal.ProceduralMeshComponent',
  'create_mesh_section_linear_color(',
  'get_num_sections() == 1',
  'sourceCoordinateSHA256',
  'nativeProceduralSourceTrianglesSubmitted',
  'sourceTopologyAcceptedInProceduralInput',
  'savedProceduralTriangleIndexReadbackVerified',
  'verify_reloaded_procedural_scene(',
  'staticMeshRenderLOD0Triangles_DIAGNOSTIC_ONLY'
 ])assert(importer.includes(token),token);
 assert(runner.includes('Native procedural source topology parity failed'));
 assert(runner.includes('nativeProceduralSourceTrianglesSubmitted'));
 assert(!importer.includes("        before, before_rows = import_native_obj("),
  'lossy static mesh must not be selected as dental render geometry');
 const cmd=process.platform==='win32'?'python':'python3';
 const p=spawnSync(cmd,[path.join(root,'tests/sr1b_procedural_buffers_test.py')],
  {encoding:'utf8',timeout:40000});
 if(p.error?.code==='ENOENT'){t.skip('Python unavailable');return}
 assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));
});

test('PowerShell clinical collector parse check on systems equipped with PowerShell',t=>{
 const script=path.join(root,'visual-qa/sr1b-run-local-kliniklab.ps1').replace(/'/g,"''");
 const command=`$null=$tokens=$errors=$null; [System.Management.Automation.Language.Parser]::ParseFile('${script}',[ref]$tokens,[ref]$errors)|Out-Null; if($errors.Count -gt 0){$errors|ForEach-Object {Write-Error $_.Message};exit 2}`;
 const p=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:15000});
 if(p.error?.code==='ENOENT'){t.skip('No PowerShell executable in this runner');return}
 assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));
});
