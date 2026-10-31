// Actual-app FDI16 educational procedure: opt-in only, never an AI-generated frame.
// Executed in the current Meta IWER Quest2 Playwright session and existing
// fresh two-eye XR framebuffer captureXR path. Not real patient/clinician care.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {alignRayQuaternion,translationCorrection,DOWN} from './procedure-ray.mjs';
import {slidesHTML} from './procedure-slides.mjs';

export const STEPS=Object.freeze([
 ['01-select-fdi16.png','Select FDI 16 in active tooth preparation'],
 ['02-precut.png','Inspect untreated occlusal geometry, fixed stereo camera'],
 ['03-aim.png','Aim tracked right-hand IWER target ray at crown'],
 ['04-cut.png','After real in-app trigger-driven educational preparation cut'],
 ['05-postcut.png','Review cut and recorded FDI context'],
 ['06-switchback.png','Return to FDI 16 after switching to FDI 36']
]);
export const RUN_ID=/^fdi16-[a-z0-9][a-z0-9_-]{3,57}$/;
export const SHA=/^[a-f0-9]{40}$/;
export function validateProcedureConfig(env){
 if(env.KLINIKLAB_PROCEDURE_CAPTURE!=='1')return null;
 const id=env.KLINIKLAB_PROCEDURE_RUN_ID,sha=env.KLINIKLAB_BUILD_SHA;
 if(!RUN_ID.test(id||'')||!SHA.test(sha||''))throw Error('Provide unique fdi16-* run ID and exact SHA to opt-in to procedure evidence');
 return Object.freeze({id,sha});
}
export async function runProcedureCapture({page,captureXR,result,out,config}){
 assert(RUN_ID.test(config.id)&&SHA.test(config.sha));
 const root=path.join(out,'procedure');
 await mkdir(root,{recursive:true});
 const dir=path.join(root,config.id);
 await mkdir(dir); // refuse overwriting existing evidence
 const manifest={runId:config.id,testedCommit:config.sha,profile:'Meta IWER Quest2 on isolated PC Chrome',
  procedure:'FDI16 simplified educational occlusal preparation',operator:'automated IWER controller, not a filmed dentist',
  clinicalValidation:'PENDING',calibrated:false,
  steps:[],pixelDifference:null,videoAcceptance:'PENDING independent playback and pixel review'};
 // Saved cut geometry and the GPU-submitted model are not equivalent. Read
 // each real WebGL mesh's CPU vertex buffer and visibility, not generated art.
 const state=()=>page.evaluate(()=>{
  const app=window.kliniklab,s=app.scene,p=s.xrPrep,lab=app.volLab;
  const meshState=p.meshes.map(m=>{
    const g=s.geom[m.kind],cpu=g?.cpu||new Float32Array();
    const bytes=new Uint8Array(cpu.buffer,cpu.byteOffset,cpu.byteLength);
    let hash=2166136261;
    for(let i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);
    return {material:m.xrMaterial,hidden:!!m.hidden,vertices:g?.count||0,
      fingerprint:(hash>>>0).toString(16).padStart(8,'0')};
  });
  return {fdi:String(lab.fdiTooth),caseKey:lab.caseKey,cuts:lab.solid.bur.length,
    bur:lab.solid.bur.map(b=>({p:b.p.slice(),r:b.r})),
    burRadius:lab.burRadius,revision:lab.revision,
    triangles:p.visibleTriangles,meshState,active:p.active,
    evidenceMode:!!s.xrFdiEvidence,xrFrames:s.xrVisualDiagnostics.frames,
    session:!!s.xrSession,modal:p.modalOwner};
 });
 const drawVideoFrame=async(dataURL)=>{
  await page.evaluate(async(dataURL)=>{
   let c=document.getElementById('__procedure_stereo_frame');
   if(!c){c=document.createElement('canvas');c.id='__procedure_stereo_frame';
     c.width=1440;c.height=1000;
     Object.assign(c.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',
       zIndex:'2147483647',pointerEvents:'none',background:'#081721'});
     document.body.appendChild(c);
     // Browser MediaRecorder runs only during the six procedure steps.
     // It records this transparent-to-Playwright overlay, composed solely
     // of true, unedited left/right XR eye framebuffer screenshots.
     if(window.MediaRecorder&&c.captureStream){
       const stream=c.captureStream(12);
       const type=['video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
       if(type){
         const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:3500000});
         const chunks=[];
         recorder.addEventListener('dataavailable',e=>{if(e.data.size)chunks.push(e.data)});
         recorder.start(250);
         window.__kliniklabProcedureVideo={recorder,chunks,stream,type};
       }
     }
   }
   const i=new Image();i.src=dataURL;await i.decode();
   const x=c.getContext('2d');x.fillStyle='#081721';x.fillRect(0,0,c.width,c.height);
   x.drawImage(i,0,0,c.width,c.height);
  },dataURL);
  // Record the genuine rendered stereo step for approximately one second.
  await page.waitForTimeout(1100);
 };
 const take=async(i)=>{
  const [filename,label]=STEPS[i];
  await captureXR(filename,label,true);
  const record=result.phase7Captures.at(-1);
  assert.equal(record.file,filename);
  assert(record.eyes===2&&record.captureFrame>0,'fresh binocular XR framebuffer required');
  if(i===1||i===3||i===4||i===5){
    assert.equal(record.eyeProcedureTarget?.length,2,'Missing per-eye site projection');
    assert(record.eyeProcedureTarget.every(t=>t?.projection?.inFrustum&&
       Math.abs(t.projection.x)<.86&&Math.abs(t.projection.y)<.86),
      'Preparation site outside XR eye margins: '+JSON.stringify(record.eyeProcedureTarget));
    assert.equal(record.eyeFdiVisiblePixels?.length,2,'Missing tooth raster measurements');
    assert(record.eyeFdiVisiblePixels.every(v=>v>120),
      'FDI16 tooth not actually drawn in both XR eyes: '+JSON.stringify(record.eyeFdiVisiblePixels));
  }
  const source=path.join(out,filename),target=path.join(dir,filename);
  const bytes=await readFile(source);
  await rename(source,target);
  record.file='procedure/'+config.id+'/'+filename;
  const actual=await state();
  assert.equal(actual.fdi,'16');
  assert(actual.active&&actual.session);
  manifest.steps.push({n:i+1,file:filename,label,sha256:createHash('sha256').update(bytes).digest('hex'),
   bytes:bytes.length,frame:record.captureFrame,eyes:record.eyes,state:actual});
  const dataURL='data:image/png;base64,'+bytes.toString('base64');
  await drawVideoFrame(dataURL);
  return dataURL;
 };
 // The entire procedure is transactional with respect to the dedicated
 // teaching tooth and IWER controller: retain partial evidence on failure,
 // but always release trigger, stop recording, reset the tooth and remove the
 // temporary browser video overlay. No global XR worker/pipeline mutation.
 try {
 // Isolated browser profile: never use patient data or a signed-in browser.
 await page.evaluate(()=>{
  const app=window.kliniklab,s=app.scene,lab=app.volLab;
  if(!s.xrSession||!lab.setTooth('16')||lab.solid.bur.length)throw Error('FDI16 clean XR fixture unavailable');
  s.setXRCatalogOpen(false);s.xrGuide?.close?.();
  if(!s.xrPrep.active)s.xrPrep.toggle();
  s.xrPrep.syncCase();s.xrPrep.updateMesh();s.xrPrep.syncModalVisibility();
  // Native slider range is .055 to .215 normalized units. Use a reliably
  // rasterizable size for this *educational* capture, never a clinical bur.
  window.__procedureOriginalBurRadius=lab.burRadius;
  lab.burRadius=.20;
  window.__kliniklabProcedureTargetModel=[.08,lab.solid.height(.08,-.08),-.08];
  s.xrFdiEvidence=false;
 });
 await take(0);
 await page.evaluate(()=>{window.kliniklab.scene.xrFdiEvidence=true});
 const before=await take(1);
 const preCutState=manifest.steps[1].state;
 assert(preCutState.evidenceMode,'Precut frame does not show isolated XR tooth');
 assert(preCutState.meshState.every(m=>!m.hidden),'Precut meshes hidden');
 assert(preCutState.meshState.some(m=>m.vertices>100),'No visible meshed volume');
 // XRFrame.getPose may ONLY be sampled in an active XR animation callback.
 // The previous waitForFunction read scene.latestFrame later and therefore
 // could produce null poses even with a correctly positioned controller.
 // Additionally, targetRaySpace may be offset/rotated from IWER controller
 // pose; measure it, do not assume quaternion [-sqrt(.5),0,0,sqrt(.5)].
 const aim=await page.evaluate(()=>{
  const a=window.kliniklab,p=a.xrPrep,solid=a.volLab.solid;
  const local=[.08,solid.height(.08,-.08)-.065,-.08];
  const world=p.modelToWorld(local),origin=[world[0],world[1]+.29,world[2]];
  const controller=window.__xrTestDevice.controllers.right;
  controller.connected=true;
  controller.position.set(...origin);controller.quaternion.set(0,0,0,1);
  a.scene.xrFdiEvidence=false;
  return {local,world,origin,originalPose:{quaternion:[0,0,0,1],position:origin}};
 });
 const liveRay=()=>page.evaluate(()=>new Promise((resolve,reject)=>{
   const scene=window.kliniklab.scene,session=scene.xrSession;
   if(!session)return reject(Error('No active XR session for targetRaySpace'));
   session.requestAnimationFrame((_time,frame)=>{
     try{
       const source=[...frame.session.inputSources].find(s=>s.handedness==='right'&&s.targetRaySpace);
       if(!source)return reject(Error('Tracked right targetRaySpace not connected'));
       const ray=scene.xrPrep.rayForFrame(frame,source);
       if(!ray)return reject(Error('Missing ray pose in active XRFrame'));
       const hit=scene.xrPrep.traceSurface(ray.o,ray.d);
       const obstacle=scene.getRayHit(ray.o,ray.d);
       resolve({origin:ray.o,direction:ray.d,
        hit:hit?{model:hit.p,world:hit.world,distance:hit.distance}:null,
        obstacle:obstacle?{key:obstacle.key,distance:obstacle.distance}:null,
        xrFrames:scene.xrVisualDiagnostics.frames});
     }catch(error){reject(Error('Active XRFrame probe failed: '+error.message))}
   });
 }));
 const firstRay=await liveRay();
 const correctedQuaternion=alignRayQuaternion(firstRay.direction,[0,0,0,1],DOWN);
 await page.evaluate(q=>window.__xrTestDevice.controllers.right.quaternion.set(...q),correctedQuaternion);
 const rotatedRay=await liveRay();
 const delta=translationCorrection(rotatedRay.origin,aim.origin);
 await page.evaluate(delta=>{
   const c=window.__xrTestDevice.controllers.right;
   c.position.set(c.position.x+delta[0],c.position.y+delta[1],c.position.z+delta[2]);
 },delta);
 const finalRay=await liveRay();
 manifest.aim={...aim,firstRay,rotatedRay,finalRay,correctedQuaternion,delta,
  method:'calibrated from XR targetRaySpace measured inside valid XRFrame'};
 assert(finalRay.hit,'Right-hand target ray still misses FDI 16 surface after calibrated alignment: '+JSON.stringify(manifest.aim));
 assert(!finalRay.obstacle||finalRay.obstacle.distance>=finalRay.hit.distance-.025,
   'A nearer GUI object blocks the actual procedure ray: '+JSON.stringify(manifest.aim));
 assert(finalRay.direction[1]<-.93,'Aligned ray not pointing down to crown');
 await take(2);
 const prior=await state();
 await page.evaluate(()=>window.__xrTestDevice.controllers.right.updateButtonValue('trigger',1));
 await page.waitForFunction(previous=>{
  const app=window.kliniklab;
  return app.volLab.solid.bur.length>previous.cuts&&app.xrPrep.cutCount>0;
 },prior,{timeout:18000,polling:50});
 await page.evaluate(()=>window.__xrTestDevice.controllers.right.updateButtonValue('trigger',0));
 await page.waitForFunction(()=>window.kliniklab.xrPrep.triggers.size===0,null,{timeout:18000});
 await page.evaluate(()=>{
  const a=window.kliniklab;
  // During a held trigger the app deliberately reduces resolution to 14.
  // Refresh its actual post-release model at 24 cells before evidentiary
  // capture. Do not alter the XR geometry directly or substitute a bitmap.
  a.volLab.rebuild(true);a.xrPrep.syncCase();
  if(!a.xrPrep.updateMesh())throw Error('Post-cut XR mesh update refused');
  a.xrPrep.syncModalVisibility();a.scene.xrFdiEvidence=true;
 });
 const postCutState=await state();
 manifest.meshComparison={before:preCutState.meshState,after:postCutState.meshState,
  beforeTriangles:preCutState.triangles,afterTriangles:postCutState.triangles,
  beforeCutCount:preCutState.cuts,afterCutCount:postCutState.cuts,
  burRadius:postCutState.burRadius,bur:postCutState.bur};
 assert(postCutState.cuts>preCutState.cuts,'No recorded FDI16 cut');
 assert(postCutState.meshState.every(m=>!m.hidden),'Postcut volume hidden');
 assert(postCutState.meshState.some((m,i)=>m.vertices!==preCutState.meshState[i].vertices||
     m.fingerprint!==preCutState.meshState[i].fingerprint),
   'Actual GPU-backed geometry unchanged despite cut: '+JSON.stringify(manifest.meshComparison));
 const after=await take(3);
 assert(manifest.steps[3].state.cuts>manifest.steps[1].state.cuts,'real in-app cut never occurred');
 const difference=await page.evaluate(async({before,after})=>{
  const pixels=async url=>{
   const i=new Image();i.src=url;await i.decode();
   const c=document.createElement('canvas');c.width=i.width;c.height=i.height;
   const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);
   return {w:i.width,h:i.height,p:g.getImageData(0,0,i.width,i.height).data};
  };
  const a=await pixels(before),b=await pixels(after);
  if(a.w!==b.w||a.h!==b.h||a.w%2)throw Error('Stereo dimensions changed');
  const changed=[0,0];
  for(let n=0;n<a.p.length;n+=4){
   const eye=((n/4)%a.w)<a.w/2?0:1;
   const d=Math.abs(a.p[n]-b.p[n])+Math.abs(a.p[n+1]-b.p[n+1])+Math.abs(a.p[n+2]-b.p[n+2]);
   if(d>55)changed[eye]++;
  }
  return {changedPixels:changed,thresholdRGBL1:55,eyes:2};
 },{before,after});
 assert(difference.changedPixels.every(n=>n>120),'No visible in-app cut in both eyes: '+JSON.stringify(difference));
 manifest.pixelDifference=difference;
 await page.evaluate(()=>{window.kliniklab.scene.xrFdiEvidence=false});
 await take(4);
 await page.evaluate(()=>{
  const a=window.kliniklab,s=a.scene,lab=a.volLab;
  lab.setTooth('36');s.xrPrep.syncCase();s.xrPrep.updateMesh();
  lab.setTooth('16');s.xrPrep.syncCase();s.xrPrep.updateMesh();
  s.xrFdiEvidence=true;
 });
 await take(5);
 assert.equal(manifest.steps[5].state.cuts,manifest.steps[4].state.cuts,'cut not persistent after FDI switch');
 assert(manifest.steps.every((x,i)=>i===0||x.frame>manifest.steps[i-1].frame),'Step frames are stale');
 // Finalize a short optional WebM from the exact six XR-eye framebuffer steps.
 // Not continuous hand animation: each real app checkpoint remains on screen
 // ~1.1 s and is visually different when the application state changes.
 let shortVideo=null;
 try{
  shortVideo=await page.evaluate(async()=>{
    const v=window.__kliniklabProcedureVideo;
    if(!v||v.recorder.state==='inactive')return null;
    const blob=await new Promise((resolve,reject)=>{
      v.recorder.addEventListener('stop',()=>resolve(new Blob(v.chunks,{type:v.type})),{once:true});
      v.recorder.addEventListener('error',e=>reject(Error(e.error?.message||'Recorder error')),{once:true});
      v.recorder.stop();
    });
    for(const t of v.stream.getTracks())t.stop();
    // Decode the short recording in the same pinned Chrome instance before
    // uploading it. File existence and MIME type alone prove nothing.
    let validation;
    try{
      const url=URL.createObjectURL(blob),v=document.createElement('video');
      try{
        v.muted=true;v.preload='auto';
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('metadata decode timeout')),10000);
          v.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve()},{once:true});
          v.addEventListener('error',()=>{clearTimeout(timer);reject(Error('video decode failed'))},{once:true});
          v.src=url;
        });
        const duration=v.duration,width=v.videoWidth,height=v.videoHeight;
        if(!Number.isFinite(duration)||duration<3||!width||!height)throw Error('Invalid decoded WebM metadata');
        const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;
        const ctx=canvas.getContext('2d',{willReadFrequently:true}),sampled=[];
        const preview=document.createElement('canvas');preview.width=1440;preview.height=334;
        const previewContext=preview.getContext('2d');
        let previewIndex=0;
        for(const time of [duration*.18,duration*.52,duration*.84]){
          await new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>reject(Error('seek decode timeout')),9000);
            v.addEventListener('seeked',()=>{clearTimeout(timer);resolve()},{once:true});
            v.currentTime=Math.max(0,Math.min(duration-.05,time));
          });
          ctx.drawImage(v,0,0,canvas.width,canvas.height);
          previewContext.drawImage(v,previewIndex*480,0,480,334);previewIndex++;
          sampled.push(new Uint8Array(ctx.getImageData(0,0,canvas.width,canvas.height).data));
        }
        const n=sampled[0].length,contrast=sampled.map(a=>{
          let min=255,max=0;
          for(let i=0;i<n;i+=4){const value=(a[i]+a[i+1]+a[i+2])/3;min=Math.min(min,value);max=Math.max(max,value)}
          return max-min;
        });
        const pixelDiff=(a,b)=>{let count=0;for(let i=0;i<n;i+=4)
          if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>55)count++;
          return count;};
        const changed=[pixelDiff(sampled[0],sampled[1]),pixelDiff(sampled[1],sampled[2])];
        validation={decoded:true,durationSec:duration,width,height,contrast,
          changedSampledPixels:changed,nonblankFrameVerified:contrast.every(x=>x>15),
          distinctStagesVerified:changed.some(x=>x>120),
          decodedFrameContactSheet:preview.toDataURL('image/png')};
      }finally{URL.revokeObjectURL(url);v.removeAttribute('src');v.load()}
    }catch(e){validation={decoded:false,nonblankFrameVerified:false,distinctStagesVerified:false,error:String(e.message)}}
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const sections=[];
    for(let i=0;i<bytes.length;i+=16384)
      sections.push(String.fromCharCode(...bytes.subarray(i,i+16384)));
    return {base64:btoa(sections.join('')),bytes:bytes.length,type:blob.type,validation};
  });
  if(shortVideo&&shortVideo.bytes>2000&&shortVideo.bytes<24*1024*1024){
    const vd=path.join(dir,'video');await mkdir(vd,{recursive:true});
    const bytes=Buffer.from(shortVideo.base64,'base64');
    await writeFile(path.join(vd,'actual-app-stereo-steps.webm'),bytes);
    const previewData=shortVideo.validation?.decodedFrameContactSheet;
    if(previewData?.startsWith('data:image/png;base64,')){
      await writeFile(path.join(vd,'decoded-video-preview.png'),
        Buffer.from(previewData.split(',')[1],'base64'));
    }
    const verification={...shortVideo.validation};
    delete verification.decodedFrameContactSheet; // keep metadata bounded
    const check={capture:'Playwright-controlled MediaRecorder from six ACTUAL XR binocular rendered framebuffers',
      type:shortVideo.type,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),
      continuousHandMotion:false,frameSource:'genuine-IWER-app',
      ...verification,
      status:shortVideo.validation?.decoded&&shortVideo.validation.nonblankFrameVerified
        &&shortVideo.validation.distinctStagesVerified
        ?'BROWSER DECODED; INDEPENDENT PIXEL/CLINICAL REVIEW PENDING'
        :'VIDEO VALIDATION FAILED; DO NOT ACCEPT'};
    await writeFile(path.join(vd,'stereo-steps-check.json'),JSON.stringify(check,null,2)+'\n');
    manifest.shortVideo={file:'video/actual-app-stereo-steps.webm',bytes:check.bytes,sha256:check.sha256,
      status:check.status};
  }else manifest.shortVideo={status:'PENDING — browser MediaRecorder unavailable or unusable'};
 }catch(error){manifest.shortVideo={status:'PENDING — recorder error',error:String(error.message)}}
 manifest.passed=true;
 const relativePath='procedure/'+config.id;
 result.procedureEvidence={status:'SIX LOCAL XR IMAGES CAPTURED; VIDEO REVIEW PENDING',
  runId:config.id,relativePath,steps:6,sha:config.sha,pixelDifference:difference};
 await writeFile(path.join(dir,'procedure-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 // Only after all six true XR frames and original manifest pass.
 await writeFile(path.join(dir,'presentation.html'),slidesHTML(manifest),'utf8');
 const storyboard=['# Actual-app KlinikLab XR FDI16 educational procedure',
  '','Source commit: '+config.sha+'; run: '+config.id,
  'Meta IWER Quest2, controlled by scripted Playwright trigger. Not a human dentist, actual patient, clinical validation or physical Quest headset.',
  'Browser video will show sequential true XR framebuffer frames; it is NOT continuous hand-motion recording.',
  '',...manifest.steps.flatMap(x=>[
   '## Step '+x.n+': '+x.label,
   'FDI: '+x.state.fdi+'; saved cuts: '+x.state.cuts+'; XR frame '+x.frame+'; SHA-256 '+x.sha256,
   '![Real app step '+x.n+'](./'+x.file+')','']),
  'Actual stereo changed pixels at RGB L1 >55: '+JSON.stringify(difference.changedPixels),
  'Dental expert review, actual tool-use realism, and physical Quest2 remain pending.'];
 await writeFile(path.join(dir,'storyboard.md'),storyboard.join('\n')+'\n');
 return manifest;
 }catch(error){
  // Preserve the exact partial stereo frame file names/hashes and pose
  // diagnostics; this is a failed job, not a publishable completed storyboard.
  manifest.passed=false;manifest.failure=String(error.stack||error).slice(0,6000);
  manifest.partialSteps=manifest.steps.length;
  result.procedureEvidence={status:'FAILED -- partial local evidence only',
    runId:config.id,sha:config.sha,partialSteps:manifest.steps.length,
    failure:String(error.message||error)};
  await writeFile(path.join(dir,'procedure-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  throw error;
 }finally{
  await page.evaluate(()=>{
    try{window.__xrTestDevice?.controllers?.right?.updateButtonValue('trigger',0)}catch{}
    const recorder=window.__kliniklabProcedureVideo;
    if(recorder){
      try{if(recorder.recorder.state!=='inactive')recorder.recorder.stop()}catch{}
      try{for(const track of recorder.stream.getTracks())track.stop()}catch{}
      delete window.__kliniklabProcedureVideo;
    }
    document.getElementById('__procedure_stereo_frame')?.remove();
    const a=window.kliniklab,lab=a?.volLab,s=a?.scene;
    if(!lab||!s)return;
    try{
      lab.setTooth('16');
      lab.solid.bur.length=0;lab.physics.trace.length=0;
      if(Number.isFinite(window.__procedureOriginalBurRadius))
        lab.burRadius=window.__procedureOriginalBurRadius;
      delete window.__procedureOriginalBurRadius;
      delete window.__kliniklabProcedureTargetModel;
      lab.persistTooth?.();lab.rebuild();
      s.xrPrep?.triggers?.clear();s.xrPrep?.syncCase();s.xrPrep?.updateMesh();
      s.xrFdiEvidence=false;
    }catch(error){window.__procedureCleanupError=String(error.message||error)}
  }).catch(error=>{result.procedureCleanupError=String(error.message)});
 }
}
