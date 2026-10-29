/**
 * Local read-only browser QA worker. Only job JSON is fetched from the existing
 * local GitHub checkout; results are pushed to a separate GitHub branch.
 * No arbitrary code execution from job files, no private browser profile.
 */
import {readFile,writeFile,mkdir,rm,stat,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {validateJob,validatedBase,CONTROLS,CAPTURES,safeRunFolder,localRequestAllowed,RESULT_BRANCH} from './worker-core.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO=path.resolve(HERE,'..');
const JOB_PATH=path.join(HERE,'jobs','current.json');
const STATE_ROOT=path.join(process.env.LOCALAPPDATA || path.join(os.homedir(),'.local','share'),'KlinikLabVisualWorker');
const RESULTS_REPO=path.join(STATE_ROOT,'results-git');
const STATE_FILE=path.join(STATE_ROOT,'processed.json');
const ORIGIN=validatedBase().origin;
const REMOTE='https://github.com/ajeshkg17/KlinikLab.git';
const EVERY_MS=10000;
const DRY=process.argv.includes('--validate');
const ONCE=process.argv.includes('--once');
const trace = message => console.log(`[${new Date().toISOString()}] ${message}`);
const pause = ms => new Promise(r=>setTimeout(r,ms));
function git(args,{cwd=RESULTS_REPO,quiet=false}={}) {
  const r=spawnSync('git',args,{cwd,encoding:'utf8',timeout:60000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
  if(r.error || r.status!==0) throw new Error(`Git ${args[0]} failed: ${(r.stderr||r.error?.message||r.stdout||'unknown').slice(0,500)}`);
  return quiet?'':r.stdout.trim();
}
async function saveState(data){await mkdir(STATE_ROOT,{recursive:true});const tmp=STATE_FILE+'.tmp';await writeFile(tmp,JSON.stringify(data,null,2)+'\n');await rename(tmp,STATE_FILE)}
async function previous(){try{return JSON.parse(await readFile(STATE_FILE,'utf8'))}catch{return {jobId:null}}}
function verifyCheckout(){
  const origin=git(['remote','get-url','origin'],{cwd:REPO}).trim();
  if(!/^(?:https:\/\/github\.com\/|git@github\.com:)ajeshkg17\/KlinikLab(?:\.git)?$/i.test(origin))
    throw new Error('GitHub remote is not ajeshkg17/KlinikLab; refusing to upload screenshots.');
}
async function readJob(){return validateJob(JSON.parse(await readFile(JOB_PATH,'utf8')))}
async function serverReady(){
 for(let attempt=0;attempt<20;attempt++){
  try {
   const response=await fetch(ORIGIN,{signal:AbortSignal.timeout(2000)});
   if(response.ok){const html=await response.text();if(html.includes('KlinikLab')&&html.includes('id="scene"'))return;}
  }catch{}
  await pause(1500);
 }
 throw new Error('Local KlinikLab server is not answering at '+ORIGIN+'; start node server/server.mjs.');
}
async function capture(job){
 const dir=path.join(STATE_ROOT,'pending',job.jobId);
 await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
 const manifest={schemaVersion:1,jobId:job.jobId,origin:ORIGIN,utc:new Date().toISOString(),viewport:job.viewport,headsetTested:false,clinicalValidation:false,scenes:[]};
 let browser;
 try{
  const {chromium}=await import('playwright');
  // Chrome runs in its own fresh Playwright profile; no signed-in user browser is reused.
  browser=await chromium.launch({channel:'chrome',headless:false,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const context=await browser.newContext({viewport:job.viewport,deviceScaleFactor:1,acceptDownloads:false,serviceWorkers:'block',permissions:[]});
  await context.route('**/*',route=>localRequestAllowed(route.request().url()) ? route.continue() : route.abort('blockedbyclient'));
  for (const scene of job.scenes){
   const page=await context.newPage();const item={name:scene.name,file:scene.name+'.png',capture:scene.capture,ok:false,errors:[],networkFailures:[]};
   page.on('pageerror',e=>{if(item.errors.length<6)item.errors.push(String(e.message||e).slice(0,240))});
   page.on('requestfailed',req=>{if(/https:\/\/(?:cdn|assets)\.babylonjs\.com\//.test(req.url())&&item.networkFailures.length<5)item.networkFailures.push({asset:req.url().slice(0,130),reason:String(req.failure()||'blocked').slice(0,130)})});
   try{
    await page.goto(ORIGIN,{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('#stage').waitFor({timeout:14000});
    if(!(await page.title()).includes('KlinikLab')||await page.locator('#scene').count()!==1)throw Error('Unexpected site at port 8787; abort capture');
    await page.waitForTimeout(1100);
    for (const step of scene.steps){
     if(step.action==='wait'){await page.waitForTimeout(step.ms)}
     else if(step.action==='click'){await page.locator(CONTROLS[step.control]).click({timeout:7500});if(step.control==='renderer'){await page.waitForFunction(()=>window.KlinikBabylon?.mode==='babylon'||!!window.KlinikBabylon?.error,null,{timeout:18000});const report=await page.evaluate(()=>({...window.KlinikBabylon}));if(report.mode!=='babylon')throw Error('Babylon preview unavailable: '+(report.error||'unknown'));}if(step.control==='atlasOpen'||step.control==='atlasNext'||step.control==='atlasPrev'){await page.waitForFunction(()=>window.KlinikDundeeAtlas?.ready||window.KlinikDundeeAtlas?.mode==='error',null,{timeout:25000});const atlas=await page.evaluate(()=>({...window.KlinikDundeeAtlas}));if(!atlas.ready)throw Error('Licensed atlas unavailable: '+(atlas.error||'unknown'));}await page.waitForTimeout(650)}
     else if(step.action==='validateFDI'){
      // Fixed 32-click regression against the original odontogram controls.
      // The Babylon canvas must remain pointer-transparent throughout.
      item.fdiValidation=await page.evaluate(()=>{
       const ids=[...document.querySelectorAll('#chart [data-tooth]')].map(e=>e.dataset.tooth);
       const failures=[];
       for(const id of ids){
        const button=document.querySelector('#chart [data-tooth="'+id+'"]');
        button?.click();
        if(window.kliniklab?.selectedTooth!==id||document.querySelector('#selected-label')?.textContent!=='Selected tooth: '+id)
         failures.push(id);
       }
       return {checked:ids.length,failures,mode:window.KlinikBabylon?.mode};
      });
      if(item.fdiValidation.checked!==32||item.fdiValidation.failures.length||item.fdiValidation.mode!=='babylon')
       throw Error('FDI selection regression: '+JSON.stringify(item.fdiValidation));
     }
     else if(step.action==='localDemoGLB'){
      // Never accept arbitrary path arguments from the GitHub instruction JSON.
      await page.locator('#dundee-atlas-import').setInputFiles(path.join(REPO,'assets','dundee','maxillary_first_molar.glb'));
      await page.waitForFunction(()=>window.KlinikDundeeAtlas?.ready||window.KlinikDundeeAtlas?.mode==='error',null,{timeout:25000});
      const imported=await page.evaluate(()=>({...window.KlinikDundeeAtlas}));
      if(!imported.ready||imported.asset!=='local-glb')throw Error('Local GLB import failed: '+(imported.error||imported.asset));
     }
     else if(step.action==='orbit'){
      const canvas=page.locator('#scene');if(await canvas.count()!==1)throw Error('The clinic canvas was not rendered');
      const b=await canvas.first().boundingBox();if(!b)throw Error('Canvas unavailable');
      const x=b.x+b.width/2,y=b.y+b.height/2;
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+step.dx,y+step.dy,{steps:12});await page.mouse.up();await page.waitForTimeout(450);
     }
    }
    await page.waitForTimeout(900);
    const selector=CAPTURES[scene.capture];
    if(selector)await page.locator(selector).screenshot({path:path.join(dir,item.file),animations:'disabled',timeout:15000});
    else await page.screenshot({path:path.join(dir,item.file),fullPage:true,animations:'disabled',timeout:15000});
    item.bytes=(await stat(path.join(dir,item.file))).size;
    if(item.bytes<2500)throw Error('Screenshot too small to be useful');
    item.checks=await page.evaluate(()=>{
      const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {width:Math.round(r.width),height:Math.round(r.height),visible:r.width>0&&r.height>0&&getComputedStyle(e).display!=='none'}};
      const can=document.querySelector('#scene');
      let webgl=null;
      try{webgl=Boolean(can&&(can.getContext('webgl2')||can.getContext('webgl')))}catch{webgl=false}
      return {stage:box('#stage'),scene:box('#scene'),volume:box('#volume-root'),webgl,volumeGPU:!!window.kliniklab?.volLab?.gpu&&!window.kliniklab.volLab.gpu.failed,volumeTriangles:window.kliniklab?.volLab?.mesh?.count||0,viewMode:window.kliniklab?.viewMode||null,archMode:window.kliniklab?.scene?.archMode||null,babylon:window.KlinikBabylon?{mode:window.KlinikBabylon.mode,ready:window.KlinikBabylon.ready,meshes:window.KlinikBabylon.meshes,frames:window.KlinikBabylon.frames,environment:window.KlinikBabylon.environment,error:window.KlinikBabylon.error,anatomyVersion:window.KlinikBabylon.anatomyVersion,gingivalVertices:window.KlinikBabylon.gingivalVertices,gingivalTriangles:window.KlinikBabylon.gingivalTriangles,archDiagnostics:window.KlinikBabylon.archDiagnostics,appearance:window.KlinikBabylon.appearance,appearanceVersion:window.KlinikBabylon.appearanceVersion,vertexColoredTemplates:window.KlinikBabylon.vertexColoredTemplates,materialsUpdated:window.KlinikBabylon.materialsUpdated}:null,realTeeth:window.KlinikRealTeeth?{mode:window.KlinikRealTeeth.mode,ready:window.KlinikRealTeeth.ready,loaded:window.KlinikRealTeeth.loaded,instances:window.KlinikRealTeeth.instances,visibleInstances:window.KlinikRealTeeth.visibleInstances,triangles:window.KlinikRealTeeth.triangles,failures:window.KlinikRealTeeth.failures,error:window.KlinikRealTeeth.error,archDiagnostics:window.KlinikRealTeeth.archDiagnostics,vertexColoredInstances:window.KlinikRealTeeth.vertexColoredInstances,appearanceVersion:window.KlinikRealTeeth.appearanceVersion}:null,atlas:window.KlinikDundeeAtlas?{mode:window.KlinikDundeeAtlas.mode,ready:window.KlinikDundeeAtlas.ready,asset:window.KlinikDundeeAtlas.asset,meshes:window.KlinikDundeeAtlas.meshes,triangles:window.KlinikDundeeAtlas.triangles,error:window.KlinikDundeeAtlas.error}:null};
    });
    // A missing script may return HTTP 404 without producing a pageerror.
    // Require the local appearance module to be active for every Phase 3 view.
    if(job.jobId.startsWith('phase3-')){
      const b=item.checks?.babylon||{},r=item.checks?.realTeeth||{};
      if(b.appearanceVersion!==1||b.vertexColoredTemplates<18
        ||r.appearanceVersion!==1||r.vertexColoredInstances!==32)
        throw Error('Phase 3 assets did not initialize (server static allowlist?): '+JSON.stringify({
          appearanceVersion:b.appearanceVersion,templates:b.vertexColoredTemplates,
          realVersion:r.appearanceVersion,realVertices:r.vertexColoredInstances}));
    }
    if(scene.steps.some(step=>step.action==='click'&&step.control==='appearance')){
      const b=item.checks?.babylon||{},r=item.checks?.realTeeth||{};
      if(b.appearance!=='studio'||b.appearanceVersion!==1||b.vertexColoredTemplates<18
        ||r.appearanceVersion!==1||r.vertexColoredInstances!==32)
        throw Error('Phase 3 appearance QA failed: '+JSON.stringify({b,r}).slice(0,500));
    }
    if(scene.steps.some(step=>step.action==='click'&&step.control==='renderer')){
      const checks=item.checks||{},real=checks.realTeeth||{},b=checks.babylon||{};
      const expected=checks.archMode==='both'?32:16;
      if(b.mode!=='babylon'||b.anatomyVersion!==5||b.gingivalVertices!==11572||b.gingivalTriangles!==23136)
       throw Error('Phase 2 Babylon/gingiva diagnostic mismatch: '+JSON.stringify(b).slice(0,400));
      if(!real.ready||real.loaded!==16||real.instances!==32||real.visibleInstances!==expected||real.failures?.length)
       throw Error('Phase 2 crown loading/visibility mismatch: '+JSON.stringify(real).slice(0,400));
      if(b.archDiagnostics?.teeth!==32||b.archDiagnostics?.archCounts?.join(',')!=='16,16')
       throw Error('FDI placement inventory incomplete.');
    }
    item.ok=true;
   }catch(e){item.errors.push(String(e.message||e).slice(0,500));item.atlasDebug=await page.evaluate(()=>window.KlinikDundeeAtlas?{mode:window.KlinikDundeeAtlas.mode,error:window.KlinikDundeeAtlas.error,decoderDiagnostic:window.KlinikDundeeAtlas.decoderDiagnostic}:null).catch(()=>null);trace(`Scene ${scene.name}: ${item.errors.at(-1)}`)}
   manifest.scenes.push(item);await page.close();
  }
  await context.close();
 }finally{if(browser)await browser.close()}
 manifest.successCount=manifest.scenes.filter(s=>s.ok).length;
 manifest.failureCount=manifest.scenes.length-manifest.successCount;
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return {dir,manifest};
}
async function resultCheckout(){
 await mkdir(STATE_ROOT,{recursive:true});
 if(!existsSync(path.join(RESULTS_REPO,'.git'))){
  git(['clone',REMOTE,RESULTS_REPO],{cwd:STATE_ROOT});
 }
 const remote=git(['remote','get-url','origin']);
 if(!/^(?:https:\/\/github\.com\/|git@github\.com:)ajeshkg17\/KlinikLab(?:\.git)?$/i.test(remote))throw Error('Unexpected results repository remote.');
 git(['config','user.name','KlinikLab Visual Worker']);
 git(['config','user.email','92429933+ajeshkg17@users.noreply.github.com']);
 const branch=git(['ls-remote','--heads','origin',RESULT_BRANCH]);
 if(branch){
  git(['fetch','origin',RESULT_BRANCH]);
  git(['checkout','-B',RESULT_BRANCH,`origin/${RESULT_BRANCH}`]);
 }else{
  git(['checkout','--orphan',RESULT_BRANCH]);
  // Safe: this deletes tracked files only in the worker's separate fresh clone.
  git(['rm','-r','-f','--ignore-unmatch','.']);
  await writeFile(path.join(RESULTS_REPO,'README.md'),
   '# KlinikLab visual QA screenshots\n\nThis branch holds synthetic-training screenshots created by the owner’s local PC worker. Public images; no patient records or secrets.\n');
  git(['add','README.md']);git(['commit','-m','Initialize separate visual feedback branch']);
  git(['push','-u','origin',RESULT_BRANCH]);
 }
}
async function publish(job,captured){
 await resultCheckout();
 const dest=path.join(RESULTS_REPO,safeRunFolder(job.jobId));
 await rm(dest,{recursive:true,force:true}); await mkdir(dest,{recursive:true});
 for(const item of captured.manifest.scenes)if(item.ok){
  const src=path.join(captured.dir,item.file);
  const dst=path.join(dest,item.file);
  await writeFile(dst,await readFile(src));
 }
 await writeFile(path.join(dest,'manifest.json'),JSON.stringify(captured.manifest,null,2)+'\n');
 const gallery=['# KlinikLab visual QA — '+job.jobId,'','Desktop captures generated on the owner’s PC. This does not test Quest 2.', '', `Captured ${captured.manifest.successCount}/${job.scenes.length} views.`, ''];
 for(const item of captured.manifest.scenes){
   gallery.push(`## ${item.name}`, '');
   if(item.ok)gallery.push(`![${item.name}](${item.file})`, '');
   else gallery.push('Capture failed: '+item.errors.join('; '), '');
 }
 await writeFile(path.join(dest,'README.md'),gallery.join('\n'));
 git(['add','--',safeRunFolder(job.jobId)]);
 const status=git(['status','--porcelain']);
 if(status)git(['commit','-m',`Visual QA: ${job.jobId} (${captured.manifest.successCount}/${job.scenes.length})`]);
 git(['push','origin',RESULT_BRANCH]);
 return `https://github.com/ajeshkg17/KlinikLab/tree/${RESULT_BRANCH}/${safeRunFolder(job.jobId)}`;
}
let busy=false;
async function check(){
 if(busy)return;busy=true;
 try{
  const job=await readJob();
  if(DRY){trace(`Validated: ${job.jobId} (${job.scenes.length} scenes) — no browser or upload`);return}
  if((await previous()).jobId===job.jobId)return;
  verifyCheckout();
  trace(`New job: ${job.jobId}; waiting for localhost:8787`);
  await serverReady();
  const captured=await capture(job);
  const link=await publish(job,captured);
  await saveState({jobId:job.jobId,completedAt:new Date().toISOString(),resultUrl:link});
  trace(`Published ${captured.manifest.successCount}/${job.scenes.length} captures: ${link}`);
 }catch(e){trace(`Worker error: ${String(e.message||e).slice(0,600)}`)}finally{busy=false}
}
if(DRY || ONCE){await check()}else{trace(`Watching ${JOB_PATH} every ${EVERY_MS/1000}s; output branch ${RESULT_BRANCH}; Chrome will open for captures`);await check();setInterval(check,EVERY_MS)}