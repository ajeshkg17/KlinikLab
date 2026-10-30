import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url));
const origin=process.env.KLINIKLAB_URL||'http://127.0.0.1:8787/';
const u=new URL(origin);
if(!['127.0.0.1','localhost'].includes(u.hostname))throw Error('Use an explicit local test server');
const out=path.resolve(here,'../../output/playwright/webxr-smoke');
await mkdir(out,{recursive:true});
const result={startedAt:new Date().toISOString(),origin,mode:'Playwright + genuine Meta IWER runtime; isolated profile, not the installed extension',profile:'metaQuest2',checks:[],errors:[],failedRequests:[]};
const runtime=await readFile(path.join(here,'node_modules/iwer/build/iwer.min.js'),'utf8');
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--ignore-gpu-blocklist','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-renderer-backgrounding','--disable-background-timer-throttling']});
let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.addInitScript({content:runtime+`;(() => {
   window.__xrTestDevice=new IWER.XRDevice(IWER.metaQuest2);
   window.__xrTestDevice.installRuntime({forceInstall:true});
   window.__xrTestDevice.stereoEnabled=true;
 })();`});
 page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('requestfailed',r=>result.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 result.initial=await page.evaluate(async()=>({device:!!window.__xrTestDevice,app:!!window.kliniklab,scene:!!window.kliniklab?.scene,xr:!!navigator.xr,supported:await navigator.xr?.isSessionSupported('immersive-vr'),title:document.querySelector('#vr')?.title,secure:window.isSecureContext}));
 console.log('Initial state:',JSON.stringify(result.initial));
 await page.waitForFunction(()=>window.kliniklab?.scene&&document.querySelector('#vr')&&!document.querySelector('#vr').disabled);
 result.checks.push('VR button enabled with real IWER Quest 2 profile');
 await page.locator('#vr').click();
 await page.waitForFunction(()=>!!window.kliniklab.scene.xrSession&&!!window.__xrTestDevice.activeSession);
 result.checks.push('Application entered an immersive WebXR session');
 result.stationary=await page.evaluate(async()=>{
   const session=window.__xrTestDevice.activeSession,ref=await session.requestReferenceSpace('local-floor');
   window.__xrTestEvents=[];
   for(const type of ['selectstart','selectend','squeezestart','squeezeend'])session.addEventListener(type,e=>window.__xrTestEvents.push({type,hand:e.inputSource.handedness}));
   return await new Promise((resolve,reject)=>{
     const points=[],times=[];let last=null;const timer=setTimeout(()=>reject(Error('XR frames timed out')),15000);
     function frame(t,f){const pose=f.getViewerPose(ref);if(pose){const p=pose.transform.position;points.push([p.x,p.y,p.z]);if(last!==null)times.push(t-last);last=t;}
       if(points.length>=120){clearTimeout(timer);const first=points[0];resolve({samples:points.length,maxPoseDeltaMeters:Math.max(...points.map(p=>Math.hypot(...p.map((v,i)=>v-first[i])))),meanFrameIntervalMs:times.reduce((a,b)=>a+b,0)/times.length,hands:[...session.inputSources].map(s=>s.handedness),profiles:[...session.inputSources].map(s=>s.profiles)});}else session.requestAnimationFrame(frame);
     }session.requestAnimationFrame(frame);
   });
 });
 assert.deepEqual([...result.stationary.hands].sort(),['left','right']);
 result.checks.push('Both left/right input sources present and 120 XR frames received');
 await page.screenshot({path:path.join(out,'vr-baseline.png')});
 for(const hand of ['left','right'])for(const button of ['trigger','squeeze']){
   await page.evaluate(({hand,button})=>window.__xrTestDevice.controllers[hand].updateButtonValue(button,1),{hand,button});
   await page.waitForTimeout(120);
   await page.evaluate(({hand,button})=>window.__xrTestDevice.controllers[hand].updateButtonValue(button,0),{hand,button});
   await page.waitForTimeout(120);
 }
 result.inputEvents=await page.evaluate(()=>window.__xrTestEvents);
 for(const hand of ['left','right'])for(const type of ['selectstart','selectend','squeezestart','squeezeend'])assert(result.inputEvents.some(e=>e.hand===hand&&e.type===type),`${hand} ${type} missing`);
 result.checks.push('Real IWER trigger/grip events reached the XR session for each hand');
 await page.evaluate(()=>{window.__xrTestDevice.controllers.right.connected=false;});
 await page.waitForFunction(()=>window.__xrTestDevice.activeSession.inputSources.length===1);
 await page.evaluate(()=>{window.__xrTestDevice.controllers.right.connected=true;});
 await page.waitForFunction(()=>window.__xrTestDevice.activeSession.inputSources.length===2);
 result.checks.push('Right controller disconnect/reconnect changed XR input sources');
 await page.evaluate(()=>window.__xrTestDevice.activeSession.end());
 await page.waitForFunction(()=>!window.kliniklab.scene.xrSession);
 await page.locator('#vr').click();
 await page.waitForFunction(()=>!!window.kliniklab.scene.xrSession&&!!window.__xrTestDevice.activeSession);
 result.checks.push('Application exited and re-entered VR');
 await page.evaluate(()=>window.__xrTestDevice.activeSession.end());
 await page.waitForFunction(()=>!window.kliniklab.scene.xrSession);
 assert.equal(result.errors.length,0,'Uncaught application errors observed');
 result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack;if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();result.finishedAt=new Date().toISOString();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}
