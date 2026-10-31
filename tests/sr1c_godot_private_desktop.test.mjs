import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGodotJob} from '../visual-qa/godot-job-core.mjs';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const privateScript=read('../visual-qa/sr1c-private-desktop.ps1');
const collector=read('../visual-qa/sr1c-capture-godot-background-pc.ps1');
const gd=read('../visual-qa/sr1c-godot-background-capture.gd');
const worker=read('../visual-qa/godot-worker.mjs');
const xr=read('../visual-qa/xr-worker.mjs');
const job=JSON.parse(read('../visual-qa/jobs/godot-current.json'));

test('Godot job04 is newly scoped to no foreground/private WinSta0 desktop, old v3 watcher rejects',()=>{
 assert.equal(validateGodotJob(job).jobId,'pc-godot-fdi16-20261031-job04');
 assert.equal(job.schemaVersion,4);
 assert.equal(job.backgroundContract,'private-winsta0-vulkan-autocapture-no-foreground');
 assert.equal(job.desktopApiContract,'raw-utf16-createdesktopw-bom-safe-recovery');
 assert.notEqual(job.jobId,'pc-godot-fdi16-20261031-job03');
 assert.equal(job.commit,'f4d4d4151851a08342def08d9f2e461f5f5e7109');
 assert.throws(()=>validateGodotJob({...job,schemaVersion:3}));
 assert.throws(()=>validateGodotJob({...job,backgroundContract:null}));
 assert.notEqual(job.jobId,'pc-godot-fdi16-20261031-job02');
 assert.notEqual(job.jobId,'pc-godot-fdi16-20261031-job01');
});

test('Windows GPU process is launched in a never-switched PRIVATE desktop without input/focus API',()=>{
 assert(privateScript.includes('CreateDesktop('));
 assert(privateScript.includes('CreateProcess('));
 assert(privateScript.includes("lpDesktop='WinSta0\\'"));
 assert(privateScript.includes('wShowWindow=4')); // SW_SHOWNOACTIVATE
 assert(privateScript.includes('--rendering-method forward_plus --rendering-driver vulkan'));
 assert(privateScript.includes('--script res://sr1c-godot-background-capture.gd'));
 const runnable=[privateScript,collector,worker,gd].join('\n')
   .split('\n').filter(x=>!/^\s*(#|\/\/|\*)/.test(x)).join('\n');
 for(const prohibited of [
  /SetForegroundWindow\s*\(/,/SwitchDesktop\s*\(/,
  /SendKeys/,/SendInput\s*\(/,
  /ShowWindow\s*\(/,/ActivateWindow\s*\(/,
  /SendWait\(/,/InputEventKey/,/--headless\b/,/--display-driver\s+headless/,
  /--editor(?:\s|$)/,/--project-manager/
 ])assert(!prohibited.test(runnable),'Foreground/headless operation prohibited: '+prohibited);
 assert(!worker.includes("'sr1c-capture-godot-pc.ps1'"));
 assert(worker.includes("'sr1c-capture-godot-background-pc.ps1'"));
 assert(collector.includes('Stop-KLPrivateDesktopGodot'));
 assert(collector.includes('privateDesktopCreated=$false'));
});

test('Automated original Godot GPU capture fails closed and verifies both tissue states/RTX before PNG submission',()=>{
 for(const text of [
  'extends SceneTree','DisplayServer.register_additional_output(self)',
  'RenderingServer.get_current_rendering_method()',
  'RenderingServer.get_current_rendering_driver_name()',
  'RenderingServer.get_video_adapter_name()',
  'RenderingServer.get_video_adapter_vendor()',
  '"forward_plus"','"vulkan"','"RTX 5060"','"NVIDIA"',
  'source_data.get("status", "")',
  '"nativeSurfaceCount", -1',
  '3 * int(record.get("sourceTriangles", -1))',
  'await RenderingServer.frame_post_draw',
  'get_texture()','get_image()','image.save_png(output)',
  'BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW',
  'pixelReviewed":false','gpuProcessVerified":false',
  'headlessUsed":false','userDesktopActivationRequested":false',
  'while Time.get_ticks_msec() - start_msec < 42000'
 ])assert(gd.includes(text),'Missing native GPU contract '+text);
 for(const text of [
  'EVIDENCE_INCOMPLETE','privateDesktopCreated=$false','headlessUsed=$false',
  'process3DPositiveRtx5060DistinctPeriods','process3DPositiveDistinctPeriods',
  'gpuAdapterLuidMatchedToNvidia','sr1c-dxgi-luid.cs',
  "-SampleInterval 1 -MaxSamples 34", "DXGI GetDesc1 LUID map failed",
  'nativeAngledScreenshotFile', 'nativeAngledImagePresent',

  'userDesktopActivationRequested=$false',
  'sourceGitSHA=$ExpectedSha','nativeSourceSubmissionVerified=$false',
  'nativePixelReviewAccepted=$false','godotPid=$null',
  'Get-Counter','engtype_3d','RTX\\s*5060',
  'gpuAdapterLuidMatchedToNvidia=$false',
  "if($report.process3DPositiveDistinctPeriods -lt 3)",
  "if(-not $report.nativeImagePresent)",
  'EVIDENCE_CAPTURED_PENDING_INDEPENDENT_PIXEL_AND_LUID_REVIEW'
 ])assert(collector.includes(text),'Missing PC acceptance gate '+text);
 assert(!collector.includes('nativePixelReviewAccepted=$true'));
 assert(!collector.includes('gpuAdapterLuidMatchedToNvidia=$true'));
});

test('XR watcher has not become a Godot executor and Godot publication remains separate',()=>{
 assert(!xr.includes('sr1c-capture-godot-background-pc.ps1'));
 assert(!xr.includes('godot-current.json'));
 assert(worker.includes("'GODOT_PC_LATEST.md'"));
 assert(worker.includes("imageIndependentPixelReviewAccepted:false"));
 assert(worker.includes('backgroundPrivateDesktopRenderRequested:true'));
 assert(worker.includes('foregroundActivationRequested:false'));
});
