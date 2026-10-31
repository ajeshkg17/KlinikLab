import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {checkSR1Evidence} from '../visual-qa/sr1-evidence-gate.mjs';
const source=JSON.parse(await readFile(new URL('../visual-qa/SR1_PROTOTYPE_RESULT_TEMPLATE.json',import.meta.url),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=b=>createHash('sha256').update(b).digest('hex');
const required=['preflight','gpuTrace','leftEye','rightEye','poseInputLog',
 'decodedStreamTrace','videoStats','questCapabilities','latencyPercentiles','securityChecklist'];
function fabricatedFixture(){
 const m=clone(source);m.status='CAPTURED';
 Object.assign(m.engine,{version:'5.8.0',build:'mock-UE-build',infrastructureRef:'mock-tag-5.8'});
 Object.assign(m.server,{sourceCommit:'a'.repeat(40),gpuModel:'NVIDIA TEST GPU',
  vramMiB:16384,driver:'fake-driver',gpuProcessTrace:'gpu.txt',hardwareEncodeVerified:true});
 Object.assign(m.network,{questNegotiatedLink:'mock-wifi-link',securityVerified:true,
  icePath:'mock-lan',rttMs:5,jitterMs:1,packetLossPercent:.2});
 Object.assign(m.headset,{browserVersion:'mock',firmwareVersion:'mock',
  webxrMediaLayerVerified:true,realStereo6DoFVerified:true,handednessCorrect:true,
  controllerRoundTripVerified:true,videoDecoderHardwareVerified:true});
 Object.assign(m.performance,{sourceResolution:'2048x2048/eye',decodedResolution:'2048x2048/eye',
  displayRefreshHz:72,p50PoseToDisplayMs:20,p95PoseToDisplayMs:35,
  p99PoseToDisplayMs:48,staleFramePercent:.2,tenMinuteSessionPassed:true});
 for(const key of ['hardwareGate','secureTransportGate','stereoGate',
  'interactionGate','latencyGate','qualityGate','physicalHeadsetGate'])
  m.acceptance[key]=true;
 m.review={operatorName:'SIMULATED TEST OPERATOR',reviewDate:'2026-10-31',
  physicalQuestWitnessed:true,reviewedSourceHashes:true,
  comfortObservations:'MOCK fixture only: not a real Quest run'};
 const files={};
 for(const name of required){
  const rel=name==='leftEye'?'left.png':name==='rightEye'?'right.png':name+'.txt';
  m.evidence[name]=rel;
  files[rel]=(name==='leftEye'||name==='rightEye')?
   Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24,8)]):
   Buffer.from('SIMULATED ONLY artifact '+name+' - not real hardware');
 }
 m.evidence.sha256Manifest='sha256-manifest.json';
 files['sha256-manifest.json']=Buffer.from(JSON.stringify({
  schemaVersion:1,files:Object.fromEntries(Object.entries(files).map(([p,b])=>[p,sha(b)]))
 }));
 return {m,files,reader:async p=>{if(!(p in files))throw Error('missing mock file '+p);return files[p]}};
}
test('Untouched prototype template is definitively NOT_RUN; no local artifact needed',async()=>{
 const r=await checkSR1Evidence(source);
 assert.equal(r.result,'NOT_RUN');
 assert.equal(r.humanApprovalGranted,false);
 assert.equal(r.serverRenderingValidatedByTool,false);
});
test('Even consistent fictional evidence only permits HUMAN review, never automatic hardware GO',async()=>{
 const {m,reader}=fabricatedFixture();
 const r=await checkSR1Evidence(m,{readArtifact:reader});
 assert.equal(r.result,'READY_FOR_PHYSICAL_HUMAN_REVIEW');
 assert.equal(r.validatedLocalHashes,10);
 assert.equal(r.humanApprovalGranted,false);
 assert.equal(r.physicalQuestValidatedByTool,false);
});
test('Evidence tampering, missing bytes and incorrect PNG signatures fail closed',async()=>{
 const base=fabricatedFixture();
 for(const change of [
  x=>{x.files['right.png']=Buffer.from('wrong png content but longer than 16')},
  x=>{delete x.files['left.png']},
  x=>{x.m.evidence.videoStats='../secrets.txt'},
  x=>{x.m.evidence.gpuTrace='left.png'}
 ]){
  const x=fabricatedFixture();change(x);
  const r=await checkSR1Evidence(x.m,{readArtifact:x.reader});
  assert.equal(r.result,'BLOCKED',JSON.stringify(r));
 }
});
test('No CPU, integrated graphics, low-quality, or unverified GPU encoder claims admitted',async()=>{
 for(const edit of [
  m=>m.server.softwareFallbackAllowed=true,
  m=>m.server.qualityFallbackAllowed=true,
  m=>m.server.hardwareEncodeVerified=false,
  m=>m.server.gpuModel=null,
  m=>m.server.encoder='libx264',
  m=>m.server.vramMiB=0,
  m=>m.acceptance.decision='GO'
 ]){
  const x=fabricatedFixture();edit(x.m);
  const r=await checkSR1Evidence(x.m,{readArtifact:x.reader});
  assert.equal(r.result,'BLOCKED');
 }
});
test('Unreal, stereo, transport, Quest witness and measured p95 remain separate prerequisites',async()=>{
 for(const edit of [
  m=>m.engine.infrastructureRef=null,
  m=>m.headset.realStereo6DoFVerified=false,
  m=>m.headset.controllerRoundTripVerified=false,
  m=>m.network.securityVerified=false,
  m=>m.performance.p95PoseToDisplayMs=55,
  m=>m.performance.p99PoseToDisplayMs=25,
  m=>m.performance.tenMinuteSessionPassed=false,
  m=>m.review.physicalQuestWitnessed=false
 ]){
  const x=fabricatedFixture();edit(x.m);
  const r=await checkSR1Evidence(x.m,{readArtifact:x.reader});
  assert.equal(r.result,'BLOCKED');
 }
});
