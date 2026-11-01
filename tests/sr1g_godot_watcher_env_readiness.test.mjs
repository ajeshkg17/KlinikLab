import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyNextJobAdmission,PROBE_JOB_ID} from '../visual-qa/godot-next-job-admission.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha='39733cd2fe9626a68966c71b675dfcc55124f32b'; // sample receipt only
const oldJob={
  schemaVersion:7,jobId:'pc-godot-clinic-20261101-job07',
  commit:'f4d4d4151851a08342def08d9f2e461f5f5e7109',
  suite:'sr1d-clinic-case-station-migration',sceneMode:'clinic-cases',
  graphics:'forward_plus-vulkan',timeoutSec:150,
  capture:'native-clinic-case-switch-orbit',
  launcherContract:'winps51-clear-psmodulepath-sha256-preflight',
  backgroundContract:'private-winsta0-vulkan-autocapture-no-foreground',
  desktopApiContract:'raw-utf16-createdesktopw-bom-safe-recovery',
  telemetryContract:'persistent-pdh-valid-rows-dxgi-luid-42s-orbit-v2'
};
function fixture(){
 const now=Date.now();
 return {
  lease:{exists:true,malformed:false,processAlive:true,pid:26812},
  receipt:{
   workerPid:26812,workerGitSHA:sha,updatedUTC:new Date(now-9000).toISOString(),
   executableEnvironmentInherited:true,executableExists:true,
   childPowerShellHashModuleVerified:true,githubPublisherPermissionVerified:true,
   githubJobApprovalVerified:true,privateDesktopOnly:true,noJobExecutedByReceipt:true,
   currentApprovedJob:oldJob.jobId,sourceGitSHA:oldJob.commit
  },
  current:oldJob,
  ledger:{completed:{[oldJob.jobId]:{
   commit:oldJob.commit,status:'published',recoveryOnly:true,
   result:{reexecuted:false,gpuProcessCorroborated:false,overallStatus:'EVIDENCE_INCOMPLETE'}
  }}},
  workerSHA:sha,now
 };
}
test('future unique job passes only admission, no running, publishing, or job07 mutation',()=>{
 const f=fixture();
 const before=JSON.stringify(f);
 const j=verifyNextJobAdmission(f);
 assert.equal(j.jobId,PROBE_JOB_ID);
 assert.equal(j.sceneMode,'clinic-cases');
 assert.equal(j.commit,oldJob.commit);
 assert.equal(JSON.stringify(f),before);
});
test('wrong task environment receipt, PID, source or publisher capability fails closed',()=>{
 for(const mut of [
  f=>{f.receipt.executableEnvironmentInherited=false},
  f=>{f.receipt.executableExists=false},
  f=>{f.receipt.githubPublisherPermissionVerified=false},
  f=>{f.receipt.childPowerShellHashModuleVerified=false},
  f=>{f.receipt.workerPid++},
  f=>{f.receipt.workerGitSHA='bad'},
  f=>{f.receipt.currentApprovedJob='other'},
  f=>{f.lease.processAlive=false},
  f=>{f.current.commit='f'.repeat(40)},
  f=>{f.ledger.completed[oldJob.jobId].status='executing'},
  f=>{f.ledger.completed[oldJob.jobId].result.gpuProcessCorroborated=true},
  f=>{f.ledger.completed[PROBE_JOB_ID]={status:'published'}},
  f=>{f.receipt.updatedUTC=new Date(f.now-90000).toISOString()},
 ]){const f=fixture();mut(f);assert.throws(()=>verifyNextJobAdmission(f))}
});
test('standalone --validate missing Godot path returns nonzero and does NOT overwrite live watcher heartbeat',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'kl-validate-'));
 const heartbeat=path.join(tmp,'KlinikLabGodotWorker','godot-heartbeat.json');
 await fs.mkdir(path.dirname(heartbeat),{recursive:true});
 const original=JSON.stringify({pid:26812,at:'immutable',status:'published',jobId:oldJob.jobId});
 await fs.writeFile(heartbeat,original);
 try{
  const p=spawnSync(process.execPath,[path.join(root,'visual-qa','godot-worker.mjs'),'--validate'],
   {cwd:root,env:{...process.env,LOCALAPPDATA:tmp,KLINIKLAB_GODOT_EXE:''},
    encoding:'utf8',timeout:20000});
  assert.notEqual(p.status,0,'invalid --validate must NOT exit zero');
  assert.match(p.stderr+p.stdout,/windows|KLINIKLAB_GODOT_EXE|Godot executable/i);
  assert.equal(await fs.readFile(heartbeat,'utf8'),original);
 }finally{await fs.rm(tmp,{recursive:true,force:true})}
});
test('readiness remains independent of interactive terminal KLINIKLAB_GODOT_EXE',async()=>{
 const worker=await fs.readFile(path.join(root,'visual-qa','godot-worker.mjs'),'utf8');
 const launcher=await fs.readFile(path.join(root,'visual-qa','install-godot-pc-watcher.ps1'),'utf8');
 assert.match(launcher,/\$env:KLINIKLAB_GODOT_EXE=\$GodotExe/);
 assert.match(launcher,/Start-Process\s+-FilePath\s+\$NodeExe/);
 assert.match(worker,/const receipt=parseGodotJson\(await fs\.readFile\(RUNTIME,'utf8'\)/);
 assert.match(worker,/await writeRuntimeReceipt\(j,true\)/);
 assert.match(worker,/await validateWithoutHeartbeat\(\)/);
 assert.doesNotMatch(worker,/await heartbeat\('validated'/);
 assert.match(worker,/READY_FOR_FUTURE_UNIQUE_JOB_ADMISSION_NOT_EXECUTED/);
 assert.match(worker,/--probe-next-job/);
});

test('retiring an interrupted idle watcher preserves lock bytes and never runs an old job',async()=>{
 const worker=await fs.readFile(path.join(root,'visual-qa','godot-worker.mjs'),'utf8');
 const segment=worker.slice(worker.indexOf('async function archiveDeadIdleWatcherLease()'),
  worker.indexOf('async function validateWithoutHeartbeat()'));
 assert.match(segment,/lease\.processAlive!==false/);
 assert.match(segment,/\['executing','publish-pending'\]/);
 assert.match(segment,/job07\?\.status!=='published'/);
 assert.match(segment,/Get-ScheduledTask/);
 assert.match(segment,/await fs\.rename\(original,saved\)/);
 assert.doesNotMatch(segment,/await execute\(|await powershell\(|await fs\.unlink\(|worktree add/);
});
