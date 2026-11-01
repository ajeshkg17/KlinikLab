/**
 * Bounded Windows owner-PC Godot worker. NOT the XR watcher.
 * Allowlisted exact source and fixed local scripts ONLY. No job JSON commands.
 * Publishes results incl. incomplete diagnostics to visual-feedback.
 * Prereqs: interactive Windows session + GODOT_EXE + Git Credential Manager.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateGodotJob,INTEGRATION_BRANCH,RESULT_BRANCH,JOB_REF} from './godot-job-core.mjs';
import {cleanWindowsPowerShellEnv} from './godot-powershell-environment.mjs';
import {parseGodotJson,jsonWithoutBom} from './godot-json.mjs';
import {acquireGodotWorkerLease,readGodotWorkerLease} from './godot-single-instance.mjs';
import {inspectJob07,JOB07_ID,JOB07_SOURCE,JOB07_DIR,JOB07_WORKER} from './godot-job07-forensics.mjs';
import {verifyNextJobAdmission,PROBE_JOB_ID} from './godot-next-job-admission.mjs';

const REMOTE='https://github.com/ajeshkg17/KlinikLab.git';
const ROOT=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'KlinikLabGodotWorker');
const REPO=path.join(ROOT,'source-repo');
const LEDGER=path.join(ROOT,'godot-ledger.json');
const HEARTBEAT=path.join(ROOT,'godot-heartbeat.json');
const RUNTIME=path.join(ROOT,'godot-watcher-runtime.json');
const EVIDENCE=path.join(ROOT,'godot-evidence');
const OWNER='ajeshkg17/KlinikLab';
const sourceDir=path.dirname(fileURLToPath(import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function git(args,cwd=REPO){
 const p=spawnSync('git',args,{cwd,encoding:'utf8',timeout:120000,
  env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
 if(p.status!==0)throw Error('git '+args[0]+': '+String(p.stderr||p.error).slice(0,400));
 return String(p.stdout||'').trim();
}
async function initialize(){
 if(process.platform!=='win32')throw Error('Godot worker is WINDOWS ONLY; Linux CI cannot substitute for RTX rendering');
 if(!process.env.KLINIKLAB_GODOT_EXE||!path.win32.isAbsolute(process.env.KLINIKLAB_GODOT_EXE))
  throw Error(process.argv.includes('--validate')?
   'Standalone --validate does not inherit the scheduled-task environment. Set KLINIKLAB_GODOT_EXE in THIS shell to the installed Godot 4.7.2 path, or use --probe-next-job to inspect the live watcher receipt.':
   'Scheduled watcher Node process lacks an absolute KLINIKLAB_GODOT_EXE inherited from the task launcher; do not execute any new job');
 await fs.access(process.env.KLINIKLAB_GODOT_EXE);
 await fs.mkdir(ROOT,{recursive:true});
 try{await fs.access(path.join(REPO,'.git'))}
 catch{git(['clone','--filter=blob:none','--no-checkout',REMOTE,REPO],ROOT)}
 if(git(['remote','get-url','origin'])!==REMOTE)throw Error('Unexpected Godot watcher Git remote');
}
async function readLedger(){
 try{return parseGodotJson(await fs.readFile(LEDGER,'utf8'),'Godot worker ledger')}
 catch(e){if(e.code==='ENOENT')return {completed:{}};throw e}
}
async function saveLedger(s){const tmp=LEDGER+'.tmp';await fs.writeFile(tmp,JSON.stringify(s,null,2));await fs.rename(tmp,LEDGER)}
async function heartbeat(status,id=null,other={}){
 await fs.mkdir(ROOT,{recursive:true});
 await fs.writeFile(HEARTBEAT,JSON.stringify({pid:process.pid,at:new Date().toISOString(),status,jobId:id,...other},null,2));
}
function credential(){
 const p=spawnSync('git',['-c','credential.interactive=never','credential','fill'],{
  input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',timeout:15000,
  env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(p.status!==0)throw Error('Git Credential Manager unavailable; sign in interactively to github.com first');
 const fields=Object.fromEntries(p.stdout.split(/\r?\n/).filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
 if(fields.host!=='github.com'||!fields.password)throw Error('No usable noninteractive GitHub credential');
 return fields.password; // never log/store the token
}
async function api(token,endpoint,method='GET',data){
 const resp=await fetch('https://api.github.com/repos/'+OWNER+endpoint,{
  method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
  body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(35000)});
 if(!resp.ok)throw Error('GitHub '+method+' '+endpoint+' status '+resp.status);
 return resp.json();
}
async function permission(){
 const token=credential();
 const repo=await api(token,'');
 if(repo.permissions?.push!==true)throw Error('Owner-PC credential lacks publish permission');
 await api(token,'/git/ref/heads/'+RESULT_BRANCH);
 return token;
}
async function currentJob(){
 git(['fetch','origin',INTEGRATION_BRANCH]);
 const head=git(['rev-parse','FETCH_HEAD']);
 const j=validateGodotJob(parseGodotJson(git(['show','FETCH_HEAD:'+JOB_REF]),'GitHub Godot job'));
 git(['cat-file','-e',j.commit+'^{commit}']);
 git(['merge-base','--is-ancestor',j.commit,head]);
 return j;
}
function verifyChildHashModule(){
 // pwsh -> Node -> Windows PowerShell does not get pwsh's WinPSModulePath fix.
 // Remove only the inherited child PSModulePath, then test actual Get-FileHash.
 const target=path.join(sourceDir,'godot-worker.mjs');
 const expected=createHash('sha256').update(fsSync.readFileSync(target)).digest('hex');
 const command=[
  "$ErrorActionPreference='Stop'",
  "$cmd=Get-Command -Name Get-FileHash -ErrorAction Stop",
  "$h=Get-FileHash -LiteralPath $env:KLINIKLAB_PS_PREFLIGHT_FILE -Algorithm SHA256 -ErrorAction Stop",
  "Write-Output ('KL_PS_VERSION='+$PSVersionTable.PSVersion.ToString())",
  "Write-Output ('KL_HASH_MODULE='+$cmd.ModuleName)",
  "Write-Output ('KL_HASH_SHA256='+$h.Hash.ToLowerInvariant())"
 ].join('; ');
 const env=cleanWindowsPowerShellEnv({...process.env,KLINIKLAB_PS_PREFLIGHT_FILE:target});
 const p=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',command],
  {encoding:'utf8',timeout:30000,windowsHide:true,env});
 if(p.status!==0)throw Error('Child Windows PowerShell Get-FileHash preflight FAILED: '+
  String(p.stderr||p.stdout||p.error).slice(0,500));
 const stdout=String(p.stdout||'');
 const version=/KL_PS_VERSION=([^\r\n]+)/.exec(stdout)?.[1];
 const module=/KL_HASH_MODULE=([^\r\n]+)/.exec(stdout)?.[1];
 const hash=/KL_HASH_SHA256=([a-f0-9]{64})/.exec(stdout)?.[1];
 if(!version||module!=='Microsoft.PowerShell.Utility'||hash!==expected)
  throw Error('Child Windows PowerShell SHA256/module verification failed: module '+
   String(module||'MISSING')+'; version '+String(version||'MISSING'));
 return {version,module,inheritedPSModulePathRemoved:true,sha256PreflightPassed:true};
}

function powershell(script,args,timeoutMs=180000){
 return new Promise((resolve,reject)=>{
  const p=spawn('powershell.exe',['-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',script,...args],
   {shell:false,stdio:['ignore','pipe','pipe'],env:cleanWindowsPowerShellEnv(process.env)});
  // Preserve the real child failure text in machine-readable job results.
  // This avoids job01's generic 'exit 1' with no published module error.
  let childStdout='',childStderr='';
  p.stdout.on('data',bytes=>{
   process.stdout.write(bytes);
   childStdout=(childStdout+String(bytes)).slice(-8000);
  });
  p.stderr.on('data',bytes=>{
   process.stderr.write(bytes);
   childStderr=(childStderr+String(bytes)).slice(-8000);
  });
  let finished=false;
  const timer=setTimeout(()=>{
   if(finished)return;
   finished=true;
   // Terminate the entire Windows process tree, including child Godot game.
   spawnSync('taskkill',['/PID',String(p.pid),'/T','/F'],{windowsHide:true,timeout:20000});
   reject(Error('Bounded native Godot Windows operation exceeded '+timeoutMs+' ms'));
  },timeoutMs);
  const finish=(err)=>{
   if(finished)return;finished=true;clearTimeout(timer);
   if(err)reject(err);else resolve(0);
  };
  p.on('error',finish);
  p.on('exit',code=>finish(code===0?null:Error(
   path.basename(script)+' exit '+code+
   '; child stderr: '+childStderr.slice(-1800)+
   '; child stdout: '+childStdout.slice(-900))));
 });
}
async function execute(j){
 const run=path.join(EVIDENCE,j.jobId+'-'+j.commit.slice(0,10));
 const worktree=path.join(ROOT,'worktrees',j.jobId+'-'+j.commit.slice(0,8));
 await fs.mkdir(path.dirname(worktree),{recursive:true});
 if(await fs.stat(run).then(()=>true,()=>false))throw Error('Refusing reuse of native Godot evidence folder: '+run);
 git(['worktree','prune']);
 git(['worktree','add','--detach',worktree,j.commit]);
 let preparationError=null,captureError=null;
 try{
  // Original source EXACT SHA is checked from this detached worktree.
  await powershell(path.join(worktree,'visual-qa','sr1c-build-godot-local.ps1'),
   ['-ExpectedSha',j.commit,'-EvidenceDir',run]);
 }catch(e){preparationError=e.message}
 if(!preparationError&&j.sceneMode==='clinic-cases'){
  try{
   await powershell(path.join(sourceDir,'sr1d-prepare-godot-cases.ps1'),
    ['-EvidenceDir',run,'-ExpectedSha',j.commit,'-SourceWorktree',worktree]);
  }catch(e){preparationError='Production case/station metadata preparation failed: '+e.message}
 }
 if(!preparationError){
  try{
   await powershell(path.join(sourceDir,'sr1c-capture-godot-background-pc.ps1'),
    ['-EvidenceDir',run,'-ExpectedSha',j.commit,
     '-GodotExe',process.env.KLINIKLAB_GODOT_EXE,
     '-SceneMode',j.sceneMode||'fdi16'],j.timeoutSec*1000);
  }catch(e){captureError=e.message}
 }
 await fs.mkdir(run,{recursive:true});
 const capture=path.join(run,'Captures');
 await fs.mkdir(capture,{recursive:true});
 let native=null;
 let nativeParseError=null;
 try{
  native=parseGodotJson(await fs.readFile(path.join(capture,'godot-owner-pc-result.json'),'utf8'),
   'original Windows PowerShell Godot owner-PC result');
 }catch(e){
  nativeParseError=String(e.message);
 }
 const result={
  powerShellChildEnvironment:{inheritedPSModulePathRemoved:true,hashCmdletPreflightRequired:true},
  jobId:j.jobId,sourceGitSHA:j.commit,watcherSuite:j.suite,
  workerGitSHA:git(['rev-parse','HEAD'],path.resolve(sourceDir,'..')),
  nativeSceneMode:j.sceneMode||'fdi16',fullKlinikLabApplicationMigrated:false,
  executedOn:'owner Windows PC (watcher runtime)',generatedAt:new Date().toISOString(),
  nativeReportStatus:native?.status||'EVIDENCE_INCOMPLETE',
  nativeWorkflowVerified:j.sceneMode!=='clinic-cases'||!!native?.nativeCaseWorkflowVerified,
  imageExists:!!native?.nativeImagePresent,
  angledImageExists:!!native?.nativeAngledImagePresent,
  distinctRtx5060Gpu3DPeriods:Number(native?.process3DPositiveRtx5060DistinctPeriods||0),
  rtx5060DxgiLuid:native?.rtx5060DxgiLuid||null,
  dxgiLuidMatchesGodotProcess:!!native?.gpuAdapterLuidMatchedToNvidia,
  sourceMeshVerified:!!native?.nativeSourceSubmissionVerified,
  gpuProcessCorroborated:!!native?.godotProcessGPUCorroborated,
  backgroundPrivateDesktopRenderRequested:true,
  foregroundActivationRequested:false,
  headlessDummyRendererAllowed:false,
  imageIndependentPixelReviewAccepted:false,
  overallStatus:'NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_AND_GPU_REVIEW',
  errors:[preparationError,captureError,nativeParseError].filter(Boolean),
  blockers:native?.blockers||[nativeParseError||'Native Windows evidence collector did not return its JSON report']
 };
 if(!native?.nativeImagePresent||!native?.nativeAngledImagePresent||!native?.nativeSourceSubmissionVerified||!native?.godotProcessGPUCorroborated||!native?.gpuAdapterLuidMatchedToNvidia||(j.sceneMode==='clinic-cases'&&!native?.nativeCaseWorkflowVerified))
  result.overallStatus='EVIDENCE_INCOMPLETE';
 await fs.writeFile(path.join(capture,'godot-job-result.json'),jsonWithoutBom(result));
 try{git(['worktree','remove','--force',worktree]);}
 catch(e){await fs.writeFile(path.join(capture,'worktree-cleanup-warning.txt'),String(e.message)+'\n')}
 return {run,result};
}
async function publish(j,run,result){
 const token=await permission();
 const ref=await api(token,'/git/ref/heads/'+RESULT_BRANCH);
 const parent=ref.object.sha,commit=await api(token,'/git/commits/'+parent);
 const prefix='runs/pc-godot-'+j.jobId+'-'+j.commit;
 try{
  const existing=await api(token,'/contents/'+prefix+'/godot-job-result.json?ref='+RESULT_BRANCH);
  if(existing.path===prefix+'/godot-job-result.json')
   return 'https://github.com/'+OWNER+'/blob/'+RESULT_BRANCH+'/'+prefix+'/README.md';
 }catch(e){if(!String(e.message).includes('status 404'))throw e}
 const capture=path.join(run,'Captures');
 const selected=[
  ['godot-job-result.json',path.join(capture,'godot-job-result.json')],
  ['godot-job07-forensic-review.json',path.join(capture,'godot-job07-forensic-review.json')],
  ['godot-owner-pc-result.json',path.join(capture,'godot-owner-pc-result.json')],
  ['native-source-submission.json',path.join(capture,'native-source-submission.json')],
  ['godot-source-prepare.json',path.join(run,'godot-source-prepare.json')],
  ['godot-native-cases-prepare.json',path.join(run,'godot-native-cases-prepare.json')],
  ['godot-native-workflow-state.json',path.join(capture,'godot-native-workflow-state.json')],
  ['godot-gpu-3d-counters.json',path.join(capture,'godot-gpu-3d-counters.json')],
  ['godot-gpu-pdh-diagnostics.json',path.join(capture,'godot-gpu-pdh-diagnostics.json')],
  ['godot-background-capture.json',path.join(capture,'godot-background-capture.json')],
  ['godot-native-background.log',path.join(capture,'godot-native-background.log')],
  ['godot-native-stdout.log',path.join(capture,'godot-native-stdout.log')],
  ['godot-native-stderr.log',path.join(capture,'godot-native-stderr.log')]
 ];
 if(result.imageExists){
  // Only an explicitly verified, publication-only job07 archive may use the
  // original raw Godot background report in place of absent owner-PC JSON.
  // It NEVER invents Godot PID / PDH samples / owner-PC acceptance.
  let native;
  if(result.recoveryOnly && result.jobId===JOB07_ID && result.originalNativeImagesVerified){
   const raw=parseGodotJson(await fs.readFile(path.join(capture,'godot-background-capture.json'),'utf8'),'verified original Godot capture');
   native={nativeScreenshotFile:raw.imageFile,nativeAngledImagePresent:true,
    nativeAngledScreenshotFile:raw.angledImageFile};
  }else{
   native=parseGodotJson(await fs.readFile(path.join(capture,'godot-owner-pc-result.json'),'utf8'),'published original owner-PC JSON');
  }
  const name=native.nativeScreenshotFile;
  if(!/^godot-native-fdi16-frontal-[0-9]+\.png$/.test(name||''))throw Error('Unsupported original frontal PNG name');
  selected.push(['godot-native-fdi16.png',path.join(capture,name)]);
  if(native.nativeAngledImagePresent){
   const angle=native.nativeAngledScreenshotFile;
   if(!/^godot-native-fdi16-occlusal-[0-9]+\.png$/.test(angle||''))throw Error('Unsupported original occlusal PNG name');
   selected.push(['godot-native-fdi16-occlusal.png',path.join(capture,angle)]);
  }
 }
 const artifacts=[];
 for(const [name,file] of selected){
  let data;
  try{data=await fs.readFile(file)}catch(e){if(e.code==='ENOENT')continue;throw e}
  if(data.length>25_000_000)throw Error('Evidence file too large to publish: '+name);
  artifacts.push({name,bytes:data,sha256:createHash('sha256').update(data).digest('hex')});
 }
 if(!artifacts.some(x=>x.name==='godot-job-result.json'))throw Error('Missing mandatory result JSON');
 const lines=['# SR1C real Windows owner-PC Godot evidence','',
  'Request ID: '+j.jobId,'Source pinned SHA: '+j.commit,
  'Worker SHA: '+result.workerGitSHA,
  'Native scene mode: '+result.nativeSceneMode,
  'Full browser application migrated to Godot: NO (clinic workspace prototype only)',
  'Status: '+result.overallStatus,'',
  'Evidence captured by dedicated Godot PC worker, **not** by GitHub Actions or Linux.',
  'Source hash and screenshot pixel verification are independent tests.',
  ...(result.recoveryOnly?['PUBLICATION-ONLY RECOVERY: existing original image bytes. NO rerender, NO owner-PC result, NO attributable GPU acceptance.']:[]),
  'No Quest/streaming success is claimed.','',
  ...artifacts.flatMap(a=>[a.name+': SHA256 '+a.sha256,'']),
  'If present, original native PNG requires independent pixel review:','',
  artifacts.some(a=>a.name==='godot-native-fdi16.png')?'![Native Godot FDI16 frontal](./godot-native-fdi16.png)':'No original frontal native PNG was returned.',
  artifacts.some(a=>a.name==='godot-native-fdi16-occlusal.png')?'![Native Godot FDI16 elevated/occlusal](./godot-native-fdi16-occlusal.png)':'No original occlusal native PNG was returned.',''];
 artifacts.push({name:'README.md',bytes:Buffer.from(lines.join('\n')),sha256:null});
 const items=[];
 for(const item of artifacts){
  const blob=await api(token,'/git/blobs','POST',{content:item.bytes.toString('base64'),encoding:'base64'});
  items.push({path:prefix+'/'+item.name,mode:'100644',type:'blob',sha:blob.sha});
 }
 const pointer=Buffer.from('# Latest native Godot PC evidence\n\n[Browse '+j.jobId+'](./'+prefix+'/README.md)\n');
 const pointerBlob=await api(token,'/git/blobs','POST',{content:pointer.toString('base64'),encoding:'base64'});
 items.push({path:'GODOT_PC_LATEST.md',mode:'100644',type:'blob',sha:pointerBlob.sha});
 const newTree=await api(token,'/git/trees','POST',{base_tree:commit.tree.sha,tree:items});
 const next=await api(token,'/git/commits','POST',{
  message:'SR1C Godot owner PC diagnostic '+j.jobId+' '+j.commit,
  tree:newTree.sha,parents:[parent]});
 await api(token,'/git/refs/heads/'+RESULT_BRANCH,'PATCH',{sha:next.sha,force:false});
 return 'https://github.com/'+OWNER+'/blob/'+RESULT_BRANCH+'/'+prefix+'/README.md';
}
// REPAIR ONLY: finalizes previously attempted job02/job03 without spawning a
// Windows process or touching original source submissions, captures or logs.
// A stale executing ledger may be recovered ONLY by this explicit command.
// The original job IDs are NEVER retried.
const INCOMPLETE_LEGACY_IDS=Object.freeze([
 'pc-godot-fdi16-20261031-job02',
 'pc-godot-fdi16-20261031-job03'
]);
async function recoverIncompleteAttempts(){
 await initialize();
 await permission(); // fail before writing any recovery metadata
 const ledger=await readLedger();
 for(const id of INCOMPLETE_LEGACY_IDS){
  const entry=ledger.completed[id];
  if(!entry||entry.status==='published'||entry.status==='failed')continue;
  if(entry.commit!=='f4d4d4151851a08342def08d9f2e461f5f5e7109')
   throw Error('Legacy job source identity does not match immutable original: '+id);
  if(!['executing','publish-pending'].includes(entry.status))
   throw Error('Unexpected immutable recovery status '+id+': '+entry.status);
  const j={jobId:id,commit:entry.commit,suite:'sr1c-fdi16-before-after'};
  const run=entry.run||path.join(EVIDENCE,id+'-'+entry.commit.slice(0,10));
  if(path.resolve(run)!==path.resolve(path.join(EVIDENCE,id+'-'+entry.commit.slice(0,10))))
   throw Error('Recovery ledger path is not canonical original evidence path: '+id);
  const capture=path.join(run,'Captures');
  await fs.mkdir(capture,{recursive:true});
  let native=null, nativeError=null;
  try{
   native=parseGodotJson(await fs.readFile(path.join(capture,'godot-owner-pc-result.json'),'utf8'),
    'immutable old WinPS owner report '+id);
  }catch(e){nativeError=String(e.message)}
  const originalResultPath=path.join(capture,'godot-job-result.json');
  let result=null;
  try{
   result=parseGodotJson(await fs.readFile(originalResultPath,'utf8'),'old original job result '+id);
  }catch(e){
   if(e.code!=='ENOENT')throw e; // never overwrite malformed original evidence
  }
  if(!result){
   result={
    jobId:id,sourceGitSHA:entry.commit,watcherSuite:j.suite,
    executedOn:'owner Windows PC (archived original attempt)',
    generatedAt:new Date().toISOString(),
    nativeReportStatus:'EVIDENCE_INCOMPLETE',
    imageExists:false,sourceMeshVerified:false,gpuProcessCorroborated:false,
    imageIndependentPixelReviewAccepted:false,
    overallStatus:'EVIDENCE_INCOMPLETE',
    recoveryOnly:true,reexecuted:false,
    errors:[nativeError].filter(Boolean),
    blockers:[
     'Historical job already executed and ledger stuck executing; this is recovery-only, NO rerender',
     ...(Array.isArray(native?.blockers)?native.blockers:[]),
     nativeError||''
    ].filter(Boolean)
   };
   await fs.writeFile(originalResultPath,jsonWithoutBom(result),{flag:'wx'});
  }
  // Even a preexisting result cannot transform an unverified failed PC
  // attempt into accepted native/GPU evidence.
  const terminalResult={...result,overallStatus:'EVIDENCE_INCOMPLETE',
   imageIndependentPixelReviewAccepted:false,recoveryOnly:true,reexecuted:false};
  if(entry.status==='executing'){
   ledger.completed[id]={commit:entry.commit,status:'publish-pending',run,
    result:terminalResult,endedAt:new Date().toISOString(),recoveryOnly:true};
   await saveLedger(ledger);
  }
  const url=await publish(j,run,terminalResult);
  ledger.completed[id]={...ledger.completed[id],status:'published',url,
   publishedAt:new Date().toISOString(),recoveryOnly:true};
  await saveLedger(ledger);
  await heartbeat('recovered-incomplete-published',id,{url,reexecuted:false});
  console.log('Preserved/recovered original incomplete Godot attempt:',id,url);
 }
}
async function auditInterruptedOwnerWatcher(){
 const data={};
 for(const [key,file] of [['ledger',LEDGER],['ledgerTmp',LEDGER+'.tmp'],['watcherLog',path.join(ROOT,'godot-watcher-stdout.log')]]){
  try{
   const st=await fs.stat(file);
   const entry={exists:true,byteLength:st.size,modifiedUTC:st.mtime.toISOString()};
   if(key==='watcherLog'){
    const f=await fs.open(file,'r');
    try{
     const length=Math.min(3500,st.size),b=Buffer.alloc(length);
     if(length)await f.read(b,0,length,st.size-length);
     entry.tailRedacted=b.toString('utf8')
      .replace(/(?:github_pat_[A-Za-z0-9_]+|gh[opusr]_[A-Za-z0-9]+)/g,'[REDACTED_CREDENTIAL]')
      .replace(/Bearer\s+[^\s]+/gi,'Bearer [REDACTED]')
      .slice(-1800);
    }finally{await f.close()}
   }else if(st.size<10_000_000){
    entry.sha256=createHash('sha256').update(await fs.readFile(file)).digest('hex');
   }
   data[key]=entry;
  }catch(e){data[key]=e.code==='ENOENT'?{exists:false}:{readError:String(e.message)}}
 }
 const query="Get-ScheduledTaskInfo -TaskName 'KlinikLab-Godot-PC-Watcher' -ErrorAction Stop | Select-Object LastRunTime,LastTaskResult,NextRunTime,NumberOfMissedRuns | ConvertTo-Json -Compress";
 const p=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',query],
  {encoding:'utf8',timeout:20000,windowsHide:true,env:cleanWindowsPowerShellEnv(process.env)});
 data.scheduledTaskLastRun=(p.status===0?String(p.stdout).trim().slice(0,1200):
  {readError:String(p.stderr||p.error).slice(0,300)});
 return data;
}

/** Forensic-only job07 publication: DOES NOT call execute(), capture or Godot.
 * Never clears the stale watcher lease. Separate exclusive recovery file is
 * retained on abnormal exit to prevent duplicate/ambiguous publication.
 */
async function recoverRawJob07({diagnoseOnly=false}={}){
 if(process.platform!=='win32')throw Error('Owner-PC interrupted evidence recovery is Windows-only');
 const lock=await readGodotWorkerLease(ROOT);
 if(!lock.exists||lock.malformed||lock.processAlive!==false||lock.jobPoller!=='visual-qa/godot-worker.mjs')
  throw Error('Refusing job07 recovery unless known stale watcher lease is intact and original watcher PID is confirmed DEAD');
 const target=path.join(EVIDENCE,JOB07_DIR);
 const original=await inspectJob07(ROOT); // verify originals before any write/network
 const ledger=await readLedger();
 if(!ledger||typeof ledger.completed!=='object'||!ledger.completed||Array.isArray(ledger.completed))
  throw Error('Malformed ledger; refusing recovery');
 const prev=ledger.completed[JOB07_ID];
 if(prev && (prev.commit!==JOB07_SOURCE||
    !['executing','publish-pending'].includes(prev.status)))
  throw Error('Existing job07 ledger conflict/terminal state; require investigation, not overwrite');
 const localAudit=await auditInterruptedOwnerWatcher();
 const recovery={
  ...original,localAudit,ledgerEntryAbsentAtInspection:!prev,
  existingLedgerState:prev?.status||null,
  staleWatcherPid:lock.pid,staleWatcherStartedUTC:lock.startedAt,
  inspectedUTC:new Date().toISOString(),
  recoveryToolSHA:git(['rev-parse','HEAD'],path.resolve(sourceDir,'..')),
  limitations:['No original owner-PC result JSON', 'No validated original PDH/DXGI Godot-PID 3D attribution', 'Original pixels not independently clinically reviewed',
   'Application remains unported; only source-derived case navigation'],
  decision:'PUBLISH_ORIGINAL_FILES_ONLY_AS_EVIDENCE_INCOMPLETE_NO_RERENDER'
 };
 if(diagnoseOnly){
  console.log(JSON.stringify({job07Forensics:recovery,watcherLease:lock},null,2));
  return;
 }
 const recoveryLock=path.join(ROOT,'godot-job07-publication-only.lock');
 const lease=await fs.open(recoveryLock,'wx',0o600)
  .catch(e=>{if(e.code==='EEXIST')throw Error('Existing job07 recovery lock: inspect prior archive attempt; NEVER rerun renderer');throw e});
 await lease.writeFile(JSON.stringify({pid:process.pid,startedUTC:new Date().toISOString(),
  job07:JOB07_ID,mode:'publication-only',noRerender:true},null,2));
 await lease.sync();
 try{
  const token=await permission();
  const remoteResult='/contents/runs/pc-godot-'+JOB07_ID+'-'+JOB07_SOURCE+'/godot-job-result.json?ref='+RESULT_BRANCH;
  try{
   await api(token,remoteResult);
   throw Error('An immutable remote job07 report already exists: do not duplicate or overwrite it');
  }catch(e){
   if(!String(e.message).includes('status 404'))throw e;
  }
  const j=await currentJob();
  if(j.jobId!==JOB07_ID||j.commit!==JOB07_SOURCE||j.sceneMode!=='clinic-cases')
   throw Error('GitHub approved active request no longer exactly job07; refusing archival publication');
  const capture=path.join(target,'Captures');
  const workerResult={
   jobId:JOB07_ID,sourceGitSHA:JOB07_SOURCE,watcherSuite:j.suite,
   workerGitSHA:JOB07_WORKER,
   recoveryToolGitSHA:recovery.recoveryToolSHA,
   nativeSceneMode:'clinic-cases',fullKlinikLabApplicationMigrated:false,
   executedOn:'original owner Windows PC, interrupted watcher process',
   generatedAt:new Date().toISOString(),
   nativeReportStatus:'OWNER_PC_RESULT_ABSENT_ORIGINAL_RAW_GODOT_CAPTURE_ONLY',
   nativeWorkflowVerified:true,imageExists:true,angledImageExists:true,
   originalNativeImagesVerified:true,
   sourceMeshVerified:true,sourceDerivedWorkflowNavigationVerified:true,
   distinctRtx5060Gpu3DPeriods:0,rtx5060DxgiLuid:null,dxgiLuidMatchesGodotProcess:false,
   gpuProcessCorroborated:false,imageIndependentPixelReviewAccepted:false,
   backgroundPrivateDesktopRenderRequested:true,foregroundActivationRequested:false,
   headlessDummyRendererAllowed:false,
   recoveryOnly:true,reexecuted:false,
   overallStatus:'EVIDENCE_INCOMPLETE',
   errors:['Original watcher terminated before collector final JSON and regular worker result were written'],
   blockers:['No original owner-PC result: independent Godot-PID/DXGI/PDH GPU proof not available',
    'The raw Godot self-report and PNGs are not independently sufficient for process GPU acceptance'],
   ledgerEntryAbsentAtRecovery:!prev,
   rawForensicsFile:'godot-job07-forensic-review.json'
  };
  // Atomically refuse overwrites of previous original reports or results.
  await fs.writeFile(path.join(capture,'godot-job07-forensic-review.json'),
   jsonWithoutBom(recovery),{flag:'wx'});
  await fs.writeFile(path.join(capture,'godot-job-result.json'),
   jsonWithoutBom(workerResult),{flag:'wx'});
  ledger.completed[JOB07_ID]={commit:JOB07_SOURCE,status:'publish-pending',
   run:target,result:workerResult,endedAt:new Date().toISOString(),recoveryOnly:true};
  await saveLedger(ledger);
  const url=await publish(j,target,workerResult);
  ledger.completed[JOB07_ID]={...ledger.completed[JOB07_ID],
   status:'published',url,publishedAt:new Date().toISOString()};
  await saveLedger(ledger);
  await heartbeat('job07-archived-incomplete-no-rerender',JOB07_ID,{url,reexecuted:false});
  console.log('JOB07 ORIGINALS PRESERVED/PUBLISHED WITHOUT RERENDER; GPU INCOMPLETE:',url);
 } finally{
  await lease.close(); // intentionally preserve separate recovery lease as historical marker
 }
}

/** Explicit, post-publication stale lease archival; never delete the lock.
 * Job07 must be published as recovered incomplete and old watcher process dead.
 */
async function retireArchivedJob07StaleLease(){
 if(process.platform!=='win32')throw Error('Owner Windows PC only');
 const status=await readGodotWorkerLease(ROOT);
 if(!status.exists||status.malformed||status.processAlive!==false ||
    status.jobPoller!=='visual-qa/godot-worker.mjs')
  throw Error('Refusing lease retirement without complete dead-owner evidence');
 const state=await readLedger(),prior=state.completed?.[JOB07_ID];
 if(!prior||prior.commit!==JOB07_SOURCE||prior.status!=='published'||
    prior.recoveryOnly!==true || prior.result?.reexecuted!==false ||
    prior.result?.gpuProcessCorroborated!==false ||
    !String(prior.url||'').includes('/runs/pc-godot-'+JOB07_ID+'-'))
  throw Error('Job07 not safely published with GPU-INCOMPLETE recovery-only identity');
 const ps="(Get-ScheduledTask -TaskName 'KlinikLab-Godot-PC-Watcher' -ErrorAction Stop).State.ToString()";
 const t=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],
  {encoding:'utf8',timeout:20000,windowsHide:true,env:cleanWindowsPowerShellEnv(process.env)});
 if(t.status!==0||!['Ready','Disabled'].includes(String(t.stdout||'').trim()))
  throw Error('Original Scheduled Task is not verified stopped (Ready/Disabled): '+String(t.stdout||t.stderr).trim().slice(0,140));
 const from=path.join(ROOT,'godot-worker-active.lock');
 const dest=path.join(ROOT,'godot-worker-active.lock.job07-archived-'+status.pid);
 try{await fs.access(dest);throw Error('Preserved archive already exists; no double retirement')}
 catch(e){if(e.code!=='ENOENT')throw e}
 const check=await readGodotWorkerLease(ROOT);
 if(check.pid!==status.pid||check.processAlive!==false)throw Error('Watcher ownership changed during audit');
 await fs.rename(from,dest); // preserve byte-for-byte original stale lock
 console.log('Original dead watcher lease ARCHIVED, not deleted:',dest,
  '; job07 remains immutable EVIDENCE_INCOMPLETE. New watcher may be separately installed.');
}


/** The scheduled-task wrapper sets KLINIKLAB_GODOT_EXE in its own process,
 * just before Start-Process. An interactive --validate does not inherit it.
 * Only the lease-holding watcher writes the per-PID runtime receipt.
 */
function workerSha(){return git(['rev-parse','HEAD'],path.resolve(sourceDir,'..'))}
async function writeRuntimeReceipt(job,publisherPermissionVerified){
 const exe=process.env.KLINIKLAB_GODOT_EXE;
 if(!exe||!path.win32.isAbsolute(exe))throw Error('Watcher Godot executable environment not absolute');
 await fs.access(exe);
 const lease=await readGodotWorkerLease(ROOT);
 if(!lease.exists||lease.pid!==process.pid||lease.processAlive!==true)
  throw Error('Cannot attest runtime without the OWNED live watcher lease');
 const receipt={
  schemaVersion:1,workerPid:process.pid,workerGitSHA:workerSha(),
  parentPid:process.ppid,updatedUTC:new Date().toISOString(),
  godotExecutablePath:path.win32.normalize(exe),
  executableExists:true,executableEnvironmentInherited:true,
  childPowerShellHashModuleVerified:true,
  githubPublisherPermissionVerified:publisherPermissionVerified,
  currentApprovedJob:job.jobId,sourceGitSHA:job.commit,
  githubJobApprovalVerified:true,
  privateDesktopOnly:true,fullKlinikLabApplicationMigrated:false,
  noJobExecutedByReceipt:true
 };
 const tmp=RUNTIME+'.'+process.pid+'.tmp';
 await fs.writeFile(tmp,jsonWithoutBom(receipt));
 await fs.rename(tmp,RUNTIME);
}
/** Optional owner-only cleanup of a dead *idle* watcher after task stop.
 * Preserves old lock bytes; NEVER clears a live lock or uncertain job state.
 */
async function archiveDeadIdleWatcherLease(){
 if(process.platform!=='win32')throw Error('Owner Windows PC only');
 const lease=await readGodotWorkerLease(ROOT);
 if(!lease.exists||lease.malformed||lease.processAlive!==false||
  lease.jobPoller!=='visual-qa/godot-worker.mjs')
  throw Error('Idle-upgrade lock archive requires confirmed dead previous worker PID');
 const ledger=await readLedger();
 if(Object.values(ledger.completed||{}).some(x=>['executing','publish-pending'].includes(x?.status)))
  throw Error('One or more prior jobs might be incomplete; refusing lease archive');
 const job07=ledger.completed?.[JOB07_ID];
 if(job07?.commit!==JOB07_SOURCE||job07?.status!=='published'||
  job07?.recoveryOnly!==true||job07?.result?.reexecuted!==false||
  job07?.result?.overallStatus!=='EVIDENCE_INCOMPLETE')
  throw Error('Original job07 must remain safely published incomplete');
 const ps="(Get-ScheduledTask -TaskName 'KlinikLab-Godot-PC-Watcher' -ErrorAction Stop).State.ToString()";
 const task=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],
  {encoding:'utf8',windowsHide:true,timeout:20000,env:cleanWindowsPowerShellEnv(process.env)});
 if(task.status!==0||!['Ready','Disabled'].includes(String(task.stdout||'').trim()))
  throw Error('Owner task is not stopped; refusing archived lease migration');
 const current=await readGodotWorkerLease(ROOT);
 if(current.pid!==lease.pid||current.processAlive!==false)
  throw Error('Watcher lock changed during dead-PID verification');
 const original=path.join(ROOT,'godot-worker-active.lock');
 const saved=path.join(ROOT,'godot-worker-active.lock.idle-upgrade-'+lease.pid);
 try{await fs.access(saved);throw Error('Idle upgrade archive path already exists')}
 catch(e){if(e.code!=='ENOENT')throw e}
 await fs.rename(original,saved); // preserve the exact original bytes
 console.log('ARCHIVED_DEAD_IDLE_WATCHER_LEASE',JSON.stringify({oldPid:lease.pid,path:saved,
  job07Untouched:true,noGodotLaunched:true}));
}

async function validateWithoutHeartbeat(){
 // Real preflight MUST fail nonzero, and NEVER touch another process heartbeat.
 await initialize();
 const ps=verifyChildHashModule();
 const job=await currentJob();
 const ledger=await readLedger();
 if(ledger.completed?.[job.jobId]?.commit &&
    ledger.completed[job.jobId].commit!==job.commit)throw Error('Job ID reused with another source commit');
 await permission();
 console.log(JSON.stringify({status:'VALIDATED_NO_EXECUTION',jobId:job.jobId,
  jobAlreadyTerminal:['published','failed'].includes(ledger.completed?.[job.jobId]?.status),
  sourceSHA:job.commit,workerGitSHA:workerSha(),
  godotExecutablePath:path.win32.normalize(process.env.KLINIKLAB_GODOT_EXE),
  childPowerShell:ps,heartbeatUntouched:true,noGodotLaunched:true},null,2));
}
async function probeNextJobWithoutExecuting(){
 // This is a proof of queue *admission*, not a future RTX render/launch.
 // Reads the LIVE watcher's environment receipt. No Godot path is required
 // in this diagnostic terminal; no heartbeat, lock or ledger is written.
 if(process.platform!=='win32')throw Error('Owner Windows PC only');
 const lease=await readGodotWorkerLease(ROOT);
 const receipt=parseGodotJson(await fs.readFile(RUNTIME,'utf8'),'running watcher runtime receipt');
 // Only read the last GitHub job fetched by the lease-holder. Do not
 // run git fetch concurrently against the watcher's shared FETCH_HEAD.
 // Its fresh signed-by-runtime receipt proves the task checked approval.
 const current=validateGodotJob(parseGodotJson(
  git(['show','FETCH_HEAD:'+JOB_REF]),'last watcher-fetched GitHub job'));
 const ledger=await readLedger();
 const candidate=verifyNextJobAdmission({
  lease,receipt,current,ledger,workerSHA:workerSha()
 });
 if(!path.win32.isAbsolute(receipt.godotExecutablePath))
  throw Error('Runtime Godot executable path is not absolute');
 await fs.access(receipt.godotExecutablePath);
 const run=path.join(EVIDENCE,candidate.jobId+'-'+candidate.commit.slice(0,10));
 try{await fs.access(run);throw Error('Probe-only evidence folder exists')}
 catch(e){if(e.code!=='ENOENT')throw e}
 console.log(JSON.stringify({
  status:'READY_FOR_FUTURE_UNIQUE_JOB_ADMISSION_NOT_EXECUTED',
  watcherPid:lease.pid,workerGitSHA:receipt.workerGitSHA,
  inheritedGodotExePath:receipt.godotExecutablePath,
  publisherPermissionVerifiedInWatcher:true,
  sourceGitSHA:candidate.commit,approvedSchema:candidate.schemaVersion,
  candidateIdExampleOnly:candidate.jobId,
  job07PreservedPublishedIncomplete:true,
  noGodotLaunch:true,noLedgerWrite:true,noHeartbeatWrite:true,
  limitation:'Actual execution and GPU/PNG proof require a separately approved NEW GitHub job, never job07'
 },null,2));
}

let busy=false;
async function tick(){
 if(busy)return;busy=true;
 let j=null;
 try{
  await initialize();await heartbeat('polling');
  const childPowerShell=verifyChildHashModule();
  await heartbeat('powershell-hash-module-verified',null,{childPowerShell});
  j=await currentJob();
  const state=await readLedger(),previous=state.completed[j.jobId];
  if(previous?.commit&&previous.commit!==j.commit)throw Error('Job ID reused with different commit');
  // Always check publisher permissions from the actual LEASE-HOLDING
  // task environment, even when the currently queued job is terminal.
  // A terminal job must never be rerendered.
  await permission();
  await writeRuntimeReceipt(j,true);
  if(previous?.status==='published'||previous?.status==='failed'){
   await heartbeat(previous.status,j.jobId,previous);return;
  }
  if(!previous){
   state.completed[j.jobId]={commit:j.commit,status:'executing',startedAt:new Date().toISOString()};
   await saveLedger(state);await heartbeat('executing',j.jobId);
   const {run,result}=await execute(j);
   state.completed[j.jobId]={commit:j.commit,status:'publish-pending',run,
    result,endedAt:new Date().toISOString()};
   await saveLedger(state);
  } else if(previous.status==='executing'){
   await heartbeat('interrupted-execution-needs-new-ID',j.jobId);
   return;
  }
  const saved=state.completed[j.jobId];
  if(saved.status==='publish-pending'){
   await heartbeat('publish-pending',j.jobId);
   const url=await publish(j,saved.run,saved.result);
   saved.status='published';saved.url=url;saved.publishedAt=new Date().toISOString();
   await saveLedger(state);await heartbeat('published',j.jobId,{url});
   textLog('Godot PC evidence published',url);
  }
 }catch(e){textLog('Godot PC worker blocker',e.message);try{await heartbeat('blocked',j?.jobId||null,{error:String(e.message).slice(0,400)})}catch{}}
 finally{busy=false}
}
function textLog(...x){console.log(...x)}
// --validate is read-only/preflight, never captures, and does not take the
// rendering lease. --once, --watch and repair mutually exclude one another.
const args=process.argv.slice(2);
const modes=['--watch','--once','--validate','--recover-incomplete','--lock-status','--probe-next-job','--archive-dead-idle-lease','--diagnose-job07','--archive-job07','--retire-archived-job07-lock'].filter(x=>args.includes(x));
if(modes.length>1)throw Error('Select only one approved Godot worker mode');
if(args.some(x=>!modes.includes(x)))throw Error('Unknown Godot worker argument');
if(modes.includes('--archive-dead-idle-lease')){
 await archiveDeadIdleWatcherLease();
}else if(modes.includes('--probe-next-job')){
 await probeNextJobWithoutExecuting();
}else if(modes.includes('--retire-archived-job07-lock')){
 await retireArchivedJob07StaleLease();
}else if(modes.includes('--diagnose-job07')){
 await recoverRawJob07({diagnoseOnly:true});
}else if(modes.includes('--archive-job07')){
 await recoverRawJob07({diagnoseOnly:false});
}else if(modes.includes('--lock-status')){
 const info=await readGodotWorkerLease(ROOT);
 console.log(JSON.stringify({workerLease:info,heartbeat:HEARTBEAT,ledger:LEDGER},null,2));
}else if(modes.includes('--validate')){
 await validateWithoutHeartbeat(); // thrown preflight errors exit nonzero; no heartbeat writes
}else if(modes.includes('--recover-incomplete')){
 const lease=await acquireGodotWorkerLease(ROOT);
 try{await recoverIncompleteAttempts()}finally{await lease.release()}
}else if(modes.includes('--watch')){
 const lease=await acquireGodotWorkerLease(ROOT);
 let stopping=false,timer=null,activeCycle=Promise.resolve();
 const cycle=()=>{
  if(stopping)return;
  activeCycle=tick(); // tick owns its own catch and heartbeat
 };
 const stop=()=>{
  if(stopping)return;
  stopping=true;
  if(timer!==null)clearInterval(timer);
  void activeCycle.finally(()=>lease.release()).catch(e=>{
   console.error('Godot worker lease cleanup failed:',e);
   process.exitCode=1;
  });
 };
 process.once('SIGINT',stop);
 process.once('SIGTERM',stop);
 cycle();
 await activeCycle;
 if(!stopping)timer=setInterval(cycle,10000);
 console.log('GitHub Godot PC watcher polling each 10 seconds; private-desktop captures only; PID',process.pid);
}else{
 const lease=await acquireGodotWorkerLease(ROOT);
 try{await tick()}finally{await lease.release()}
}
