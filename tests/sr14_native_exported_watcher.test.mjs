import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateGodotJob,EXACT_SOURCE_SHA} from '../visual-qa/godot-job-core.mjs';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const job={schemaVersion:8,jobId:'pc-godot-exported-20261101-cc0-fdi36-job09',
 commit:'bd3a62cac84706323c347e84a6e62b808fb5d041',
 suite:'sr14-native-exported-cc0-six-case',sceneMode:'native-exported-cc0',
 graphics:'forward_plus-vulkan',timeoutSec:180,
 capture:'native-exported-cc0-fdi16-fdi36-fdi26-three-pngs',
 launcherContract:'winps51-clear-psmodulepath-sha256-preflight',
 backgroundContract:'private-winsta0-vulkan-autocapture-no-foreground',
 desktopApiContract:'raw-utf16-createdesktopw-bom-safe-recovery',
 telemetryContract:'persistent-pdh-valid-rows-dxgi-luid-42s-orbit-v2'};
test('SR14 new exact source-commit exported-app job distinct from all archived watcher IDs',()=>{
 assert.equal(validateGodotJob(job).commit,job.commit);
 for(const change of [{jobId:'pc-godot-clinic-20261101-job08'}, {sceneMode:'clinic-cases'},
  {graphics:'headless'}, {commit:'123'}, {capture:'native-before-after'},
  {command:'powershell.exe'}]) assert.throws(()=>validateGodotJob({...job,...change}));
 const archived=JSON.parse(read('visual-qa/jobs/godot-job08-original.json'));
 assert.equal(archived.schemaVersion,7);
 assert.equal(archived.commit,EXACT_SOURCE_SHA);
 assert.equal(archived.jobId,'pc-godot-clinic-20261101-job08');
 const active=JSON.parse(read('visual-qa/jobs/godot-current.json'));
 assert.doesNotThrow(()=>validateGodotJob(active));
 if(active.schemaVersion===8){
  assert.notEqual(active.jobId,archived.jobId);
  assert.notEqual(active.commit,EXACT_SOURCE_SHA);
 }else assert.deepEqual(active,archived);
});
test('SR14 PC watcher launches actual EXPORTED app and retains original PID/PDH/DXGI+immutable photo checks',()=>{
 const worker=read('visual-qa/godot-worker.mjs');
 for(const x of ['async function executeNativeExport(j)','if(j.schemaVersion===8)return await executeNativeExport(j)',
  'KlinikLab-Windows-x64-','sr1x-capture-native-exported-app-pc.ps1',
  'kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png',
  'kliniklab-exported-fdi26-practical.png','imageIndependentPixelReviewAccepted:false']){
  assert(worker.includes(x),x);
 }
 const launch=read('visual-qa/sr1c-private-desktop.ps1');
 assert.match(launch,/function Start-KLPrivateDesktopExportedApp/);
 assert.match(launch,/--kliniklab-native-pc-capture=/);
 assert.match(launch,/CreateDesktopRaw/);
 const pc=read('visual-qa/sr1x-capture-native-exported-app-pc.ps1');
 for(const x of ['KlinikLab.exe','native-build-manifest.json','Get-Counter -Counter',
  'ConvertTo-KLGodotGpu3DRows','FromGpuEnginePath','process3DPositiveRtx5060DistinctPeriods',
  'nativeImagePresent','thirdImagePresent','godot-owner-pc-result.json']){
  assert(pc.includes(x),x);
 }
 const app=read('native-godot/owner-pc-capture.gd');
 assert.match(app,/--kliniklab-native-pc-capture/);
 assert.match(app,/overview-fdi16.png/);
 assert.match(app,/practical-fdi36.png/);
 assert.match(app,/practical-fdi26.png/);
 assert.match(app,/KLINIKLAB_PC_CAPTURE_DIR/);
 assert.doesNotMatch(app,/HTTPRequest|OS.shell_open|API_KEY/);
});
