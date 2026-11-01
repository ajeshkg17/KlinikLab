import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateGodotJob,EXACT_SOURCE_SHA} from '../visual-qa/godot-job-core.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha='bd3a62cac84706323c347e84a6e62b808fb5d041';
test('SR14 independently identifies exact new exported app SHA and preserves historic evidence schema',()=>{
 const job={
  schemaVersion:8,jobId:'pc-godot-exported-20261101-cc0-native-job09',commit:sha,
  suite:'sr14-native-exported-cc0-six-case',sceneMode:'native-exported-cc0',
  graphics:'forward_plus-vulkan',timeoutSec:180,capture:'native-exported-cc0-and-fdi36-two-pngs',
  launcherContract:'winps51-clear-psmodulepath-sha256-preflight',
  backgroundContract:'private-winsta0-vulkan-autocapture-no-foreground',
  desktopApiContract:'raw-utf16-createdesktopw-bom-safe-recovery',
  telemetryContract:'persistent-pdh-valid-rows-dxgi-luid-42s-orbit-v2'
 };
 assert.equal(validateGodotJob(job).commit,sha);
 assert.throws(()=>validateGodotJob({...job,jobId:'pc-godot-clinic-20261101-job08'}));
 assert.throws(()=>validateGodotJob({...job,sceneMode:'clinic-cases'}));
 assert.throws(()=>validateGodotJob({...job,commit:EXACT_SOURCE_SHA.slice(0,30)}));
 assert.throws(()=>validateGodotJob({...job,graphics:'compatibility'}));
 assert.throws(()=>validateGodotJob({...job,requestUrl:'https://untrusted.invalid/'}));
 const archived=JSON.parse(read('visual-qa/jobs/godot-job08-original.json'));
 assert.equal(archived.schemaVersion,7);
 assert.equal(archived.commit,EXACT_SOURCE_SHA);
 assert.equal(archived.jobId,'pc-godot-clinic-20261101-job08');
 const active=JSON.parse(read('visual-qa/jobs/godot-current.json'));
 validateGodotJob(active);
 if(active.schemaVersion===8){
  assert.notEqual(active.commit,EXACT_SOURCE_SHA);
  assert.notEqual(active.jobId,archived.jobId);
 }else{
  assert.equal(active.schemaVersion,7);
  assert.deepEqual(active,archived);
 }
});
test('SR14 actual EXPORTED EXE PC evidence path is isolated from original prototype job07/08',()=>{
 const worker=read('visual-qa/godot-worker.mjs');
 assert.match(worker,/async function executeNativeExport\(j\)/);
 assert.match(worker,/if\(j.schemaVersion===8\)return await executeNativeExport\(j\)/);
 assert.match(worker,/KlinikLab-Windows-x64-/);
 assert.match(worker,/native-exported-app-result\.json/);
 assert.match(worker,/sr1x-capture-native-exported-app-pc\.ps1/);
 assert.match(worker,/NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_REVIEW/);
 const launch=read('visual-qa/sr1c-private-desktop.ps1');
 assert.match(launch,/function Start-KLPrivateDesktopExportedApp/);
 assert.match(launch,/-- --kliniklab-exported-pc-capture/);
 assert.doesNotMatch(launch.split('function Start-KLPrivateDesktopExportedApp')[1],/--script res:\/\/exported-app-capture\.gd/);
 const embedded=read('native-godot/exported-app-capture-node.gd');
 const app=read('native-godot/app.gd');
 const builder=read('native-godot/build-app.mjs');
 assert.match(embedded,/extends Node/);
 assert.match(embedded,/func run\(app: Node3D\)/);
 assert.match(embedded,/KLINIKLAB_PC_CAPTURE_DIR/);
 assert.match(embedded,/KLINIKLAB_PC_EXPECTED_SHA/);
 assert.match(embedded,/get_viewport\(\).get_texture\(\)/);
 assert.match(embedded,/tex\.get_image\(\)/);
 assert.match(embedded,/native-exported-app-result\.json/);
 assert.match(embedded,/kliniklab-exported-cc0-environment\.png/);
 assert.match(embedded,/kliniklab-exported-fdi36-practical\.png/);
 assert.match(embedded,/wholeMeshInstances/);
 assert.match(embedded,/trayMeshInstances/);
 assert.match(embedded,/sourceGitSHA/);
 assert.match(embedded,/selectedFDI/);
 assert.match(app,/--kliniklab-exported-pc-capture/);
 assert.match(app,/load\("res:\/\/exported-app-capture-node\.gd"\)/);
 assert.match(builder,/exported-app-capture-node\.gd/);
 assert.doesNotMatch(embedded,/HTTPClient|HTTPRequest|API_KEY|SetForegroundWindow|--headless/);
 assert.match(embedded,/SR18_CAPTURE_NODE_STARTED/);
 assert.match(embedded,/SR18_CAPTURE_NODE_STAGE/);
 assert.match(embedded,/stage.*completed/);
 assert.match(embedded,/stage.*blocked/);
 assert.match(embedded,/Time\.get_ticks_msec\(\)-_start_ms>90000/);
 assert.match(embedded,/--kliniklab-exported-pc-capture/);
 const capture=read('visual-qa/sr1x-capture-native-exported-app-pc.ps1');
 assert.match(capture,/process3DPositiveRtx5060DistinctPeriods/);
 assert.match(capture,/gpuAdapterLuidMatchedToNvidia/);
 const gpuDecision=capture.indexOf('$script:report.godotProcessGPUCorroborated=$gpuProcessConfirmed');
 const nativeWait=capture.indexOf('$nativeFile=Join-Path $capture');
 assert.ok(gpuDecision>0&&nativeWait>gpuDecision,'GPU attribution must be decided before the independent native capture report wait');
 assert.match(capture,/\$pdhAliveStart -and \$pdhAliveEnd/);
 assert.match(capture,/processAliveAtGpuSamplingStart/);
 assert.match(capture,/rendererReportConfirmsNvidiaRtx5060/);
 assert.doesNotMatch(capture.slice(nativeWait),/\$script:report\.godotProcessGPUCorroborated=/);
 assert.match(capture,/\$lastCaptureStage -in @\('completed','blocked'\)/);
 assert.match(capture,/KLINIKLAB_SR1C_CAPTURE_DIR/);
 assert.match(capture,/KlinikLab\.exe/);
 assert.match(capture,/native-build-manifest\.json/);
 assert.match(capture,/nativeImagePresent/);
 const godot=read('native-godot/exported-app-capture.gd');
 assert.match(godot,/res:\/\/app\.tscn/);
 assert.match(godot,/source\/expected-sha\.txt/);
 assert.match(godot,/kliniklab-exported-cc0-environment\.png/);
 assert.match(godot,/kliniklab-exported-fdi36-practical\.png/);
 assert.match(godot,/_toggle_direct_bur/);
 assert.match(godot,/EXPORTED_APP_TWO_NATIVE_PNGS_PENDING_INDEPENDENT_PIXEL_GPU_REVIEW/);
 assert.doesNotMatch(godot,/HTTPRequest|OS\.shell_open|API_KEY/);
});
