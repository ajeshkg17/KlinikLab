import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGodotJob,EXACT_SOURCE_SHA,JOB_REF,RESULT_BRANCH} from '../visual-qa/godot-job-core.mjs';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const job=JSON.parse(read('../visual-qa/jobs/godot-current.json'));
const watcher=read('../visual-qa/godot-worker.mjs');
const powershell=read('../visual-qa/sr1c-capture-godot-background-pc.ps1');
const xrCore=read('../visual-qa/xr-job-core.mjs');

test('Dedicated local Godot job pins exact requested SHA with bounded non-executable suite',()=>{
 const validated=validateGodotJob(job);
 assert.equal(validated.commit,EXACT_SOURCE_SHA);
 assert.equal(EXACT_SOURCE_SHA,'f4d4d4151851a08342def08d9f2e461f5f5e7109');
 assert.equal(JOB_REF,'visual-qa/jobs/godot-current.json');
 assert.equal(RESULT_BRANCH,'visual-feedback');
 assert.equal(validated.graphics,'forward_plus-vulkan');
 assert.equal(validated.schemaVersion,4);
 assert.equal(validated.launcherContract,'winps51-clear-psmodulepath-sha256-preflight');
 assert.equal(validated.backgroundContract,'private-winsta0-vulkan-autocapture-no-foreground');
 assert.equal(validated.desktopApiContract,'raw-utf16-createdesktopw-bom-safe-recovery');
 assert.notEqual(validated.jobId,'pc-godot-fdi16-20261031-job03');
 assert.throws(()=>validateGodotJob({...job,desktopApiContract:'legacy-managed-string-error87'}));
 assert.equal(validated.capture,'native-background-before-after');
 assert.notEqual(validated.jobId,'pc-godot-fdi16-20261031-job02','job02 evidence must not be reused');
 assert.throws(()=>validateGodotJob({...job,backgroundContract:'legacy-foreground-f12'}));
 assert.throws(()=>validateGodotJob({...job,capture:'native-f12-before-after'}));
 assert.throws(()=>validateGodotJob({...job,schemaVersion:3}), 'prior foreground/BOM-unsafe watcher must reject new job');
 assert.throws(()=>validateGodotJob({...job,launcherContract:'unsafe-inherited-PSModulePath'}));
 assert(/^pc-godot-fdi16-/.test(validated.jobId));
 assert.equal(validated.jobId,'pc-godot-fdi16-20261031-job04');
 assert.notEqual(validated.jobId,'pc-godot-fdi16-20261031-job01', 'published old Godot job IDs cannot be reused');
 assert.throws(()=>validateGodotJob({...job,suite:'shell'}));
 assert.throws(()=>validateGodotJob({...job,command:'powershell'}));
 assert.throws(()=>validateGodotJob({...job,script:'C:\\anything.ps1'}));
 assert.throws(()=>validateGodotJob({...job,commit:'d5371fe051bbca83e380e44fd3465dffe0718058'}));
 assert.throws(()=>validateGodotJob({...job,timeoutSec:1000}));
 assert.throws(()=>validateGodotJob({...job,jobId:'../../unsafe'}));
});

test('XR watcher and its job remain untouched and Godot suite is explicitly incompatible',()=>{
 assert.equal(xrCore.includes("j.suite!=='quest2-phase3'"),true);
 assert(!xrCore.includes('godot-current.json'));
 assert(!watcher.includes('xr-current.json'));
 assert(!watcher.includes('8891'));
});

test('Godot watcher is a strict opt-in Windows-only exact-SHA runner with durable state and GitHub publication',()=>{
 for(const token of [
  "process.platform!=='win32'",
  "process.env.KLINIKLAB_GODOT_EXE",
  "'godot-ledger.json'",
  "'godot-heartbeat.json'",
  "git(['show','FETCH_HEAD:'+JOB_REF])",
  "git(['merge-base','--is-ancestor',j.commit,head])",
  "git(['worktree','add','--detach',worktree,j.commit])",
  "'sr1c-build-godot-local.ps1'",
  "'sr1c-capture-godot-background-pc.ps1'",
  "status:'executing'",
  "status:'publish-pending'",
  "status='published'",
  "visual-feedback",
  "'GODOT_PC_LATEST.md'",
  "'godot-native-fdi16.png'",
  "'godot-job-result.json'",
  "imageIndependentPixelReviewAccepted:false"
 ])assert(watcher.includes(token),token);
 assert(!watcher.includes("spawn('cmd.exe'"));
 assert(!watcher.includes("eval("));
});

test('Private desktop Windows collector rejects absent PNG and missing or invalid Godot-PID GPU evidence',()=>{
 for(const token of [
  "EVIDENCE_INCOMPLETE",
  "godot-native-fdi16-",
  "Start-KLPrivateDesktopGodot",
  "Stop-KLPrivateDesktopGodot",
  "privateDesktopCreated=$false",
  "userDesktopActivationRequested=$false",
  "headlessUsed=$false",
  "Get-Counter -Counter '\\GPU Engine(*)\\Utilization Percentage'",
  "process3DPositiveSamples",
  "Windows GPU Engine counter errors",
  "rendererLogNvidiaRtx5060",
  "gpuAdapterLuidMatchedToNvidia=$false",
  "nativePixelReviewAccepted=$false",
  "native-source-submission.json",
  "nativeSourceSubmissionVerified",
  "expectedTissueSurfacesPerState=5",
  "godot-owner-pc-result.json",
  "godot-background-capture.json",
  "sr1c-godot-background-capture.gd"
 ])assert(powershell.includes(token),token);
 assert(!powershell.includes('SetForegroundWindow'));
 assert(!powershell.includes('SendKeys'));
 const executableLines=powershell.split('\n').filter(x=>!x.trimStart().startsWith('#')).join('\n');
 assert(!executableLines.includes('F12'), 'No manual capture key in runnable code');
 assert(!executableLines.includes('--headless'), 'No dummy-render headless mode in runnable code');
 assert(!watcher.includes("'sr1c-capture-godot-pc.ps1'"));
 assert(watcher.includes("'sr1c-capture-godot-background-pc.ps1'"));
});
