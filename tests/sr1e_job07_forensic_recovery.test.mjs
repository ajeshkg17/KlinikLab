
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectJob07,JOB07_DIR,JOB07_SOURCE} from '../visual-qa/godot-job07-forensics.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const end=Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130]);
const png=()=>{
 const buf=Buffer.alloc(16000);
 Buffer.from([137,80,78,71,13,10,26,10]).copy(buf,0);
 buf.writeUInt32BE(13,8);
 buf.write('IHDR',12);
 buf.writeUInt32BE(1600,16);buf.writeUInt32BE(900,20);
 end.copy(buf,buf.length-12);
 return buf;
};
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'kl-job07-forensic-'));
 const run=path.join(root,'godot-evidence',JOB07_DIR);
 const capture=path.join(run,'Captures');
 await fs.mkdir(capture,{recursive:true});
 const j=async(p,value)=>fs.writeFile(p,JSON.stringify(value));
 await j(path.join(run,'godot-source-prepare.json'),{sourceGitSHA:JOB07_SOURCE,status:'SOURCE_EXPORTED_GODOT_PROJECT_READY_NOT_RENDERED'});
 await j(path.join(run,'godot-native-cases-prepare.json'),{sourceGitSHA:JOB07_SOURCE,cases:6,stations:7,fullKlinikLabApplicationMigrated:false});
 await j(path.join(capture,'native-source-submission.json'),{sourceGitSHA:JOB07_SOURCE,status:'NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU',states:{before:{submittedTriangles:14856},after:{submittedTriangles:14936}}});
 await j(path.join(capture,'godot-native-workflow-state.json'),{valid:true,caseCount:6,stationCount:7,selectedCaseId:'endo',selectedFDI:'36',selectedStationId:'practical',originalFDI16GeometryAvailable:false,fullKlinikLabApplicationMigrated:false,originalCaseSpecificSimulationImplemented:false,caseStationEvents:[{type:'case'},{type:'case'}]});
 const first='godot-native-fdi16-frontal-123.png',angled='godot-native-fdi16-occlusal-456.png';
 const b1=png(),b2=png();b2[55]=42;
 await fs.writeFile(path.join(capture,first),b1);
 await fs.writeFile(path.join(capture,angled),b2);
 const original={status:'BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW',nativeSceneMode:'clinic-cases',fullKlinikLabApplicationMigrated:false,renderingMethod:'forward_plus',renderingDriver:'vulkan',videoAdapterName:'NVIDIA GeForce RTX 5060 Laptop GPU',videoAdapterVendor:'NVIDIA',headlessUsed:false,userDesktopActivationRequested:false,orbitDurationSeconds:42.005,imageFile:first,angledImageFile:angled,imageSHA256:sha(b1),angledImageSHA256:sha(b2)};
 await j(path.join(capture,'godot-background-capture.json'),original);
 return {root,capture,first,angled,j,original};
}
test('archivable job07 exact PNG hashes, source geometry, native case change: no owner GPU proof invented',async()=>{
 const f=await fixture();
 try{
  const out=await inspectJob07(f.root);
  assert.equal(out.images.length,2);
  assert.equal(out.nativeCaseWorkflowVerified,true);
  assert.equal(out.originalProcessGpuPDHEvidencePresent,false);
  assert.equal(out.independentGpuPidLuidAccepted,false);
  assert.equal(out.fullKlinikLabApplicationMigrated,false);
  assert.equal(out.status,'FORENSIC_RAW_NATIVE_IMAGES_VALIDATED_GPU_UNATTRIBUTED');
  assert.equal(await fs.stat(path.join(f.capture,f.first)).then(s=>s.size),16000);
 }finally{await fs.rm(f.root,{recursive:true,force:true})}
});
test('mismatched original image bytes refuse publication-only archival',async()=>{
 const f=await fixture();
 try{
  const bytes=await fs.readFile(path.join(f.capture,f.first));bytes[64]^=1;
  await fs.writeFile(path.join(f.capture,f.first),bytes);
  await assert.rejects(inspectJob07(f.root),/SHA256 differs/);
 }finally{await fs.rm(f.root,{recursive:true,force:true})}
});
test('do not overwrite an original owner report or prior job result',async()=>{
 const f=await fixture();
 try{
  await fs.writeFile(path.join(f.capture,'godot-owner-pc-result.json'),'{"existing":true}');
  await assert.rejects(inspectJob07(f.root),/must not overwrite/);
 }finally{await fs.rm(f.root,{recursive:true,force:true})}
});
test('reject wrong actual workflow FDI even if original 2 PNGs are present',async()=>{
 const f=await fixture();
 try{
  const statePath=path.join(f.capture,'godot-native-workflow-state.json');
  const d=JSON.parse(await fs.readFile(statePath,'utf8'));d.selectedFDI='16';
  await f.j(statePath,d);
  await assert.rejects(inspectJob07(f.root),/transition parity/);
 }finally{await fs.rm(f.root,{recursive:true,force:true})}
});
test('forensics and publication-only branch never rerender the interrupted ID',async()=>{
 const worker=await fs.readFile(new URL('../visual-qa/godot-worker.mjs',import.meta.url),'utf8');
 const installer=await fs.readFile(new URL('../visual-qa/install-godot-pc-watcher.ps1',import.meta.url),'utf8');
 const body=worker.slice(worker.indexOf('async function recoverRawJob07('),worker.indexOf('let busy=false;'));
 assert(body.includes('const original=await inspectJob07(ROOT)'));
 assert(body.includes('publish(j,target,workerResult)'));
 assert(body.includes('gpuProcessCorroborated:false'));
 assert(body.includes('reexecuted:false'));
 assert(!body.includes('await execute(')&&!body.includes('await powershell('));
 assert(!body.includes('worktree add'));
 assert(installer.includes('-RedirectStandardOutput'));
 assert(installer.includes('-RedirectStandardError'));
 assert(!installer.includes('2>&1 | ForEach-Object'));
});
