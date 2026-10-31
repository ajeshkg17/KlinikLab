// Actual-app FDI16 educational procedure: opt-in only, never an AI-generated frame.
// Executed in the current Meta IWER Quest2 Playwright session and existing
// fresh two-eye XR framebuffer captureXR path. Not real patient/clinician care.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

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
 const state=()=>page.evaluate(()=>{
  const app=window.kliniklab,s=app.scene,p=s.xrPrep,lab=app.volLab;
  return {fdi:String(lab.fdiTooth),cuts:lab.solid.bur.length,revision:lab.revision,
    triangles:p.visibleTriangles,active:p.active,xrFrames:s.xrVisualDiagnostics.frames,
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
 // Isolated browser profile: never use patient data or a signed-in browser.
 await page.evaluate(()=>{
  const app=window.kliniklab,s=app.scene,lab=app.volLab;
  if(!s.xrSession||!lab.setTooth('16')||lab.solid.bur.length)throw Error('FDI16 clean XR fixture unavailable');
  s.setXRCatalogOpen(false);s.xrGuide?.close?.();
  if(!s.xrPrep.active)s.xrPrep.toggle();
  s.xrPrep.syncCase();s.xrPrep.updateMesh();s.xrPrep.syncModalVisibility();
  s.xrFdiEvidence=false;
 });
 await take(0);
 await page.evaluate(()=>{window.kliniklab.scene.xrFdiEvidence=true});
 const before=await take(1);
 const aim=await page.evaluate(()=>{
  const app=window.kliniklab,lab=app.volLab,p=app.xrPrep;
  const local=[.08,lab.solid.height(.08,-.08)+.02,-.08];
  const world=p.modelToWorld(local),origin=[world[0],world[1]+.36,world[2]];
  const c=window.__xrTestDevice.controllers.right;
  c.connected=true;c.position.set(...origin);
  c.quaternion.set(-Math.SQRT1_2,0,0,Math.SQRT1_2);
  app.scene.xrFdiEvidence=false;
  return {local,world,origin};
 });
 manifest.aim=aim;
 await page.waitForFunction(()=>{
  const sc=window.kliniklab.scene,frame=sc.latestFrame;
  const source=[...(frame?.session?.inputSources||[])].find(s=>s.handedness==='right');
  const ray=source&&sc.xrPrep.rayForFrame(frame,source);
  return !!ray&&!!sc.xrPrep.traceSurface(ray.o,ray.d);
 },null,{timeout:18000});
 await take(2);
 const prior=await state();
 await page.evaluate(()=>window.__xrTestDevice.controllers.right.updateButtonValue('trigger',1));
 await page.waitForFunction(previous=>{
  const app=window.kliniklab;
  return app.volLab.solid.bur.length>previous.cuts&&app.xrPrep.cutCount>0;
 },prior,{timeout:18000,polling:50});
 await page.evaluate(()=>window.__xrTestDevice.controllers.right.updateButtonValue('trigger',0));
 await page.waitForFunction(()=>window.kliniklab.xrPrep.triggers.size===0,null,{timeout:18000});
 await page.evaluate(()=>{const a=window.kliniklab;a.scene.xrFdiEvidence=true;a.xrPrep.updateMesh()});
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
 manifest.passed=true;
 const relativePath='procedure/'+config.id;
 result.procedureEvidence={status:'SIX LOCAL XR IMAGES CAPTURED; VIDEO REVIEW PENDING',
  runId:config.id,relativePath,steps:6,sha:config.sha,pixelDifference:difference};
 await writeFile(path.join(dir,'procedure-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
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
 // Preserve existing Phase7 baseline invariants by cleaning this isolated fixture.
 await page.evaluate(()=>{
  const a=window.kliniklab,lab=a.volLab,s=a.scene;
  lab.setTooth('16');lab.solid.bur.length=0;lab.physics.trace.length=0;
  lab.persistTooth?.();lab.rebuild();s.xrPrep.syncCase();s.xrPrep.updateMesh();
  s.xrFdiEvidence=false;document.getElementById('__procedure_stereo_frame')?.remove();
 });
 return manifest;
}
