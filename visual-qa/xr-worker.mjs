import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateXRJob,INTEGRATION_BRANCH,JOB_REF,RESULT_BRANCH} from './xr-job-core.mjs';
const ROOT=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'KlinikLabVisualWorker');
const REPO=path.join(ROOT,'xr-repo'), REMOTE='https://github.com/ajeshkg17/KlinikLab.git';
const LEDGER=path.join(ROOT,'xr-completed.json'), HEARTBEAT=path.join(ROOT,'xr-heartbeat.json'), EVIDENCE=path.join(ROOT,'xr-evidence'), URL='http://127.0.0.1:8891/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function git(args,cwd=REPO){
 const p=spawnSync('git',args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
 if(p.status!==0)throw Error('git '+args[0]+': '+String(p.stderr||p.error).slice(0,350));
 return p.stdout.trim();
}
function run(cmd,args,cwd,env={}){
 return new Promise((resolve,reject)=>{
  const p=spawn(cmd,args,{cwd,env:{...process.env,...env},stdio:'inherit',shell:false});
  p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(cmd+' exit '+code)));
 });
}
async function init(){
 await fs.mkdir(ROOT,{recursive:true});
 try{await fs.access(path.join(REPO,'.git'))}catch{git(['clone','--filter=blob:none','--no-checkout',REMOTE,REPO],ROOT)}
 if(git(['remote','get-url','origin'])!==REMOTE)throw Error('Unexpected remote');
}
async function ledger(){try{return JSON.parse(await fs.readFile(LEDGER,'utf8'))}catch(e){if(e.code==='ENOENT')return {completed:{}};throw e}}
async function saveLedger(state){const tmp=LEDGER+'.tmp';await fs.writeFile(tmp,JSON.stringify(state,null,2));await fs.rename(tmp,LEDGER)}
async function heartbeat(status,jobId=null){await fs.writeFile(HEARTBEAT,JSON.stringify({pid:process.pid,at:new Date().toISOString(),status,jobId},null,2))}
function credential(){
 // Git Credential Manager is accessed through the user's configured Git helper,
 // without prompts, printing, writing token files, or modifying git config.
 const p=spawnSync('git',['-c','credential.interactive=never','credential','fill'],{
  input:'protocol=https\\nhost=github.com\\n\\n'.replaceAll('\\n','\n'),
  encoding:'utf8',timeout:15000,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(p.status!==0)throw Error('Git credential helper unavailable: sign in to GitHub via Git Credential Manager');
 const fields=Object.fromEntries(p.stdout.split(/\r?\n/).filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
 if(fields.protocol!=='https'||fields.host!=='github.com'||!fields.password)throw Error('No usable HTTPS github.com credential in Git Credential Manager');
 return fields.password;
}
async function githubApi(token,endpoint,method='GET',data){
 const r=await fetch('https://api.github.com/repos/ajeshkg17/KlinikLab'+endpoint,{method,headers:{
  Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
  body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('GitHub '+method+' '+endpoint+' returned '+r.status);
 return r.json();
}
async function preflight(){
 const token=credential();
 const repo=await githubApi(token,'');
 if(repo.permissions?.push!==true)throw Error('GitHub credential lacks repository push permission');
 await githubApi(token,'/git/ref/heads/'+RESULT_BRANCH);
 return token;
}
const PROCEDURE_FILES=[
 '01-select-fdi16.png','02-precut.png','03-aim.png',
 '04-cut.png','05-postcut.png','06-switchback.png',
 'procedure-manifest.json','storyboard.md'
];
const procedureRunId=job=>'fdi16-'+job.jobId;
async function loadProcedure(dir,job,result){
 if(!job.procedureCapture)return null;
 const id=procedureRunId(job),sub='procedure/'+id;
 if(result.procedureEvidence?.runId!==id)throw Error('Procedure evidence missing or wrong run ID');
 const manifest=JSON.parse(await fs.readFile(path.join(dir,sub,'procedure-manifest.json'),'utf8'));
 if(!manifest.passed||manifest.steps?.length!==6||manifest.testedCommit!==job.commit)throw Error('Procedure manifest incomplete');
 const files=[];
 for(const name of PROCEDURE_FILES){
  const bytes=await fs.readFile(path.join(dir,sub,name));
  if(name.endsWith('.png')){
   const step=manifest.steps.find(x=>x.file===name);
   if(!step||step.eyes!==2||step.frame<1||
     step.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('Procedure stereo PNG invalid: '+name);
  }
  files.push({name:sub+'/'+name,bytes});
 }
 const optional=['video/video-check.json','video/actual-app-playwright.webm'];
 for(const name of optional){
  try{const bytes=await fs.readFile(path.join(dir,sub,name));files.push({name:sub+'/'+name,bytes})}
  catch(e){if(e.code!=='ENOENT')throw e}
 }
 return {id,manifest,files};
}
async function loadEvidence(job){
 const dir=path.join(EVIDENCE,job.jobId);
 const result=JSON.parse(await fs.readFile(path.join(dir,'result.json'),'utf8'));
 const captures=await Promise.all(result.captureManifest.map(async ({file})=>({name:file,bytes:await fs.readFile(path.join(dir,file))})));
 if(!result.passed||captures.length!==10)throw Error('Incomplete retained evidence');
 const procedure=await loadProcedure(dir,job,result);
 return {result,captures,procedure};
}
async function fetchJob(){
 git(['fetch','origin',INTEGRATION_BRANCH]);
 const head=git(['rev-parse','FETCH_HEAD']);
 const j=validateXRJob(JSON.parse(git(['show','FETCH_HEAD:'+JOB_REF])));
 git(['cat-file','-e',j.commit+'^{commit}']);
 git(['merge-base','--is-ancestor',j.commit,head]);
 return j;
}
async function execute(job){
 const checkout=path.join(ROOT,'w',job.commit.slice(0,12));
 await fs.rm(checkout,{recursive:true,force:true});
 git(['worktree','prune']);
 git(['worktree','add','--detach',checkout,job.commit]);
 let server;
 try{
  await run(process.platform==='win32'?'cmd.exe':'npm',process.platform==='win32'?['/d','/s','/c','npm.cmd','ci','--prefix','test-support/webxr-test','--no-audit','--no-fund']:['ci','--prefix','test-support/webxr-test','--no-audit','--no-fund'],checkout);
  try{await fetch(URL+'api/health',{signal:AbortSignal.timeout(900)});throw Error('Dedicated port 8891 already in use; refusing to test wrong checkout')}catch(e){if(e.message.includes('already in use'))throw e}
  server=spawn(process.execPath,['server/server.mjs'],{cwd:checkout,stdio:'ignore',env:{...process.env,PORT:'8891'}});
  let ready=false;
  for(let i=0;i<80;i++){
   if(server.exitCode!==null)break;
   try{const r=await fetch(URL+'api/health',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break}}catch{}
   await sleep(500);
  }
  if(!ready)throw Error('Dedicated port 8891 unavailable; no existing server was changed');
  await run(process.execPath,['test-support/webxr-test/smoke.mjs'],checkout,{
   KLINIKLAB_URL:URL,KLINIKLAB_BUILD_SHA:job.commit,
   KLINIKLAB_XR_GRAPHICS:job.graphics,KLINIKLAB_XR_DEADLINE_MS:String(job.deadlineMs),
   KLINIKLAB_PROCEDURE_CAPTURE:job.procedureCapture?'1':'0',
   KLINIKLAB_PROCEDURE_RUN_ID:job.procedureCapture?procedureRunId(job):''});
  const dir=path.join(checkout,'output','playwright','webxr-smoke');
  const result=JSON.parse(await fs.readFile(path.join(dir,'result.json'),'utf8'));
  if(!result.passed||result.captureManifest?.length!==10)throw Error('IWER checks or captures incomplete');
  const names=['01-room-table-unobstructed.png','02-both-controller-models.png','03-left-tool-hover.png','04-left-hand-mirror-pickup.png','05-mirror-release-return.png','06-right-hand-composite-pickup.png','07-help-opened-by-question-mark.png','08-help-closed-after-close.png','09-tool-catalog-open.png','10-tool-catalog-closed.png'];
  const captures=await Promise.all(names.map(async name=>({name,bytes:await fs.readFile(path.join(dir,name))})));
  // Durable staging before the checkout can be deleted. Preserve failed captures
  // locally too; never depend on the ephemeral worktree for publication retries.
  const retained=path.join(EVIDENCE,job.jobId);
  await fs.mkdir(retained,{recursive:true});
  await fs.copyFile(path.join(dir,'result.json'),path.join(retained,'result.json'));
  for(const {name,bytes} of captures)await fs.writeFile(path.join(retained,name),bytes);
  let procedure=null;
  if(job.procedureCapture){
   procedure=await loadProcedure(dir,job,result);
   const sub=path.join(retained,'procedure',procedure.id);
   await fs.mkdir(sub,{recursive:true});
   for(const file of procedure.files){
    const target=path.join(retained,file.name);
    await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,file.bytes);
   }
  }
  return {result,captures,procedure};
 }finally{
  if(server){server.kill();await sleep(300)}
  // Even a failed smoke run can contain diagnostically useful images/logs.
  const output=path.join(checkout,'output','playwright','webxr-smoke');
  try{await fs.cp(output,path.join(EVIDENCE,job.jobId,'diagnostics'),{recursive:true,force:true})}catch{}
  // Cleanup is best effort once rendered evidence is durably staged. Windows
  // dependency paths may exceed MAX_PATH; never turn successful rendering
  // into a failed job or suppress publication because of cleanup.
  try{git(['worktree','remove','--force',checkout]);}
  catch(error){
   const diagnostics=path.join(EVIDENCE,job.jobId,'cleanup-error.txt');
   await fs.mkdir(path.dirname(diagnostics),{recursive:true});
   await fs.writeFile(diagnostics,new Date().toISOString()+' '+String(error.message||error)+'\\n');
   console.error('Nonfatal worktree cleanup error; retained evidence remains publishable:',String(error.message||error).slice(0,240));
  }
 }
}
async function publish(job,{result,captures,procedure}){
 // GitHub git-data API: upload only new blobs; never checkout/download old visual-feedback PNGs.
 const token=await preflight();
 const api=(endpoint,method='GET',data)=>githubApi(token,endpoint,method,data);
 const ref=await api('/git/ref/heads/'+RESULT_BRANCH);
 const parent=ref.object.sha,commit=await api('/git/commits/'+parent);
 const prefix='runs/pc-xr-'+job.jobId+'-'+job.commit;
 // A commit-linked job ID must be fresh and cannot replace earlier evidence.
 try{
   const existing=await api('/contents/'+prefix+'/result.json?ref='+RESULT_BRANCH);
   if(existing){
    // Publication can have succeeded before the HTTP reply was lost.
    // Inspect only metadata; never fetch prior PNGs or overwrite evidence.
    const pointer=await api('/contents/PC_XR_LATEST.md?ref='+RESULT_BRANCH);
    if(pointer&&existing.path===prefix+'/result.json')return 'https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/'+prefix+'/README.md';
   }
 }catch(e){if(!String(e.message).includes('returned 404'))throw e}
 const seen=new Map(),duplicates=[],hashes=[],files=[];
 for(const {name,bytes} of captures){
  const checksum=createHash('sha256').update(bytes).digest('hex');
  if(seen.has(checksum))duplicates.push({file:name,sameAs:seen.get(checksum)});else seen.set(checksum,name);
  hashes.push({file:name,sha256:checksum});
  files.push({path:prefix+'/'+name,contents:bytes,encoding:'base64'});
 }
 const report={...result,jobId:job.jobId,testedCommit:job.commit,
  location:'owner-PC IWER emulator, not a physical headset',captureHashes:hashes,duplicates};
 files.push({path:prefix+'/result.json',contents:Buffer.from(JSON.stringify(report,null,2)),encoding:'base64'});
 if(job.procedureCapture){
  if(!procedure||procedure.manifest.testedCommit!==job.commit)throw Error('No verified procedure files to publish');
  for(const item of procedure.files){
   // Opt-in source-derived files only; no arbitrary job-controlled paths.
   files.push({path:prefix+'/'+item.name,contents:item.bytes,encoding:'base64'});
  }
 }
 const index=['# Owner-PC XR evidence','', 'Job: '+job.jobId,
  'Tested commit: '+job.commit,'','Meta IWER Quest2 in desktop Chrome; not physical headset evidence.',
  'Captured from a newly rendered XR eye frame when framebuffer readback is supported.',
  duplicates.length?'Duplicate frames: '+JSON.stringify(duplicates):'No byte-identical images; framing still needs human review.',''];
 for(const {name} of captures)index.push('## '+name,'','!['+name+'](./'+name+')','');
 if(procedure){
  index.push('## OPTIONAL ACTUAL-APP FDI16 PROCEDURE (not a filmed dentist or physical Quest2)',
   '','Automated IWER controller; non-calibrated educational preparation; professional dental review pending.',
   '','[Read six-step storyboard](./procedure/'+procedure.id+'/storyboard.md)',
   '','[Inspect original manifest](./procedure/'+procedure.id+'/procedure-manifest.json)','');
  for(const step of procedure.manifest.steps)index.push('### Step '+step.n+' — '+step.label,'',
   '!['+step.label+'](./procedure/'+procedure.id+'/'+step.file+')','');
  if(procedure.files.some(f=>f.name.endsWith('/actual-app-playwright.webm')))
   index.push('[Playwright recorded stereo-step video — playback review pending](./procedure/'+procedure.id+'/video/actual-app-playwright.webm)','');
 }
 files.push({path:prefix+'/README.md',contents:Buffer.from(index.join('\n')),encoding:'base64'});
 files.push({path:'PC_XR_LATEST.md',contents:Buffer.from('# Latest owner-PC XR test\n\n[Browse '+job.jobId+'](./'+prefix+'/README.md)\n'),encoding:'base64'});
 const treeItems=[];
 for(const file of files){
  const blob=await api('/git/blobs','POST',{content:file.contents.toString('base64'),encoding:'base64'});
  treeItems.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});
 }
 const tree=await api('/git/trees','POST',{base_tree:commit.tree.sha,tree:treeItems});
 const newCommit=await api('/git/commits','POST',{message:'PC XR '+job.jobId+' at '+job.commit,tree:tree.sha,parents:[parent]});
 await api('/git/refs/heads/'+RESULT_BRANCH,'PATCH',{sha:newCommit.sha,force:false});
 return 'https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/'+prefix+'/README.md';
}

let busy=false;
async function tick(){
 if(busy)return;busy=true;
 let job=null;
 try{
  await init();
  await heartbeat('polling');
  job=await fetchJob();
  const state=await ledger(),previous=state.completed[job.jobId];
  if(previous?.commit&&previous.commit!==job.commit)throw Error('Job ID reused with a different commit');
  if(process.argv.includes('--validate')){
   console.log('Valid XR job',job.jobId,job.commit,'state',previous?.status||'new');return;
  }
  if(previous?.status==='published'){await heartbeat('published',job.jobId);return}
  if(previous?.status==='failed'){await heartbeat('failed-needs-new-job',job.jobId);return}
  // Upload permission must be available BEFORE rendering. No render should
  // happen when the owner PC cannot publish to the results branch.
  await preflight();
  if(previous?.status==='publish-pending'||previous?.status==='rendered'){
   await heartbeat('publish-pending',job.jobId);
   const data=await loadEvidence(job);
   const url=await publish(job,data);
   state.completed[job.jobId]={commit:job.commit,status:'published',url,publishedAt:new Date().toISOString()};
   await saveLedger(state);await heartbeat('published',job.jobId);
   console.log('Published',url);return;
  }
  if(previous?.status==='rendering'){
   // Avoid silently rerunning an interrupted render. Recovery requires a
   // deliberate new job ID; preserve diagnostics and intermediate files.
   await heartbeat('interrupted-render-needs-review',job.jobId);return;
  }
  state.completed[job.jobId]={commit:job.commit,status:'rendering',startedAt:new Date().toISOString()};
  await saveLedger(state);await heartbeat('rendering',job.jobId);
  try{
   await execute(job);
   state.completed[job.jobId]={commit:job.commit,status:'rendered',renderedAt:new Date().toISOString()};
   await saveLedger(state);
  }catch(error){
   state.completed[job.jobId]={commit:job.commit,status:'failed',error:String(error.message).slice(0,400)};
   await saveLedger(state);await heartbeat('failed',job.jobId);throw error;
  }
  state.completed[job.jobId].status='publish-pending';
  await saveLedger(state);await heartbeat('publish-pending',job.jobId);
  try{
   const url=await publish(job,await loadEvidence(job));
   state.completed[job.jobId]={commit:job.commit,status:'published',url,publishedAt:new Date().toISOString()};
   await saveLedger(state);await heartbeat('published',job.jobId);
   console.log('Published',url);
  }catch(error){
   // Upload failure is not a rendering failure; retry next poll with the
   // retained result.json and PNGs, without launching another browser.
   await heartbeat('publish-pending',job.jobId);throw error;
  }
 }catch(e){console.error('XR worker error',e.message)}
 finally{busy=false}
}
await tick();
if(process.argv.includes('--watch'))setInterval(tick,10000);
