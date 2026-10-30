import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const origin=process.env.KLINIKLAB_URL||'http://127.0.0.1:8787/';
const u=new URL(origin);
if(!['127.0.0.1','localhost'].includes(u.hostname))throw Error('Use an explicit local test server');
const out=path.resolve(here,'../../output/playwright/webxr-smoke');
await mkdir(out,{recursive:true});
const options=await import('./harness-options.mjs');
const config=options.parseHarnessOptions(process.env);
const result={configuration:config,startedAt:new Date().toISOString(),origin,mode:'Playwright + genuine Meta IWER runtime; isolated profile, not the installed extension',profile:'metaQuest2',checks:[],errors:[],failedRequests:[]};
const runtime=await readFile(path.join(here,'node_modules/iwer/build/iwer.min.js'),'utf8');
const browser=await chromium.launch({channel:'chrome',headless:false,args:options.chromeArgs(config)});
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
 result.stationary=await page.evaluate(async ({deadlineMs})=>{
   const session=window.__xrTestDevice.activeSession,ref=await session.requestReferenceSpace('local-floor');
   window.__xrTestEvents=[];
   for(const type of ['selectstart','selectend','squeezestart','squeezeend'])session.addEventListener(type,e=>window.__xrTestEvents.push({type,hand:e.inputSource.handedness}));
   const progress={callbacks:0,validPoses:0,nullPoses:0,appDrawsAtStart:window.kliniklab?.scene?.xrVisualDiagnostics?.frames||0,
     latestFrameTimeMs:null};
   window.__xrCollectionProgress=progress;
   return await new Promise((resolve,reject)=>{
     const points=[],times=[];let last=null,done=false;
     const diagnostic=()=>({
       ...progress,appDraws:window.kliniklab?.scene?.xrVisualDiagnostics?.frames||0,
       documentVisibility:document.visibilityState,documentHasFocus:document.hasFocus(),
       sessionVisibility:session.visibilityState,sessionEnded:session.ended||false,
       renderer:{webgl:!!window.kliniklab?.scene?.gl,
         contextLost:window.kliniklab?.scene?.gl?.isContextLost?.()??null,
         xrFramebuffer:!!session.renderState?.baseLayer?.framebuffer,
         canvasWidth:window.kliniklab?.scene?.canvas?.width||null,
         canvasHeight:window.kliniklab?.scene?.canvas?.height||null}
     });
     const timer=setTimeout(()=>{
       if(done)return;done=true;
       const error=new Error('XR collection deadline reached ('+deadlineMs+'ms): '+JSON.stringify(diagnostic()));
       error.name='XRCollectionTimeout';reject(error);
     },deadlineMs);
     function frame(t,f){
       if(done)return;
       progress.callbacks++;progress.latestFrameTimeMs=t;
       let pose=null;try{pose=f.getViewerPose(ref)}catch(e){progress.lastPoseError=String(e)}
       if(pose){
         progress.validPoses++;
         const p=pose.transform.position;points.push([p.x,p.y,p.z]);
         if(last!==null)times.push(t-last);last=t;
       }else progress.nullPoses++;
       if(points.length>=120){
         done=true;clearTimeout(timer);
         const first=points[0];
         resolve({samples:points.length,callbacks:progress.callbacks,validPoses:progress.validPoses,
           nullPoses:progress.nullPoses,collectionDeadlineMs:deadlineMs,
           maxPoseDeltaMeters:Math.max(...points.map(p=>Math.hypot(...p.map((v,i)=>v-first[i])))),
           meanFrameIntervalMs:times.reduce((a,b)=>a+b,0)/times.length,
           hands:[...session.inputSources].map(s=>s.handedness),
           profiles:[...session.inputSources].map(s=>s.profiles),
           diagnostics:diagnostic()});
       }else session.requestAnimationFrame(frame);
     }
     session.requestAnimationFrame(frame);
   });
 },{deadlineMs:config.collectionDeadlineMs});
 result.performance={meanFrameIntervalMs:result.stationary.meanFrameIntervalMs,
   performanceThresholdMs:config.performanceThresholdMs,
   withinAdvisoryThreshold:result.stationary.meanFrameIntervalMs<=config.performanceThresholdMs,
   status:'advisory-only; not hardware validation'};

 result.rendered=await page.evaluate(()=>{
   const d=window.kliniklab?.scene?.xrVisualDiagnostics;
   if(!d)return null;
   const compact=stat=>stat?{samples:stat.samples,maxStep:stat.maxStep,maxFromFirst:stat.maxFromFirst,
     first:stat.first,last:stat.last}:null;
   return {frames:d.frames,referenceSpace:d.referenceSpace,
     eyes:Object.fromEntries(Object.entries(d.eyes).map(([i,stat])=>[i,compact(stat)])),
     world:compact(d.world),desktopLoopCount:window.kliniklab.scene.desktopLoopCount};
 });
 assert(result.rendered?.frames>=120,'Fewer than 120 app-rendered XR frames; headset input is not proof of draw delivery');
 assert(Object.values(result.rendered.eyes).length>=2,'Stereo eye matrices were not submitted');
 for(const eye of Object.values(result.rendered.eyes))
   assert(eye.samples>=120,'Missing actual drawn eye frames');
 assert(result.rendered.world?.samples>=120,'Fixed world model not sampled each rendered frame');
 // With a stationary emulator, the actual submitted stereo views and unchanged world
 // geometry must also remain stationary. No filtering or forced camera freezing.
 if(result.stationary.maxPoseDeltaMeters<1e-7){
   const maxEyeDrift=Math.max(...Object.values(result.rendered.eyes).map(eye=>eye.maxFromFirst||0));
   const maxWorldDrift=result.rendered.world.maxFromFirst||0;
   result.rendered.stationaryStability={maxEyeMatrixElementDelta:maxEyeDrift,maxWorldMatrixElementDelta:maxWorldDrift};
   assert(maxEyeDrift<=1e-5,'Rendered eye matrices drift despite stationary source pose: '+maxEyeDrift);
   assert(maxWorldDrift<=1e-5,'Fixed world geometry drifts during XR frames: '+maxWorldDrift);
 }
 result.checks.push('Rendered stereo matrices and stationary world mesh sampled for at least 120 app frames');
 assert.deepEqual([...result.stationary.hands].sort(),['left','right']);
 result.checks.push('Both left/right input sources present and 120 XR frames received');
 result.captureManifest=[];
 const captureHashes=new Map();
 const captureXR=async(filename,label)=>{
   // Capture only after a fresh rendered XR eye, not a potentially stale desktop viewport.
   const screenshot=await page.evaluate(async()=>{
     const scene=window.kliniklab?.scene;
     if(!scene?.xrSession||!scene.draw)throw Error('No live XR scene for capture');
     if(!scene.__xrEyeCaptureInstalled){
       const original=scene.draw;
       scene.draw=function(view,proj){
         original.call(this,view,proj);
         if(!this.__xrEyeCapturePending)return;
         try{
           const gl=this.gl,vp=gl.getParameter(gl.VIEWPORT),[x,y,w,h]=vp;
           if(w<20||h<20)throw Error('Invalid XR eye viewport');
           const pixels=new Uint8Array(w*h*4);
           gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
           if(gl.getError()!==gl.NO_ERROR)throw Error('XR framebuffer readPixels unavailable');
           const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
           const ctx=canvas.getContext('2d'),image=ctx.createImageData(w,h);
           for(let row=0;row<h;row++)image.data.set(pixels.subarray(row*w*4,(row+1)*w*4),(h-1-row)*w*4);
           ctx.putImageData(image,0,0);
           // Count warm crown/gingival pixels from the ACTUAL XR framebuffer,
           // not projected geometric bounds. Dark empty/room pixels cannot pass.
           let anatomyPixels=0;
           for(let k=0;k<pixels.length;k+=4){
             const r=pixels[k],g=pixels[k+1],b=pixels[k+2];
             if(r>75&&r>g*1.07&&r>b*1.15)anatomyPixels++;
           }
           // Project all five tool centers into the *actual submitted* eye matrices.
           const project=point=>{
             const mul=(m,v)=>[0,1,2,3].map(r=>m[r]*v[0]+m[r+4]*v[1]+m[r+8]*v[2]+m[r+12]*v[3]);
             const clip=mul(proj,mul(view,[...point,1]));
             return {x:clip[0]/clip[3],y:clip[1]/clip[3],z:clip[2]/clip[3],
               inFrustum:clip[3]>0&&Math.abs(clip[0])<=clip[3]&&Math.abs(clip[1])<=clip[3]&&Math.abs(clip[2])<=clip[3]};
           };
           const tools=(this.xrTableTools||[]).map(t=>{
             const m=t.meshes[0],p=m.model?[m.model[12],m.model[13],m.model[14]]:m.p;
             return {name:t.name,owner:t.owner,hover:t.hover,projection:project(p)};
           });
           // Project actual crown mesh bounds in each submitted stereo eye.
           const crowns=this.archMeshes.flat().filter(m=>m.tag==='crown'&&!m.hidden);
           const vertices=crowns.flatMap(m=>{
             const points=[];
             for(const dx of [-1,1])for(const dy of [0,1])for(const dz of [-1,1])
               points.push(project([m.p[0]+dx*m.s[0],m.p[1]+dy*(m.kind.includes('_0_')?-1:1)*.17*m.s[1],m.p[2]+dz*m.s[2]]));
             return points;
           }).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.inFrustum);
           const anatomyBounds=vertices.length?{
             width:Math.max(...vertices.map(p=>p.x))-Math.min(...vertices.map(p=>p.x)),
             height:Math.max(...vertices.map(p=>p.y))-Math.min(...vertices.map(p=>p.y)),
             count:vertices.length,magnification:this.anatomyDisplayMagnification
           }:null;
           if(!this.__xrEyeParts)this.__xrEyeParts=[];
           this.__xrEyeParts.push({canvas,tools,anatomyBounds,anatomyPixels});
           if(this.__xrEyeParts.length>=2){
             const sides=this.__xrEyeParts.slice(0,2);
             const combined=document.createElement('canvas');
             combined.width=sides[0].canvas.width+sides[1].canvas.width;
             combined.height=Math.max(sides[0].canvas.height,sides[1].canvas.height);
             const out=combined.getContext('2d');
             out.drawImage(sides[0].canvas,0,0);
             out.drawImage(sides[1].canvas,sides[0].canvas.width,0);
             this.__xrEyeCapturePending=false;this.__xrEyeParts=[];
             this.__xrEyeCapture={dataURL:combined.toDataURL('image/png'),frame:this.xrVisualDiagnostics?.frames||0,
               width:combined.width,height:combined.height,eyes:2,eyeTools:sides.map(v=>v.tools),eyeAnatomy:sides.map(v=>v.anatomyBounds),eyeAnatomyPixels:sides.map(v=>v.anatomyPixels),
               source:'two fresh WebXR eye framebuffers read through WebGL'};
           }
         }catch(e){this.__xrEyeCapturePending=false;this.__xrEyeParts=[];this.__xrEyeCapture={
           error:String(e),frame:this.xrVisualDiagnostics?.frames||0,source:'XR framebuffer readback failed'}}
       };
       scene.__xrEyeCaptureInstalled=true;
     }
     const before=scene.xrVisualDiagnostics?.frames||0;
     scene.__xrEyeCapture=null;scene.__xrEyeParts=[];scene.__xrEyeCapturePending=true;
     return await new Promise((resolve,reject)=>{
       const started=Date.now(),timeout=12000;
       function poll(){
         if(scene.__xrEyeCapture&&scene.__xrEyeCapture.frame>before)return resolve(scene.__xrEyeCapture);
         if(Date.now()-started>timeout)return reject(Error('No new XR eye frame within '+timeout+'ms'));
         setTimeout(poll,50);
       }poll();
     });
   });
   if(!screenshot.dataURL)throw Error('Fresh XR-eye screenshot failed: '+screenshot.error);
   const png=Buffer.from(screenshot.dataURL.split(',')[1],'base64');
   const sha256=createHash('sha256').update(png).digest('hex');
   const duplicateOf=captureHashes.get(sha256)||null;
   await writeFile(path.join(out,filename),png);
   if(!duplicateOf)captureHashes.set(sha256,filename);
   result.captureManifest.push({file:filename,label,kind:'Meta IWER Quest 2 emulator, WebGL XR eye framebuffer',captureFrame:screenshot.frame,width:screenshot.width,height:screenshot.height,eyes:screenshot.eyes,eyeTools:screenshot.eyeTools,eyeAnatomy:screenshot.eyeAnatomy,eyeAnatomyPixels:screenshot.eyeAnatomyPixels,sha256,duplicateOf,testedRevision:process.env.GITHUB_SHA||process.env.KLINIKLAB_BUILD_SHA||'revision not provided',origin});
 };
 await page.evaluate(()=>{window.__xrTestDevice.controllers.left.connected=false;window.__xrTestDevice.controllers.right.connected=false});
 await page.waitForFunction(()=>window.__xrTestDevice.activeSession.inputSources.length===0);
 await captureXR('01-room-table-unobstructed.png','Room/table with both tracked controllers disconnected');
 const overviewAnatomy=result.captureManifest.at(-1).eyeAnatomy;
 assert(overviewAnatomy?.length===2&&overviewAnatomy.every(x=>x&&x.count>=8),'Overview crowns must be projected in both XR eyes');
 await page.evaluate(()=>{
   const d=window.__xrTestDevice;
   d.controllers.left.position.set(-.24,1.26,-.85);
   d.controllers.right.position.set(.24,1.26,-.85);
   d.controllers.left.connected=true;d.controllers.right.connected=true;
 });
 await page.waitForFunction(()=>window.__xrTestDevice.activeSession.inputSources.length===2&&window.kliniklab.scene.xrControllers.every(c=>c.active));
 await captureXR('02-both-controller-models.png','Both left/right controller meshes tracked in scene');
 const toolEyeProjections=result.captureManifest[0].eyeTools;
 const hiddenCenters=toolEyeProjections.flatMap((tools,index)=>tools.filter(t=>!t.projection.inFrustum).map(t=>'eye '+index+': '+t.name));
 if(hiddenCenters.length)throw Error('Instrument centers outside both-eye frusta: '+hiddenCenters.join(', '));
 result.checks.push('All five instrument centers project into both rendered eye frusta; occlusion requires visual review');
 // IWER dispatches inputs on XR animation frames. On a slow machine one
 // frame can take >400 ms: never release a button until the matching XR event
 // has actually been observed. Require a *new* event for every transition.
 const inputTimeoutMs=Math.max(15000,config.collectionDeadlineMs);
 const buttonEvent=button=>button==='trigger'?'select':'squeeze';
 const driveInput=async(hand,button,pressure)=>{
   const type=buttonEvent(button)+(pressure?'start':'end');
   const baseline=await page.evaluate(({hand,type})=>
     (window.__xrTestEvents||[]).filter(e=>e.hand===hand&&e.type===type).length,{hand,type});
   await page.evaluate(({hand,button,pressure})=>
     window.__xrTestDevice.controllers[hand].updateButtonValue(button,pressure),{hand,button,pressure});
   await page.waitForFunction(({hand,type,baseline})=>
     (window.__xrTestEvents||[]).filter(e=>e.hand===hand&&e.type===type).length>baseline,
     {hand,type,baseline},{timeout:inputTimeoutMs,polling:50});
   return {hand,button,pressure,type,baseline};
 };
 for(const hand of ['left','right'])for(const button of ['trigger','squeeze']){
   await driveInput(hand,button,1);
   await driveInput(hand,button,0);
 }
 result.inputEvents=await page.evaluate(()=>window.__xrTestEvents);
 for(const hand of ['left','right'])for(const type of ['selectstart','selectend','squeezestart','squeezeend'])assert(result.inputEvents.some(e=>e.hand===hand&&e.type===type),`${hand} ${type} missing`);
 result.checks.push('Frame-synchronized IWER trigger/grip start/end events reached the XR session for each hand');
 await page.evaluate(()=>{window.__xrTestDevice.controllers.right.connected=false;});
 await page.waitForFunction(()=>window.__xrTestDevice.activeSession.inputSources.length===1);
 await page.evaluate(()=>{window.__xrTestDevice.controllers.right.connected=true;});
 await page.waitForFunction(()=>window.__xrTestDevice.activeSession.inputSources.length===2);
 result.checks.push('Right controller disconnect/reconnect changed XR input sources');
 // Phase 3: drive genuine IWER controller transforms and squeeze input (not a mock XRSession).
 const moveController=async(hand,name)=>{
   await page.evaluate(({hand,name})=>{
     const tool=window.kliniklab.scene.xrTableTools.find(t=>t.name===name);
     assertTool(tool,name);
     window.__xrTestDevice.controllers[hand].position.set(...tool.home[0].p);
     function assertTool(value,label){if(!value?.home)throw Error('Missing VR tool: '+label)}
   },{hand,name});
 };
 const grip=async(hand,pressure)=>driveInput(hand,'squeeze',pressure);
 const toolState=async name=>page.evaluate(name=>{
   const t=window.kliniklab.scene.xrTableTools.find(t=>t.name===name);
   return {owner:t?.owner||null,hover:t?.hover||null,
     model:t?.meshes?.[0]?.model?.slice()||null,home:t?.home?.[0]?.p?.slice()||null};
 },name);
 const awaitHover=async(name,hand)=>page.waitForFunction(({name,hand})=>
   window.kliniklab.scene.xrTableTools.find(t=>t.name===name)?.hover===hand,
   {name,hand},{timeout:Math.max(15000,config.collectionDeadlineMs)});
 const awaitOwner=async(name,hand)=>page.waitForFunction(({name,hand})=>
   (window.kliniklab.scene.xrTableTools.find(t=>t.name===name)?.owner||null)===hand,
   {name,hand},{timeout:Math.max(15000,config.collectionDeadlineMs)});
 await moveController('left','mirror');
 await awaitHover('mirror','left');
 await captureXR('03-left-tool-hover.png','Left grip near mirror with hover feedback');
 result.checks.push('Left controller obtains visible tool hover feedback');
 await grip('left',1);
 await awaitOwner('mirror','left');
 await captureXR('04-left-hand-mirror-pickup.png','Mirror held by left controller');
 const mirrorVisual=await page.evaluate(({toolName,hand})=>{
   const scene=window.kliniklab.scene,tool=scene.xrTableTools.find(t=>t.name===toolName);
   const controller=scene.xrControllers.find(c=>c.handedness===hand);
   return {owner:tool?.owner,ringHidden:controller?.parts[2]?.hidden,
     toolVisible:tool?.meshes.every(m=>!m.hidden),
     inBothEyes:scene.xrVisualDiagnostics?.eyes&&scene.xrVisualDiagnostics.eyes[0]?.samples>120&&scene.xrVisualDiagnostics.eyes[1]?.samples>120};
 },{toolName:'mirror',hand:'left'});
 assert.equal(mirrorVisual.owner,'left');
 assert.equal(mirrorVisual.ringHidden,true,'Oversized controller ring obscures held tool');
 assert.equal(mirrorVisual.toolVisible,true,'Held tool has hidden geometry');
 const mirrorCapture=result.captureManifest.at(-1);
 assert(mirrorCapture.eyeTools?.length===2,'Missing stereo-eye tool evidence');
 assert(mirrorCapture.eyeTools.every(eye=>eye.find(t=>t.name==='mirror')?.projection.inFrustum),
   'Held mirror center outside one XR eye');
 const beforeHeld=await toolState('mirror');
 assert(beforeHeld.model?.length===16,'Held mirror lacks model matrix');
 result.checks.push('Left squeeze picks up mirror with a grip-relative model matrix');
 await driveInput('left','trigger',1);
 assert.equal((await toolState('mirror')).owner,'left','Index trigger changed tool ownership');
 await driveInput('left','trigger',0);
 result.checks.push('Index trigger cannot release or reassign a grip-held tool');
 // Another controller cannot take the same held instrument.
 await moveController('right','mirror');
 await grip('right',1);
 assert.equal((await toolState('mirror')).owner,'left','Tool acquired by two hands');
 await grip('right',0);
 result.checks.push('Held mirror rejects second-hand ownership');
 await page.evaluate(()=>{const c=window.__xrTestDevice.controllers.left;c.position.x+=.20;});
 await page.waitForFunction(x=>Math.abs(window.kliniklab.scene.xrTableTools.find(t=>t.name==='mirror')?.meshes[0]?.model?.[12]-x)>0.10,
   beforeHeld.model[12],{timeout:Math.max(15000,config.collectionDeadlineMs)});
 result.checks.push('Held tool follows translated grip with stable 6DoF transform');
 const translated=await toolState('mirror');
 await page.evaluate(()=>{const q=window.__xrTestDevice.controllers.left.quaternion;
   q.set(0,Math.sin(Math.PI/8),0,Math.cos(Math.PI/8));});
 await page.waitForFunction(previous=>{
   const current=window.kliniklab.scene.xrTableTools.find(t=>t.name==='mirror')?.meshes[0]?.model;
   return current?.length===16&&Math.max(...current.map((v,i)=>Math.abs(v-previous[i])))>.1;
 },translated.model,{timeout:Math.max(15000,config.collectionDeadlineMs)});
 assert.equal((await toolState('mirror')).owner,'left','Rotation invalidated grip ownership');
 result.checks.push('Held tool orientation follows real emulated controller rotation');
 await grip('left',0);
 await awaitOwner('mirror',null);
 // Phase 6 close-up is a real rendered XR eye frame in explicit teaching
 // magnification, not a resized illustration or a reused room screenshot.
 await page.evaluate(()=>window.kliniklab.scene.setTeachingMagnification(true));
 await page.waitForFunction(()=>window.kliniklab.scene.anatomyDisplayMagnification===8
   &&window.kliniklab.scene.archMeshes.flat().some(m=>m.tag==='crown'&&m.s[0]>.025));
 await captureXR('05-mirror-release-return.png','Anatomy close-up: near-field explicit 8x teaching examination');
 const detailAnatomy=result.captureManifest.at(-1).eyeAnatomy;
 const eyePixels=result.captureManifest.at(-1).eyeAnatomyPixels;
 assert(eyePixels?.length===2&&eyePixels.every(n=>n>=500),
   'Actual XR framebuffer lacks visible crown/gingival pixels in both eyes: '+JSON.stringify(eyePixels));
 result.checks.push('Both freshly rendered XR eye framebuffers contain >=500 warm dental-surface pixels');
 assert(detailAnatomy?.length===2&&detailAnatomy.every((x,i)=>x&&x.count>=8
   &&x.magnification===8&&x.width>.16&&x.height>.12
   &&x.width>overviewAnatomy[i].width*2),
   'Rendered near-field anatomy must occupy significant visible area in BOTH stereo eyes');
 result.checks.push('Both rendered eyes show >=2x projected arch width and useful close-up bounds');
 await page.evaluate(()=>window.kliniklab.scene.setTeachingMagnification(false));
 assert.equal((await toolState('mirror')).model,null,'Released tool retained floating transform');
 result.checks.push('Grip release returns mirror to tray');
 await moveController('right','composite');
 await awaitHover('composite','right');
 await grip('right',1);
 await awaitOwner('composite','right');
 await captureXR('06-right-hand-composite-pickup.png','Composite tool held by right controller');
 const compositeVisual=await page.evaluate(({toolName,hand})=>{
   const scene=window.kliniklab.scene,tool=scene.xrTableTools.find(t=>t.name===toolName);
   const controller=scene.xrControllers.find(c=>c.handedness===hand);
   return {owner:tool?.owner,ringHidden:controller?.parts[2]?.hidden,
     toolVisible:tool?.meshes.every(m=>!m.hidden),
     inBothEyes:scene.xrVisualDiagnostics?.eyes&&scene.xrVisualDiagnostics.eyes[0]?.samples>120&&scene.xrVisualDiagnostics.eyes[1]?.samples>120};
 },{toolName:'composite',hand:'right'});
 assert.equal(compositeVisual.owner,'right');
 assert.equal(compositeVisual.ringHidden,true,'Oversized controller ring obscures held tool');
 assert.equal(compositeVisual.toolVisible,true,'Held tool has hidden geometry');
 const compositeCapture=result.captureManifest.at(-1);
 assert(compositeCapture.eyeTools?.length===2,'Missing stereo-eye tool evidence');
 assert(compositeCapture.eyeTools.every(eye=>eye.find(t=>t.name==='composite')?.projection.inFrustum),
   'Held composite center outside one XR eye');
 result.checks.push('Right controller picks up a different tray instrument');
 await page.evaluate(()=>{window.__xrTestDevice.controllers.right.connected=false});
 await page.waitForFunction(()=>window.kliniklab.scene.xrTableTools.find(t=>t.name==='composite')?.owner===null,
   {timeout:Math.max(15000,config.collectionDeadlineMs)});
 assert.equal((await toolState('composite')).model,null,'Lost controller left a floating tool');
 await page.evaluate(()=>{window.__xrTestDevice.controllers.right.connected=true});
 result.checks.push('Controller disconnect safely returns held instrument');

 await page.evaluate(()=>window.__xrTestDevice.activeSession.end());
 await page.waitForFunction(()=>!window.kliniklab.scene.xrSession);
 await page.locator('#vr').click();
 await page.waitForFunction(()=>!!window.kliniklab.scene.xrSession&&!!window.__xrTestDevice.activeSession);
 result.checks.push('Application exited and re-entered VR');
 assert.equal(await page.evaluate(()=>window.kliniklab.scene.xrGuide.state.open),false,'Help should stay closed on re-entry');
 const duplicates=result.captureManifest.filter(x=>x.duplicateOf);
 if(duplicates.length)throw Error('XR screenshot states were pixel-identical: '+JSON.stringify(duplicates.map(x=>({file:x.file,sameAs:x.duplicateOf}))));
 result.checks.push('Six distinct newly rendered XR-eye screenshots (composition still requires visual review)');

 // Selection through the guide's actual ray/pick hit path in the active IWER session.
 const help=await page.evaluate(()=>{
   const scene=window.kliniklab.scene,guide=scene.xrGuide;
   if(guide.state.open)throw Error('Help is unexpectedly open');
   const select=(key,hand)=>{
     const target=scene.pickables.find(hit=>hit.key===key);
     if(!target||target.mesh.hidden)throw Error('Invisible help target '+key);
     const p=target.p;
     return guide.onSelectStart({inputSource:{handedness:hand,targetRaySpace:{}}},{
       getPose(){return {transform:{position:{x:p[0],y:p[1],z:p[2]+.5},orientation:{x:0,y:0,z:0,w:1}}}}
     });
   };
   if(!select('guide:open','left')||!guide.state.open)throw Error('Left ray failed to open ?');
   return {opened:true};
 });
 result.help=help;
 await captureXR('07-help-opened-by-question-mark.png','? help opened with left-hand synthetic ray selection');
 result.checks.push('Help starts closed and ? opens via left-hand controller ray');
 const closing=await page.evaluate(()=>{
   const scene=window.kliniklab.scene,guide=scene.xrGuide,hit=scene.pickables.find(p=>p.key==='guide:close');
   if(!hit||hit.mesh.hidden)throw Error('Close not visible');
   const p=hit.p;
   const consumed=guide.onSelectStart({inputSource:{handedness:'right',targetRaySpace:{}}},{
     getPose(){return {transform:{position:{x:p[0],y:p[1],z:p[2]+.5},orientation:{x:0,y:0,z:0,w:1}}}}
   });
   if(!consumed||guide.state.open||guide.onSqueezeStart())throw Error('Help close or grip isolation failed');
   return {closed:true,gripDoesNotReopen:true};
 });
 result.help.closing=closing;
 await captureXR('08-help-closed-after-close.png','Help panel closed by right-hand synthetic ray selection');
 result.checks.push('Right-hand close ray works; gripping cannot reopen help');

 // Phase 4 catalog functional checks use synthetic tracked rays, with the
 // real IWER session and renderer running. This is not physical controller proof.
 const catalogOpen=await page.evaluate(()=>{
   const scene=window.kliniklab.scene,cat=scene.xrCatalog;
   if(!cat||cat.open||cat.panels.some(m=>!m.hidden))throw Error('Catalog must begin closed');
   const select=(key,hand='left')=>{
     const hit=scene.pickables.find(p=>p.key===key);
     if(!hit||hit.mesh.hidden)throw Error('Catalog target not visible: '+key);
     const p=hit.p,source={handedness:hand,targetRaySpace:{}};
     const frame={getPose(){return {transform:{position:{x:p[0],y:p[1],z:p[2]+.55},orientation:{x:0,y:0,z:0,w:1}}}}};
     return scene.onXRCatalogSelect({inputSource:source},frame);
   };
   if(!select('catalog:toggle')||!cat.open)throw Error('Catalog launcher failed');
   if(!select('catalog:tool:mirror')||cat.selected!=='mirror')throw Error('Mirror entry failed');
   if(!select('catalog:tool:composite','right')||cat.selected!=='composite')throw Error('Right controller entry failed');
   return {open:true,selected:cat.selected,visible:cat.panels.every(m=>!m.hidden)};
 });
 result.catalog={opened:catalogOpen};
 await captureXR('09-tool-catalog-open.png','Phase 4 in-VR named tool catalog opened by controller ray');
 result.checks.push('Phase 4 catalog launches, exposes purposes, and accepts left/right tool selections');
 const catalogReturn=await page.evaluate(()=>{
   const scene=window.kliniklab.scene,cat=scene.xrCatalog;
   const select=key=>{
     const h=scene.pickables.find(p=>p.key===key);
     if(!h||h.mesh.hidden)throw Error('Hidden catalog action '+key);
     const p=h.p;
     return scene.onXRCatalogSelect({inputSource:{handedness:'right',targetRaySpace:{}}},{
       getPose(){return {transform:{position:{x:p[0],y:p[1],z:p[2]+.55},orientation:{x:0,y:0,z:0,w:1}}}}
     });
   };
   const selected=scene.xrTableTools.find(t=>t.name==='composite');
   if(selected.owner)throw Error('Composite must be unheld before spawn');
   if(!select('catalog:spawn')||selected.owner)throw Error('Controlled tray spawn failed');
   if(!select('catalog:reset')||scene.xrTableTools.some(t=>t.owner))throw Error('Catalog reset failed');
   if(!select('catalog:close')||cat.open||cat.panels.some(m=>!m.hidden))throw Error('Catalog close failed');
   return {trayReturn:true,allReset:true,closed:true};
 });
 result.catalog.return=catalogReturn;
 await captureXR('10-tool-catalog-closed.png','Phase 4 workspace after controlled return, reset and close');
 result.checks.push('Phase 4 controlled tray spawn, reset, close do not clone instruments');
 await page.evaluate(()=>window.__xrTestDevice.activeSession.end());
 await page.waitForFunction(()=>!window.kliniklab.scene.xrSession);
 assert.equal(result.errors.length,0,'Uncaught application errors observed');
 result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack;
 if(page)result.timeoutDiagnostics=await page.evaluate(()=>({
   progress:window.__xrCollectionProgress||null,
   documentVisibility:document.visibilityState,documentHasFocus:document.hasFocus(),
   sessionVisibility:window.kliniklab?.scene?.xrSession?.visibilityState||null,
   appDraws:window.kliniklab?.scene?.xrVisualDiagnostics?.frames||0,
   renderer:{contextLost:window.kliniklab?.scene?.gl?.isContextLost?.()??null,
     webgl:!!window.kliniklab?.scene?.gl,
     framebuffer:!!window.kliniklab?.scene?.xrSession?.renderState?.baseLayer?.framebuffer}
 })).catch(()=>null);if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();result.finishedAt=new Date().toISOString();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}
