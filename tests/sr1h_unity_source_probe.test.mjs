import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const cmd=read('../visual-qa/run-unity-source-probe.ps1');
const cs=read('../visual-qa/unity-probe/KlinikLabUnitySourceProbe.cs');
test('Unity experiment is independently pinned to immutable original FDI16 model',()=>{
 for(const token of ['f4d4d4151851a08342def08d9f2e461f5f5e7109',
  'git -C $repo worktree add --detach',
  'sr1-local-kliniklab-export.mjs','kliniklab-export-manifest.json',
  'Get-FileHash','14856','14936','KlinikLabUnityProbe']){
  assert.ok(cmd.includes(token),token);
 }
 assert.match(cmd,/Unity\.exe/);
 assert.match(cmd,/sourceGitSHA/);
 assert.match(cmd,/KlinikLabUnitySourceProbe\.Run/);
});
test('Unity import verifies original OBJ SHA256, five tissues and actual imported triangles',()=>{
 for(const x of ['SHA256.Create','ExpectedHash','JsonUtility.FromJson',
  'enamel','dentin','pulp','cementum','caries',
  'PrefabUtility.InstantiatePrefab','GetIndexCount',
  'before==14856 && after==14936',
  'EditorSceneManager.SaveScene',
  'UNITY_SOURCE_IMPORTED_SCENE_SAVED_NO_GPU_RENDER']){
  assert.ok(cs.includes(x),x);
 }
});
test('No old Godot job or Unity process GPU acceptance, no foreground switches or screenshots',()=>{
 for(const x of ['-batchmode','-nographics','-quit','300000','taskkill.exe',
  'KlinikLabUnityProbe','[guid]::NewGuid']){
  assert.ok(cmd.includes(x),x);
 }
 for(const blocked of ['godot-worker.mjs','godot-ledger.json',
  'godot-current.json','godot-owner-pc-result.json',
  'SendKeys','SwitchDesktop','SetForegroundWindow',
  'Start-ScheduledTask','Stop-ScheduledTask']){
   assert.ok(!cmd.includes(blocked),'potential cross-engine mutation '+blocked);
 }
 assert.match(cs,/processGpuVerified = false/);
 assert.match(cs,/fullKlinikLabApplicationMigrated = false/);
 assert.match(cs,/clinicalAccuracyVerified = false/);
 assert.ok(!cs.includes('ScreenCapture.CaptureScreenshot'));
 assert.ok(!cs.includes('UnityEditor.BuildPipeline.BuildPlayer'));
});
