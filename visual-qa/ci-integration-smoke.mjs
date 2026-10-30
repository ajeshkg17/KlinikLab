/**
 * Isolated combined-build Chromium smoke: no screenshots, external patient data,
 * physical XR, clinical scoring claims, or shared-PC processes.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results=[];
function check(label,condition,detail=''){
  results.push({label,pass:Boolean(condition),detail:String(detail).slice(0,180)});
  assert.ok(condition,label+': '+detail);
}
async function freePort(){
  return new Promise((resolve,reject)=>{
    const listener=createServer();
    listener.once('error',reject);
    listener.listen(0,'127.0.0.1',()=>{
      const port=listener.address().port;
      listener.close(()=>resolve(port));
    });
  });
}
async function ready(origin,proc){
  for(let i=0;i<90;i++){
    if(proc.exitCode!==null)throw Error('Server exited: '+proc.exitCode);
    try{if((await fetch(origin+'/api/health')).ok)return;}catch{}
    await sleep(100);
  }
  throw Error('Server failed to become ready on isolated port');
}
async function runBrowser(origin){
  const browser=await chromium.launch({
    headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']
  });
  const pageErrors=[];
  const localFailures=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('response',r=>{
      if(r.url().startsWith(origin+'/')&&r.status()>=400&&/\.(?:js|css)(?:\?|$)/.test(r.url()))
        localFailures.push(r.url()+' returned '+r.status());
    });
    await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#chart [data-tooth]').first().waitFor({timeout:20000});
    const fdi=await page.locator('#chart [data-tooth]').evaluateAll(nodes=>nodes.map(el=>el.dataset.tooth));
    const expected=Array.from({length:32},(_,i)=>String(Math.floor(i/8)+1)+String(i%8+1));
    check('32 unique FDI buttons',fdi.length===32&&expected.every(id=>fdi.includes(id)));
    await page.locator('#chart [data-tooth="11"]').click();
    check('FDI 11 selection',await page.evaluate(()=>window.kliniklab?.selectedTooth==='11'));

    await page.locator('#fsp-kp-open').click();
    check('FSP studio opens',await page.locator('#fsp-kp-overlay [role="dialog"]').isVisible());
    let completed=0;
    for(const [caseId,fdiId] of [['endo','36'],['surgery','48'],['perio','46'],['restoration','16']]){
      await page.locator('#fsp-kp-overlay button[data-fsp="case"][data-id="'+caseId+'"]').click();
      const text=await page.locator('#fsp-kp-overlay .fsp-facts').textContent();
      check('FSP fictional '+caseId,text.includes('Zahn '+fdiId));
      for(const phase of ['anamnese','aufklaerung','brief','kollegen']){
        await page.locator('#fsp-kp-overlay button[data-fsp="phase"][data-id="'+phase+'"]').click();
        const actual=await page.evaluate(()=>({
          caseId:window.KlinikFSPTraining.status.caseId,
          phaseId:window.KlinikFSPTraining.status.phaseId
        }));
        check(caseId+'/'+phase+' navigation',actual.caseId===caseId&&actual.phaseId===phase);
        const model=await page.evaluate(([c,p])=>window.KlinikFSPTraining.taskFor(c,p).model,[caseId,phase]);
        await page.locator('#fsp-answer').fill(model);
        await page.locator('#fsp-kp-overlay button[data-fsp="submit"]').click();
        const rubric=await page.locator('#fsp-kp-overlay .fsp-feedback h4').textContent();
        check(caseId+'/'+phase+' model rubric',rubric.includes('10 / 10'),rubric);
        completed++;
      }
    }
    check('All 16 rendered exercises submitted',completed===16);
    await page.locator('#fsp-answer').fill('Antwort geändert');
    check('Edited answers invalidate displayed score',
      await page.locator('#fsp-kp-overlay .fsp-feedback:visible').count()===0);
    await page.locator('#fsp-kp-overlay button[data-fsp="close"]').click();
    check('FSP modal closed',await page.locator('#fsp-kp-overlay').isHidden());
    check('FSP focus returned',await page.evaluate(()=>document.activeElement?.id==='fsp-kp-open'));

    // Reproduce the original volume/video heading collision in the real DOM.
    await page.locator('[data-view="volume"]').click();
    await page.locator('#vl-trigger').click();
    const dialog=page.locator('#vl-overlay [role="dialog"]');
    check('Video dialog visible',await dialog.isVisible());
    check('Video dialog references its dedicated heading',
      await dialog.getAttribute('aria-labelledby')==='vl-video-title');
    check('Video title populated',
      (await page.locator('#vl-video-title').textContent()).trim().length>10);
    const ids=await page.locator('[id]').evaluateAll(nodes=>{
      const seen=new Set(),duplicates=[];
      for(const el of nodes){if(seen.has(el.id))duplicates.push(el.id);seen.add(el.id);}
      return duplicates;
    });
    check('Unique DOM IDs, including video and volume headings',ids.length===0,ids.join(','));
    check('Local JS and CSS loaded',localFailures.length===0,localFailures.join('; '));
    check('No uncaught browser page errors',pageErrors.length===0,pageErrors.join('; '));
    console.log(JSON.stringify({commit:process.env.GITHUB_SHA||'local',
      browser:browser.version(),origin,checks:results.length,exercises:completed,
      localFailures,pageErrors,physicalQuest2:false,immersiveWebEmulator:false,
      clinicalReview:false,screenshotsCreated:false},null,2));
  }finally{await browser.close();}
}
let proc;
try{
  const port=await freePort(),origin='http://127.0.0.1:'+port;
  proc=spawn(process.execPath,['server/server.mjs'],{
    cwd:root,env:{...process.env,PORT:String(port),GEMINI_API_KEY:'',AI_ACCESS_CODE:''},
    stdio:'inherit'
  });
  await ready(origin,proc);
  await runBrowser(origin);
}catch(error){
  console.error('Integration Chromium smoke FAILED:',error.stack||error);
  console.error('Completed checks:',JSON.stringify(results,null,2));
  process.exitCode=1;
}finally{
  if(proc){
    proc.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),sleep(2000)]);
    if(proc.exitCode===null)proc.kill('SIGKILL');
  }
}
