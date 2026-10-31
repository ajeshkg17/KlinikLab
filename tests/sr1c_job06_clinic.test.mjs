import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGodotJob} from '../visual-qa/godot-job-core.mjs';

const read = p => fs.readFileSync(new URL(p,import.meta.url),'utf8');
const request=JSON.parse(read('../visual-qa/jobs/godot-current.json'));

test('fresh unique job06 is a bounded native clinic workspace, not another FDI16-only job05',()=>{
 assert.equal(request.schemaVersion,6);
 assert.equal(request.jobId,'pc-godot-clinic-20261031-job06');
 assert.equal(request.sceneMode,'clinic-overview');
 assert.equal(request.suite,'sr1c-clinic-workspace-prototype');
 assert.equal(request.capture,'native-clinic-orbit-frontal-occlusal');
 assert.equal(request.commit,'f4d4d4151851a08342def08d9f2e461f5f5e7109');
 assert.equal(request.telemetryContract,'persistent-pdh-valid-rows-dxgi-luid-42s-orbit-v2');
 assert.deepEqual(validateGodotJob(request),request);
 assert.throws(()=>validateGodotJob({...request,sceneMode:'full-app-accepted'}));
 assert.throws(()=>validateGodotJob({...request,jobId:'pc-godot-fdi16-20261031-job05'}));
 assert.throws(()=>validateGodotJob({...request,graphics:'opengl'}));
 assert.throws(()=>validateGodotJob({...request,commit:'0'.repeat(40)}));
 assert.throws(()=>validateGodotJob({...request,command:'powershell whoami'}));
});

test('original job05 remains a valid immutable historical schema but is never reused',()=>{
 const old={...request,schemaVersion:5,jobId:'pc-godot-fdi16-20261031-job05',
  suite:'sr1c-fdi16-before-after',capture:'native-orbit-frontal-occlusal',
  telemetryContract:'persistent-pdh-1hz-dxgi-luid-42s-orbit-v1'};
 delete old.sceneMode;
 assert.equal(validateGodotJob(old).jobId,old.jobId);
});

test('native clinic props are distinct from original FDI16 source; no fake full-application claim',()=>{
 const clinic=read('../visual-qa/sr1c-godot-clinic-overview.gd');
 const game=read('../visual-qa/sr1c-godot-background-capture.gd');
 const windows=read('../visual-qa/sr1c-capture-godot-background-pc.ps1');
 const worker=read('../visual-qa/godot-worker.mjs');
 for(const token of ['KL_ROOM_FLOOR','KL_DENTAL_CHAIR_SEAT','KL_INSTRUMENT_TRAY',
  'KL_TOOL_','KL_SCREEN_PANEL','FDI 16','NOT FULL APPLICATION','extends Node3D'])
  assert(clinic.includes(token),token);
 for(const token of ['clinic-overview','sr1c-godot-clinic-overview.gd',
  'nativeClinicWorkspaceObjectCount','fullKlinikLabApplicationMigrated'])
  assert(game.includes(token)||windows.includes(token),token);
 assert(windows.includes("SceneMode='fdi16'"));
 assert(worker.includes('workerGitSHA:'));
 assert(worker.includes('nativeSceneMode:'));
 assert(worker.includes('fullKlinikLabApplicationMigrated:false'));
 assert(worker.includes('godot-gpu-pdh-diagnostics.json'));
 assert(!clinic.includes('https://')&&!clinic.includes('download'), 'No unlicensed external assets');
});

test('invalid wildcard PDH statuses are filtered without fabricating RTX utilization',()=>{
 const filter=read('../visual-qa/sr1c-pdh-filter.ps1');
 const pc=read('../visual-qa/sr1c-capture-godot-background-pc.ps1');
 const regression=read('./sr1c_pdh_invalid_rows_windows.ps1');
 assert(filter.includes('function ConvertTo-KLGodotGpu3DRows'));
 for(const condition of ["$statusName -eq 'ValidData'","$statusName -eq '0'",
  '[double]::IsNaN','[double]::IsInfinity','-ge 0','-le 100','-notmatch',
  '$GetEngineLuid'])
  assert(filter.includes(condition),condition);
 assert(pc.includes('-SampleInterval 1 -MaxSamples 34 -ErrorAction Continue'));
 assert(pc.includes('ConvertTo-KLGodotGpu3DRows'));
 assert(!pc.includes('-SampleInterval 1 -MaxSamples 34 -ErrorAction Stop'));
 assert(pc.includes('process3DPositiveRtx5060DistinctPeriods'));
 assert(pc.includes('Select-Object -ExpandProperty utc -Unique'));
 assert(pc.includes("originalPdhDiagnosticFile='godot-gpu-pdh-diagnostics.json'"));
 assert(pc.includes('Persistent Windows PDH query terminated:'));
 for(const mark of ['InvalidData','NaN','engtype_copy','pid_5555','-Unique',
  'All-invalid must fail closed'])assert(regression.includes(mark),mark);
});
