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

const REMOTE='https://github.com/ajeshkg17/KlinikLab.git';
const ROOT=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'KlinikLabGodotWorker');
const REPO=path.join(ROOT,'source-repo');
const LEDGER=path.join(ROOT,'godot-ledger.json');
const HEARTBEAT=path.join(ROOT,'godot-heartbeat.json');
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
  throw Error('Set KLINIKLAB_GODOT_EXE to installed Windows Godot 4.7.2 executable');
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
 if(!preparationError){
  try{
   await powershell(path.join(sourceDir,'sr1c-capture-godot-background-pc.ps1'),
    ['-EvidenceDir',run,'-ExpectedSha',j.commit,
     '-GodotExe',process.env.KLINIKLAB_GODOT_EXE],j.timeoutSec*1000);
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
  executedOn:'owner Windows PC (watcher runtime)',generatedAt:new Date().toISOString(),
  nativeReportStatus:native?.status||'EVIDENCE_INCOMPLETE',
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
 if(!native?.nativeImagePresent||!native?.nativeAngledImagePresent||!native?.nativeSourceSubmissionVerified||!native?.godotProcessGPUCorroborated||!native?.gpuAdapterLuidMatchedToNvidia)
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
  ['godot-owner-pc-result.json',path.join(capture,'godot-owner-pc-result.json')],
  ['native-source-submission.json',path.join(capture,'native-source-submission.json')],
  ['godot-source-prepare.json',path.join(run,'godot-source-prepare.json')],
  ['godot-gpu-3d-counters.json',path.join(capture,'godot-gpu-3d-counters.json')],
  ['godot-background-capture.json',path.join(capture,'godot-background-capture.json')],
  ['godot-native-background.log',path.join(capture,'godot-native-background.log')],
  ['godot-native-stdout.log',path.join(capture,'godot-native-stdout.log')],
  ['godot-native-stderr.log',path.join(capture,'godot-native-stderr.log')]
 ];
 if(result.imageExists){
  const native=parseGodotJson(await fs.readFile(path.join(capture,'godot-owner-pc-result.json'),'utf8'),'published original owner-PC JSON');
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
  'Status: '+result.overallStatus,'',
  'Evidence captured by dedicated Godot PC worker, **not** by GitHub Actions or Linux.',
  'Source hash and screenshot pixel verification are independent tests.',
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
  if(process.argv.includes('--validate')){
   await permission();
   textLog('Godot job valid; PC and GitHub permissions ready',j.jobId,previous?.status||'new');
   await heartbeat('validated',j.jobId);return;
  }
  if(previous?.status==='published'||previous?.status==='failed'){
   await heartbeat(previous.status,j.jobId,previous);return;
  }
  await permission();
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
if(process.argv.includes('--recover-incomplete')){
 await recoverIncompleteAttempts(); // never calls execute(), powershell(), or Godot
}else{
 await tick();
 if(process.argv.includes('--watch'))setInterval(tick,10000);
}
