import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateXRJob,INTEGRATION_BRANCH,JOB_REF,RESULT_BRANCH} from './xr-job-core.mjs';
const ROOT=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'KlinikLabVisualWorker');
const REPO=path.join(ROOT,'xr-repo'), REMOTE='https://github.com/ajeshkg17/KlinikLab.git';
const LEDGER=path.join(ROOT,'xr-completed.json'), URL='http://127.0.0.1:8891/';
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
async function ledger(){try{return JSON.parse(await fs.readFile(LEDGER,'utf8'))}catch{return {completed:{}}}}
async function fetchJob(){
 git(['fetch','origin',INTEGRATION_BRANCH]);
 const head=git(['rev-parse','FETCH_HEAD']);
 const j=validateXRJob(JSON.parse(git(['show','FETCH_HEAD:'+JOB_REF])));
 git(['cat-file','-e',j.commit+'^{commit}']);
 git(['merge-base','--is-ancestor',j.commit,head]);
 return j;
}
async function execute(job){
 const checkout=path.join(ROOT,'xr-'+job.jobId);
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
   KLINIKLAB_XR_GRAPHICS:job.graphics,KLINIKLAB_XR_DEADLINE_MS:String(job.deadlineMs)});
  const dir=path.join(checkout,'output','playwright','webxr-smoke');
  const result=JSON.parse(await fs.readFile(path.join(dir,'result.json'),'utf8'));
  if(!result.passed||result.captureManifest?.length!==8)throw Error('IWER checks or captures incomplete');
  const names=['01-room-table-unobstructed.png','02-both-controller-models.png','03-left-tool-hover.png','04-left-hand-mirror-pickup.png','05-mirror-release-return.png','06-right-hand-composite-pickup.png','07-help-opened-by-question-mark.png','08-help-closed-after-close.png'];
  const captures=await Promise.all(names.map(async name=>({name,bytes:await fs.readFile(path.join(dir,name))})));
  return {result,captures};
 }finally{
  if(server){server.kill();await sleep(300)}
  git(['worktree','remove','--force',checkout]);
 }
}
async function publish(job,{result,captures}){
 // GitHub git-data API: upload only new blobs; never checkout/download old visual-feedback PNGs.
 const auth=spawnSync('gh',['auth','token'],{encoding:'utf8',timeout:15000});
 if(auth.status!==0||!auth.stdout.trim())throw Error('Install GitHub CLI and authorize push access: gh auth login');
 const token=auth.stdout.trim(),base='https://api.github.com/repos/ajeshkg17/KlinikLab';
 async function api(endpoint,method='GET',data){
  const response=await fetch(base+endpoint,{method,headers:{
   Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'
  },body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('GitHub '+method+' '+endpoint+' returned '+response.status);
  return response.json();
 }
 const ref=await api('/git/ref/heads/'+RESULT_BRANCH);
 const parent=ref.object.sha,commit=await api('/git/commits/'+parent);
 const prefix='runs/pc-xr-'+job.jobId+'-'+job.commit;
 // A commit-linked job ID must be fresh and cannot replace earlier evidence.
 try{const existing=await api('/contents/'+prefix+'/result.json?ref='+RESULT_BRANCH);
   if(existing)throw Error('Evidence for this job ID already exists; refusing to replace it');
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
 const index=['# Owner-PC XR evidence','', 'Job: '+job.jobId,
  'Tested commit: '+job.commit,'','Meta IWER Quest2 in desktop Chrome; not physical headset evidence.',
  'Captured from a newly rendered XR eye frame when framebuffer readback is supported.',
  duplicates.length?'Duplicate frames: '+JSON.stringify(duplicates):'No byte-identical images; framing still needs human review.',''];
 for(const {name} of captures)index.push('## '+name,'','!['+name+'](./'+name+')','');
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
 try{
  await init();
  const job=await fetchJob(),state=await ledger();
  if(state.completed[job.jobId])return;
  if(process.argv.includes('--validate')){console.log('Valid XR job',job.jobId,job.commit);return}
  console.log('Executing once',job.jobId,job.commit);
  state.completed[job.jobId]={commit:job.commit,status:'started',startedAt:new Date().toISOString()};
  const tmp=LEDGER+'.tmp';await fs.writeFile(tmp,JSON.stringify(state,null,2));await fs.rename(tmp,LEDGER);
  try{const data=await execute(job),url=await publish(job,data);
   state.completed[job.jobId]={url,commit:job.commit,status:'published',finishedAt:new Date().toISOString()};
   console.log('Published',url);
  }catch(error){state.completed[job.jobId]={commit:job.commit,status:'failed',error:String(error.message).slice(0,400)};throw error}
  finally{await fs.writeFile(tmp,JSON.stringify(state,null,2));await fs.rename(tmp,LEDGER)}
 }catch(e){console.error('XR worker error',e.message)}
 finally{busy=false}
}
await tick();
if(process.argv.includes('--watch'))setInterval(tick,10000);
