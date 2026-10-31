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
 const captureXR=async(filename,label,auxiliary=false)=>{
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
           // Examination-only image is dark except for dental surfaces.
           // Measure the TRUE raster footprint in each eye (top-origin bounds),
           // including centroid and margins. Clipped fragments must fail.
           let fdiVisiblePixels=0;
           for(let px=0;px<pixels.length;px+=4)if(pixels[px]+pixels[px+1]+pixels[px+2]>210)fdiVisiblePixels++;
           let anatomyPixels=0,sumX=0,sumY=0;
           let minX=w,minY=h,maxX=-1,maxY=-1;
           for(let k=0;k<pixels.length;k+=4){
             const r=pixels[k],g=pixels[k+1],b=pixels[k+2];
             if(r>48&&r+g+b>145&&r>b*1.02){
               const n=k/4,x=n%w,y=h-1-Math.floor(n/w);
               anatomyPixels++;sumX+=x;sumY+=y;
               minX=Math.min(minX,x);maxX=Math.max(maxX,x);
               minY=Math.min(minY,y);maxY=Math.max(maxY,y);
             }
           }
           const rasterBounds=anatomyPixels?{
             count:anatomyPixels,
             left:minX/w,right:maxX/w,top:minY/h,bottom:maxY/h,
             width:(maxX-minX+1)/w,height:(maxY-minY+1)/h,
             centerX:sumX/anatomyPixels/w,centerY:sumY/anatomyPixels/h
           }:null;
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
           // When enlarged, inspect EVERY original CPU vertex AFTER its
           // actual model transform, then project with submitted XR matrices.
           // Do not discard clipped points when calculating outer bounds.
           let anatomyBounds=null;
           if(this.anatomyDisplayMagnification===12){
             let minPx=Infinity,minPy=Infinity,maxPx=-Infinity,maxPy=-Infinity;
             let count=0,inFrustum=0,behind=0;
             for(const m of this.archMeshes.flat().filter(m=>!m.hidden)){
               const data=this.geom[m.kind]?.cpu;if(!data)continue;
               const a=m.rot?.[1]||0,c=Math.cos(a),sn=Math.sin(a);
               const M=m.model;
               for(let j=0;j<data.length;j+=8){
                 const x=data[j],y=data[j+1],z=data[j+2];
                 const world=M?
                   [M[0]*x+M[4]*y+M[8]*z+M[12],M[1]*x+M[5]*y+M[9]*z+M[13],M[2]*x+M[6]*y+M[10]*z+M[14]]:
                   [m.p[0]+c*m.s[0]*x+sn*m.s[2]*z,
                    m.p[1]+m.s[1]*y,
                    m.p[2]-sn*m.s[0]*x+c*m.s[2]*z];
                 const pr=project(world);count++;
                 if(!Number.isFinite(pr.x)||!Number.isFinite(pr.y)){behind++;continue}
                 if(pr.inFrustum)inFrustum++;
                 minPx=Math.min(minPx,pr.x);maxPx=Math.max(maxPx,pr.x);
                 minPy=Math.min(minPy,pr.y);maxPy=Math.max(maxPy,pr.y);
               }
             }
             anatomyBounds=count?{
               width:maxPx-minPx,height:maxPy-minPy,
               minX:minPx,maxX:maxPx,minY:minPy,maxY:maxPy,
               count,inFrustum,behind,magnification:this.anatomyDisplayMagnification
             }:null;
           }else{
             const centers=this.archMeshes.flat().filter(m=>m.tag==='crown'&&!m.hidden)
               .map(m=>project(m.p)).filter(p=>p.inFrustum);
             anatomyBounds=centers.length?{
               width:Math.max(...centers.map(p=>p.x))-Math.min(...centers.map(p=>p.x)),
               height:Math.max(...centers.map(p=>p.y))-Math.min(...centers.map(p=>p.y)),
               count:centers.length,inFrustum:centers.length,magnification:1
             }:null;
           }
           // Project all 4 panel corners and the three true text rectangles,
           // in the matrices of each captured XR eye. Never infer visibility
           // from FDI text state alone.
           const panel=this.xrPrep?.active?this.xrPrep.clinicalUI:[];
           const eyeClinical=panel?.length?panel.map(m=>{
             const center=m.p,halfW=m.s[0]/2,halfH=m.s[1]/2;
             const points=[[-halfW,-halfH],[halfW,-halfH],[halfW,halfH],[-halfW,halfH]]
               .map(([dx,dy])=>project([center[0]+dx,center[1]+dy,center[2]]));
             return {corners:points,visible:!m.hidden,kind:m.kind};
           }):[];
           // Measure full catalog and action-rectangle projections using the
           // same matrices actually submitted to each rendered eye. Geometry
           // alone cannot establish glyph occlusion: pixel review remains required.
           const catalog=this.xrCatalog;
           const catalogSurfaces=catalog?.open?[
             {name:'panel',mesh:catalog.panels[0]},
             ...['spawn','reset','close'].map(name=>({
               name,mesh:catalog.panels.find(m=>this.pickables.some(p=>p.mesh===m&&p.key==='catalog:'+name))
             }))
           ].map(({name,mesh})=>({
             name,corners:mesh?[
               [-1,-1],[1,-1],[1,1],[-1,1]
             ].map(([sx,sy])=>project([mesh.p[0]+sx*mesh.s[0]/2,mesh.p[1]+sy*mesh.s[1]/2,mesh.p[2]+mesh.s[2]/2])):[]
           })):[];
           if(!this.__xrEyeParts)this.__xrEyeParts=[];
           this.__xrEyeParts.push({canvas,tools,anatomyBounds,anatomyPixels,rasterBounds,fdiVisiblePixels,eyeClinical,catalogSurfaces});
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
               width:combined.width,height:combined.height,eyes:2,eyeTools:sides.map(v=>v.tools),eyeAnatomy:sides.map(v=>v.anatomyBounds),eyeAnatomyPixels:sides.map(v=>v.anatomyPixels),eyeAnatomyRaster:sides.map(v=>v.rasterBounds),eyeFdiVisiblePixels:sides.map(v=>v.fdiVisiblePixels),eyeClinical:sides.map(v=>v.eyeClinical),eyeCatalog:sides.map(v=>v.catalogSurfaces),
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
   const destination=auxiliary?(result.phase7Captures??=[]):result.captureManifest;
   if(!auxiliary){result.captureManifest.push({file:filename,label,kind:'Meta IWER Quest 2 emulator, WebGL XR eye framebuffer',captureFrame:screenshot.frame,width:screenshot.width,height:screenshot.height,eyes:screenshot.eyes,eyeTools:screenshot.eyeTools,eyeAnatomy:screenshot.eyeAnatomy,eyeAnatomyPixels:screenshot.eyeAnatomyPixels,eyeAnatomyRaster:screenshot.eyeAnatomyRaster,sha256,duplicateOf,testedRevision:process.env.GITHUB_SHA||process.env.KLINIKLAB_BUILD_SHA||'revision not provided',origin});}
   else destination.push({file:filename,label,kind:'Meta IWER Quest 2 emulator, WebGL XR eye framebuffer',captureFrame:screenshot.frame,width:screenshot.width,height:screenshot.height,eyes:screenshot.eyes,eyeClinical:screenshot.eyeClinical,eyeCatalog:screenshot.eyeCatalog,eyeFdiVisiblePixels:screenshot.eyeFdiVisiblePixels,sha256,duplicateOf,testedRevision:process.env.KLINIKLAB_BUILD_SHA||'revision not provided'});
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
 await page.waitForFunction(()=>{
   const s=window.kliniklab.scene;
   return s.anatomyDisplayMagnification===12&&!s.teachingPlacementPending
     &&s.teachingPlacementInfo?.bounds?.vertices>1000
     &&s.archMeshes.flat().some(m=>m.tag==='crown'&&m.s[0]>.025);
 },null,{timeout:Math.max(15000,config.collectionDeadlineMs)});
 await captureXR('05-mirror-release-return.png','Anatomy close-up: near-field explicit 12x teaching examination');
 const detailAnatomy=result.captureManifest.at(-1).eyeAnatomy;
 const raster=result.captureManifest.at(-1).eyeAnatomyRaster;
 const examinationPlacement=await page.evaluate(()=>{
   const s=window.kliniklab.scene;return {
     mode:s.anatomyDisplayMagnification,pending:s.teachingPlacementPending,
     info:s.teachingPlacementInfo,
     fdiIds:Object.keys(s.teeth).sort(),
     numberOfPickTargets:s.pickables.filter(p=>p.key?.startsWith('tooth:')).length
   };
 });
 result.anatomyExamination={placement:examinationPlacement,projected:detailAnatomy,raster};
 assert.equal(examinationPlacement.mode,12);
 assert.equal(examinationPlacement.pending,false,'XR teaching placement was never committed');
 assert.equal(examinationPlacement.fdiIds.length,32);
 assert(detailAnatomy?.length===2&&detailAnatomy.every(x=>
   x?.count>10000&&x.inFrustum===x.count&&x.behind===0
   &&x.minX>-.80&&x.maxX<.80&&x.minY>-.78&&x.maxY<.78
   &&x.width>.24&&x.height>.15),
   'Post-model-transform XR vertices clipped or not centered in both eyes: '+JSON.stringify(detailAnatomy));
 result.checks.push('All real post-transform dental vertices fully inside both stereo eye margins');
 assert(raster?.length===2&&raster.every(b=>
   b&&b.count>5000&&b.left>.10&&b.right<.90
   &&b.top>.10&&b.bottom<.90
   &&b.width>.20&&b.height>.14
   &&b.centerX>.34&&b.centerX<.66&&b.centerY>.32&&b.centerY<.68),
   'Rendered dental pixels are clipped, too small or off-center: '+JSON.stringify(raster));
 result.checks.push('Actual dental raster is centered, contained and substantial in both stereo eyes');
 assert(detailAnatomy.every((x,i)=>x.width>overviewAnatomy[i].width*2),
   'Teaching scale did not enlarge the arch over normal overview');
 result.checks.push('Enlarged complete dental arch spans both eyes versus normal-scale overview');
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
 // The same view is intentionally reached after closing catalog. Identical
 // pixels are a valid closed-baseline restoration, not a failed checkpoint.
 // Capture independent, user-visible state before opening the catalog.
 const closedSceneSnapshot=()=>page.evaluate(()=>{
   const s=window.kliniklab.scene;
   return {
     helpOpen:!!s.xrGuide?.state?.open,
     helpVisiblePanels:s.xrGuide.meshes.filter(m=>!m.hidden).length,
     catalogOpen:!!s.xrCatalog.open,
     catalogVisiblePanels:s.xrCatalog.panels.filter(m=>!m.hidden).length,
     treatmentActive:!!s.xrPrep.active,
     clinicalContextVisible:s.xrPrep.clinicalUI.filter(m=>!m.hidden).length,
     patientVisible:(s.xrPatientMeshes||[]).filter(m=>!m.hidden).length,
     toolOwners:s.xrTableTools.map(t=>[t.name,t.owner])
   };
 });
 const closedBaselineAfterHelp=await closedSceneSnapshot();
 assert.equal(closedBaselineAfterHelp.helpOpen,false);
 assert.equal(closedBaselineAfterHelp.catalogOpen,false);
 assert.equal(closedBaselineAfterHelp.catalogVisiblePanels,0);

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
 const closedAfterCatalog=await closedSceneSnapshot();
 assert.deepEqual(closedAfterCatalog,closedBaselineAfterHelp,
   'Catalog close did not restore the same visible workspace as help close');
 const helpClosedCapture=result.captureManifest.find(c=>c.file==='08-help-closed-after-close.png');
 const catalogClosedCapture=result.captureManifest.find(c=>c.file==='10-tool-catalog-closed.png');
 result.catalog.closedBaseline={
   stateEqual:true,helpCloseFrame:helpClosedCapture?.captureFrame,
   catalogCloseFrame:catalogClosedCapture?.captureFrame,
   pixelsIdentical:!!helpClosedCapture&&helpClosedCapture.sha256===catalogClosedCapture?.sha256,
   closedScene:closedAfterCatalog
 };
 result.checks.push('Catalog close restores the same visible workspace state as help close; identical pixels are expected');
 result.checks.push('Phase 4 controlled tray spawn, reset, close do not clone instruments');
 // Phase 7 diagnostic captures are locally retained by the owner-PC worker.
 // Keep the 10 required interaction captures unchanged until the worker's
 // publication schema is updated for additional named screenshots.
 const fdiEvidence=await page.evaluate(()=>{
   const scene=window.kliniklab.scene,app=window.kliniklab;
   if(!scene.xrPrep||!app.volLab)throw Error('XR volumetric practice unavailable');
   if(!scene.xrPrep.active)scene.xrPrep.toggle();
   scene.xrFdiEvidence=true;
   return {enabled:scene.xrFdiEvidence,practiceActive:scene.xrPrep.active};
 });
 assert(fdiEvidence.enabled&&fdiEvidence.practiceActive);
 result.fdiTreatmentStates=[];
 for(const id of ['11','13','14','16','36','46']){
   const state=await page.evaluate(id=>{
     const app=window.kliniklab,s=app.scene;
     if(!app.volLab.setTooth(id))throw Error('FDI treatment switch failed: '+id);
     s.xrPrep.syncCase();
     if(!s.xrPrep.updateMesh())throw Error('FDI XR mesh update failed: '+id);
     const solid=app.volLab.solid;
     return {id,toothClass:solid.toothClass(),upper:solid.isUpper(),left:solid.isLeft(),
       roots:solid.rootCenters(),cuspHeight:solid.height(.45,.15),
       savedCuts:solid.bur.length,meshTriangles:s.xrPrep.visibleTriangles,
       revision:app.volLab.revision};
   },id);
   assert(state.meshTriangles>100,'Selected FDI tooth generated no XR triangles');
   result.fdiTreatmentStates.push(state);
   const clinical=await page.evaluate(()=>window.kliniklab.scene.xrPrep.clinicalState);
   assert.equal(clinical.fdi,id,'Phase8 selected-FDI context stale');
   assert.equal(clinical.jaw,state.upper?'UPPER':'LOWER');
   assert.equal(clinical.side,state.left?'LEFT':'RIGHT');
   assert.equal(clinical.toothClass,state.toothClass);
   result.phase8ClinicalUI??=[];
   result.phase8ClinicalUI.push(clinical);
   const panels=await page.evaluate(()=>{
     const p=window.kliniklab.scene.xrPrep;
     return p.clinicalUI.map(m=>({p:m.p.slice(),s:m.s.slice(),hidden:m.hidden}));
   });
   assert(panels.every(m=>!m.hidden),'Clinical panel has hidden glyphs');
   result.phase8PanelGeometry??=[];result.phase8PanelGeometry.push({id,panels});

   await captureXR('phase7-fdi-'+id+'.png','Phase 7 isolated XR treatment tooth FDI '+id,true);
   // The peripheral context is normally visible in real XR procedure mode.
   // Capture it with the full room without modifying the established arch view.
   if(id==='16'||id==='36'){
     await page.evaluate(()=>{window.kliniklab.scene.xrFdiEvidence=false});
     await captureXR('phase8-context-fdi-'+id+'.png','Clinical peripheral FDI context for '+id,true);
     const eyes=result.phase7Captures.at(-1).eyeClinical;
     assert(eyes?.length===2&&eyes.every(m=>m?.length===5&&m.every((surface,i)=>surface.visible&&surface.corners.every(c=>
       c.inFrustum&&c.x>-.90&&c.x<.90&&c.y>-.90&&c.y<.90))),
       'Actual projected clinical panel/text corners exceed stereo margins: '+JSON.stringify(eyes));
     result.checks.push('All five clinical panel/text surfaces fit both XR eye frusta with margins: FDI '+id);

     await page.evaluate(()=>{window.kliniklab.scene.xrFdiEvidence=true});
   }
   const evidence=result.phase7Captures.at(-1);
   assert(evidence.eyeFdiVisiblePixels?.length===2&&evidence.eyeFdiVisiblePixels.every(n=>n>1000),
     'Selected FDI geometry not visibly rasterized in both eyes: '+id+' '+JSON.stringify(evidence.eyeFdiVisiblePixels));
 }
 // In-frame panel/glyph occlusion review with existing room, catalog and help.
 // Baseline XR scene render must remain unchanged in its ten standard captures.
 await page.evaluate(()=>{window.kliniklab.scene.xrFdiEvidence=false});
 await captureXR('phase8-panel-workspace.png','FDI clinical panel within XR treatment workspace',true);
 await page.evaluate(()=>{const s=window.kliniklab.scene;s.setXRCatalogOpen(true)});
 await captureXR('phase8-panel-catalog-open.png','FDI panel with tools catalog open for collision review',true);
 const catalogEyes=result.phase7Captures.at(-1).eyeCatalog;
 assert(catalogEyes?.length===2&&catalogEyes.every(eye=>eye.length===4&&eye.every(item=>item.corners.length===4&&item.corners.every(c=>
   c.inFrustum&&c.x>-.87&&c.x<.87&&c.y>-.88&&c.y<.88))),
   'Catalog panel or action corners clipped in an actual XR eye: '+JSON.stringify(catalogEyes));
 result.checks.push('Complete catalog and all three action rectangles fit both rendered XR eye frusta with margins');
 const catalogGeometry=await page.evaluate(()=>{
   const sc=window.kliniklab.scene,cat=sc.xrCatalog;
   const controls=['spawn','reset','close'].map(key=>{
     const mesh=cat.panels.find(m=>sc.pickables.some(p=>p.mesh===m&&p.key==='catalog:'+key));
     if(!mesh)throw Error('Missing actionable catalog control '+key);
     const label=cat.panels.find(m=>Math.abs(m.p[0]-mesh.p[0])<.001&&m!==mesh&&m.s[2]>0);
     return {key,p:mesh.p.slice(),size:mesh.s.slice(),hidden:mesh.hidden,labelVisible:!!label&&!label.hidden};
   });
   const panel=cat.panels[0];
   return {panel:{p:panel.p.slice(),size:panel.s.slice()},controls,
     trayHeight:1.03,foregroundOffset:panel.p[2]+1.03};
 });
 assert(catalogGeometry.controls.every(c=>!c.hidden&&c.labelVisible&&c.p[1]>1.27),
   'Catalog action row obstructed or invisible: '+JSON.stringify(catalogGeometry));
 assert(catalogGeometry.controls.every(c=>c.p[2]>-.78),
   'Catalog controls must be forward of tray: '+JSON.stringify(catalogGeometry));
 result.phase8CatalogGeometry=catalogGeometry;
 result.checks.push('All three catalog actions and labels elevated in front of instrument tray');

 const catalogOwner=await page.evaluate(()=>{
   const s=window.kliniklab.scene,p=s.xrPrep;p.syncModalVisibility();
   return {owner:p.modalOwner,contextHidden:p.clinicalUI.every(m=>m.hidden),toothHidden:p.meshes.every(m=>m.hidden),catalogShown:s.xrCatalog.panels.some(m=>!m.hidden)};
 });
 assert.equal(catalogOwner.owner,'catalog');
 assert(catalogOwner.contextHidden&&catalogOwner.toothHidden&&catalogOwner.catalogShown,
 'Catalog modal not visually isolated: '+JSON.stringify(catalogOwner));
 result.checks.push('Catalog modal owns viewport; treatment and FDI context hidden');

 await page.evaluate(()=>{const s=window.kliniklab.scene;s.setXRCatalogOpen(false);s.xrGuide?.open?.()});
 await captureXR('phase8-panel-help-open.png','FDI panel with help open for collision review',true);
 const helpOwner=await page.evaluate(()=>{
   const s=window.kliniklab.scene,p=s.xrPrep;p.syncModalVisibility();
   return {owner:p.modalOwner,contextHidden:p.clinicalUI.every(m=>m.hidden),toothHidden:p.meshes.every(m=>m.hidden),helpOpen:s.xrGuide.state.open};
 });
 assert.equal(helpOwner.owner,'help');
 assert(helpOwner.contextHidden&&helpOwner.toothHidden&&helpOwner.helpOpen,
 'Help modal occluded by treatment: '+JSON.stringify(helpOwner));
 result.checks.push('Help modal owns viewport; tooth hidden and guide controls exposed');

 await page.evaluate(()=>{const s=window.kliniklab.scene;s.xrGuide?.close?.();s.xrFdiEvidence=true;s.xrPrep.syncModalVisibility()});
 const restored=await page.evaluate(()=>{
   const p=window.kliniklab.scene.xrPrep;
   return {owner:p.modalOwner,visibleContext:p.clinicalUI.every(m=>!m.hidden),visibleTeeth:p.meshes.every(m=>!m.hidden)};
 });
 assert(restored.owner==='treatment'&&restored.visibleContext&&restored.visibleTeeth,
   'Closing help did not restore treatment: '+JSON.stringify(restored));
 result.checks.push('Closing modals restores treatment mesh and FDI UI without loss of saved state');
 // Phase7 additional retained evidence: oblique crown/root view, visible
 // cut and return-to-same-FDI image. Do not alter the ten baseline captures.
 await page.evaluate(()=>{
   const sc=window.kliniklab.scene;
   for(const m of sc.xrPrep.meshes)m.rot=[1.03,.18,0];
 });
 await captureXR('phase7-fdi-16-oblique.png','FDI16 oblique view showing occlusal surface and root branches',true);
 const beforeCapture=await page.evaluate(()=>window.kliniklab.scene.__xrEyeCapture?.dataURL);

 await page.evaluate(()=>{
   const app=window.kliniklab,lab=app.volLab;
   lab.setTooth('16');
   const x=.08,z=-.08,top=lab.solid.height(x,z),radius=.30,depth=.22;
   const y=top+radius-depth;
   if(lab.solid.outer(x,top-.035,z)>=0)throw Error('Cut target does not intersect crown surface');
   lab.solid.addCut(x,y,z,radius);
   window.__phase7Cut={fdi:'16',p:[x,y,z],radius,depth,top,outerAtSurface:lab.solid.outer(x,top-.035,z)};

   lab.rebuild();
   app.scene.xrPrep.updateMesh();
 });
 await captureXR('phase7-fdi-16-after-cut.png','FDI16 oblique view after visible preparation',true);
 const afterCapture=await page.evaluate(()=>window.kliniklab.scene.__xrEyeCapture?.dataURL);
 const compareStereo=(before,after)=>{
   const a=Buffer.from(before.split(',')[1],'base64'),b=Buffer.from(after.split(',')[1],'base64');
   // A stable PNG checksum alone is insufficient: decode image pixels using
   // the page's Canvas 2D, compare fixed-camera color differences per eye.
   return {beforeBytes:a.length,afterBytes:b.length};
 };
 result.phase7CutDefinition=await page.evaluate(()=>window.__phase7Cut);

 await page.evaluate(()=>{
   const app=window.kliniklab;
   app.volLab.setTooth('36');
   app.scene.xrPrep.updateMesh();
   app.volLab.setTooth('16');
   app.scene.xrPrep.updateMesh();
 });
 await captureXR('phase7-fdi-16-switchback.png','FDI16 after switching to FDI36 and returning, cut retained',true);
 result.phase7FixedCameraDifference=await page.evaluate(async({before,after})=>{
   const decode=async data=>{
     const img=new Image();img.src=data;await img.decode();
     const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
     const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
     return {w:img.width,h:img.height,pixels:ctx.getImageData(0,0,img.width,img.height).data};
   };
   const a=await decode(before),b=await decode(after);
   if(a.w!==b.w||a.h!==b.h)throw Error('Different stereo raster dimensions');
   const eyeWidth=a.w/2,counts=[0,0],bounds=[null,null],total=[0,0];
   for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){
     const eye=x<eyeWidth?0:1,k=(y*a.w+x)*4;
     const d=Math.abs(a.pixels[k]-b.pixels[k])+Math.abs(a.pixels[k+1]-b.pixels[k+1])+Math.abs(a.pixels[k+2]-b.pixels[k+2]);
     total[eye]+=d;
     if(d>55){counts[eye]++;const px=x-eye*eyeWidth;const box=bounds[eye]||(bounds[eye]={minX:px,maxX:px,minY:y,maxY:y});box.minX=Math.min(box.minX,px);box.maxX=Math.max(box.maxX,px);box.minY=Math.min(box.minY,y);box.maxY=Math.max(box.maxY,y)}
   }
   return {changedPixels:counts,bounds,meanChannelDifference:total.map(v=>v/(a.h*eyeWidth*3))};
 },{before:beforeCapture,after:afterCapture});
 assert(result.phase7FixedCameraDifference.changedPixels.every(n=>n>120),
   'Occlusal preparation not visibly distinguishable with fixed camera: '+JSON.stringify(result.phase7FixedCameraDifference));
 result.checks.push('Actual fixed-camera stereo image difference proves visible occlusal material removal');

 result.phase7BeforeAfter=await page.evaluate(()=>({
   fdi:window.kliniklab.volLab.fdiTooth,
   cuts:window.kliniklab.volLab.solid.bur.length,
   normals:window.kliniklab.scene.xrPrep.surfaceNormalMode,
   uniqueVertexNormals:window.kliniklab.scene.xrPrep.surfaceNormalCount
 }));
 assert.equal(result.phase7BeforeAfter.fdi,'16');
 assert(result.phase7BeforeAfter.cuts>=1);
 assert.equal(result.phase7BeforeAfter.normals,'implicit-field-gradient');
 await page.evaluate(()=>{
   const sc=window.kliniklab.scene;
   for(const m of sc.xrPrep.meshes)m.rot=[0,0,0];
 });
 result.checks.push('Oblique FDI16 before/after and switch-back diagnostic captures preserve cuts and smooth-field normals');

 // Verify real application-level per-FDI cut isolation, durable browser storage,
 // and restoration after leaving and reselecting a tooth. Restore clean test
 // state afterwards; captured images above remain the original untreated shapes.
 result.fdiPersistence=await page.evaluate(()=>{
   const lab=window.kliniklab.volLab;
   const select=id=>{if(!lab.setTooth(id))throw Error('Invalid FDI '+id);return lab.solid.bur.length};
   select('16');
   const previous=lab.solid.bur.map(b=>({p:b.p.slice(),r:b.r}));
   const probe={p:[.12,.58,-.14],r:.07};
   lab.solid.addCut(...probe.p,probe.r);lab.rebuild();
   const stored16=JSON.parse(localStorage.getItem('kliniklab-fdi-treatment-v1')||'{}')['16']?.bur?.length;
   const other11=select('11'),other36=select('36');
   const restored16=select('16');
   lab.solid.bur=previous;lab.rebuild();
   return {stored16,other11,other36,restored16,initialCuts:previous.length};
 });
 assert.equal(result.fdiPersistence.stored16,result.fdiPersistence.initialCuts+1);
 assert.equal(result.fdiPersistence.other11,0);
 assert.equal(result.fdiPersistence.other36,0);
 assert.equal(result.fdiPersistence.restored16,result.fdiPersistence.initialCuts+1);
 result.checks.push('FDI 16 cut survives selection round trip and localStorage while FDI 11 and 36 stay independent');
 assert.notEqual(result.fdiTreatmentStates[0].cuspHeight,result.fdiTreatmentStates[1].cuspHeight);
 assert.notDeepEqual(result.fdiTreatmentStates[3].roots,result.fdiTreatmentStates[4].roots);
 result.checks.push('Six FDI-selected XR volumetric meshes generated with distinct anatomy and locally retained stereo captures');
 await page.evaluate(()=>{const s=window.kliniklab.scene;s.xrFdiEvidence=false;if(s.xrPrep.active)s.xrPrep.toggle()});
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
