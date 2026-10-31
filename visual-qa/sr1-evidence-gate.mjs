/**
 * SR1 UE5 Pixel Streaming 2 VR evidence-integrity gate (offline only).
 * This validates *claims and local artifact bytes*, not device provenance,
 * observed physical Quest 2 use, comfort, UE rendering or real network latency.
 * Never emits automatic hardware or deployment approval.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const SHA=/^[0-9a-f]{40}$/i;
const HASH=/^[0-9a-f]{64}$/i;
const REQUIRED=Object.freeze([
 'preflight','gpuTrace','leftEye','rightEye','poseInputLog',
 'decodedStreamTrace','videoStats','questCapabilities',
 'latencyPercentiles','securityChecklist'
]);
const CHECKS=Object.freeze([
 'hardwareGate','secureTransportGate','stereoGate','interactionGate',
 'latencyGate','qualityGate','physicalHeadsetGate'
]);
const plausible=x=>typeof x==='string'&&x.trim().length>0;
const positive=x=>Number.isFinite(x)&&x>0;
const nonnegative=x=>Number.isFinite(x)&&x>=0;
function safeRelative(s){
 if(!plausible(s)||s.includes('\\')||s.includes('\0')||path.posix.isAbsolute(s))return false;
 const items=s.split('/');
 return items.length<=8&&items.every(x=>x.length>0&&x!=='.'&&x!=='..'&&/^[a-zA-Z0-9_.-]+$/.test(x));
}
const digest=buf=>createHash('sha256').update(buf).digest('hex');

export async function checkSR1Evidence(manifest,{readArtifact}={}){
 const failures=[],checks=[];
 const bad=message=>failures.push(message);
 const a=manifest&&typeof manifest==='object'?manifest:{};
 const status=a.status||'NOT_RUN';
 if(a.schemaVersion!==1||a.kind!=='SR1 UE5 Pixel Streaming 2 VR Quest 2 physical feasibility')
  bad('Not an SR1 UE5 PS2 VR evidence manifest');
 if(status==='NOT_RUN'){
  return {result:failures.length?'BLOCKED':'NOT_RUN',validatedLocalHashes:0,
   failures:[...failures,'No physical workstation/UE/Quest run has been recorded'],
   physicalQuestValidatedByTool:false,serverRenderingValidatedByTool:false,
   humanApprovalGranted:false};
 }
 if(status!=='CAPTURED')bad('Manifest status must be CAPTURED (or NOT_RUN)');
 if(a.engine?.name!=='Unreal Engine 5'||a.engine?.pixelStreamingPlugin!=='Pixel Streaming 2'||
   a.engine.experimentalVR!==true||!plausible(a.engine.version)||!plausible(a.engine.build)||
   !plausible(a.engine.infrastructureRef))bad('Pinned UE build, experimental VR and matching infrastructure reference required');
 const g=a.server||{};
 if(!SHA.test(g.sourceCommit||'')||!plausible(g.gpuModel)||!positive(g.vramMiB)||
   !plausible(g.driver)||g.encoder!=='hardware H.264'||g.hardwareEncodeVerified!==true||
   g.softwareFallbackAllowed!==false||g.qualityFallbackAllowed!==false||
   g.qualityTier!=='high/detail required')bad('Dedicated GPU, real hardware encoder and no quality/software fallbacks required');
 if(!plausible(g.gpuProcessTrace))bad('No process-specific server GPU trace');
 const n=a.network||{},h=a.headset||{},p=a.performance||{};
 if(n.sharedRouter!=='Wi-Fi 7 router'||!plausible(n.questNegotiatedLink)||
   n.securityVerified!==true||!plausible(n.icePath)||!nonnegative(n.rttMs)||
   !nonnegative(n.jitterMs)||!nonnegative(n.packetLossPercent)||
   n.packetLossPercent>100)bad('Real Quest negotiated link, secure transport and measured LAN stats required');
 if(h.model!=='Meta Quest 2'||!plausible(h.browserVersion)||!plausible(h.firmwareVersion)||
   h.webxrMediaLayerVerified!==true||h.realStereo6DoFVerified!==true||
   h.handednessCorrect!==true||h.controllerRoundTripVerified!==true||
   h.videoDecoderHardwareVerified!==true)
   bad('Physical Quest 2 browser, correct 6DoF stereo, controls and hardware decode unverified');
 if(!plausible(p.sourceResolution)||!plausible(p.decodedResolution)||
   !positive(p.displayRefreshHz)||!nonnegative(p.p50PoseToDisplayMs)||
   !nonnegative(p.p95PoseToDisplayMs)||!nonnegative(p.p99PoseToDisplayMs)||
   p.p50PoseToDisplayMs>p.p95PoseToDisplayMs||p.p95PoseToDisplayMs>p.p99PoseToDisplayMs||
   !nonnegative(p.staleFramePercent)||p.staleFramePercent>100||
   p.tenMinuteSessionPassed!==true)
   bad('Missing, non-monotonic, or incomplete Quest performance/hardware measurements');
 if(nonnegative(p.p95PoseToDisplayMs)&&p.p95PoseToDisplayMs>=50)
  bad('Provisional p95 pose-to-display target <50 ms not met; review agreed target before GO');
 if(nonnegative(p.staleFramePercent)&&p.staleFramePercent>=1)
  bad('Provisional stale frame threshold <1% not met');
 const flags=a.acceptance||{};
 for(const key of CHECKS)if(flags[key]!==true)bad('Missing real-run acceptance observation: '+key);
 if(flags.decision==='GO')bad('Automated evidence validation cannot authorize GO/deployment; human decision must be separate');
 if(flags.decision!=='NOT_ASSESSED'&&flags.decision!=='NO_GO'&&flags.decision!=='GO')
  bad('Unrecognized acceptance decision');
 const review=a.review||{};
 if(!plausible(review.operatorName)||!plausible(review.reviewDate)||
   review.physicalQuestWitnessed!==true||review.reviewedSourceHashes!==true||
   !plausible(review.comfortObservations))
  bad('Named physical Quest test operator, date, file review and comfort notes required');
 const evidence=a.evidence||{};
 const requiredFields={...Object.fromEntries(REQUIRED.map(k=>[k,evidence[k]])),
   sha256Manifest:evidence.sha256Manifest};
 const entries=Object.entries(requiredFields);
 const unique=new Set();
 for(const [key,value] of entries){
  if(!safeRelative(value))bad('Missing or unsafe evidence path: '+key);
  else if(unique.has(value))bad('Evidence file path reused: '+key);
  else unique.add(value);
 }
 let validatedLocalHashes=0;
 if(typeof readArtifact==='function'&&entries.every(([,v])=>safeRelative(v))&&
    unique.size===entries.length){
  try{
   const hashBytes=await readArtifact(evidence.sha256Manifest);
   if(!hashBytes||hashBytes.length>1024*1024)throw Error('Bad hash manifest size');
   const hashes=JSON.parse(Buffer.from(hashBytes).toString('utf8'));
   if(hashes?.schemaVersion!==1||typeof hashes.files!=='object'||Array.isArray(hashes.files))
    throw Error('Invalid SHA-256 manifest schema');
   const retained={};
   for(const [key,rel] of entries){
    if(key==='sha256Manifest')continue; // self-hash cannot authenticate itself
    const expected=hashes.files[rel];
    if(!HASH.test(expected||'')){bad('Invalid/missing SHA-256: '+rel);continue}
    try{
     const bytes=await readArtifact(rel);
     if(!bytes||bytes.length<16)throw Error('Missing or empty artifact');
     if(digest(bytes).toLowerCase()!==expected.toLowerCase())
      throw Error('File content SHA-256 mismatch');
     if((key==='leftEye'||key==='rightEye')&&
       !(Buffer.from(bytes).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))))
      throw Error('Not an original PNG signature');
     retained[key]=Buffer.from(bytes);
     validatedLocalHashes++;
    }catch(error){bad('Unverified '+key+': '+error.message)}
   }
   // A checked byte hash does not prove the GPU/encoder or its source. The
   // hardware gate must at least be internally consistent with the exact
   // machine-preflight JSON and source revision, rather than arbitrary text.
   if(retained.preflight){
    try{
     const pf=JSON.parse(retained.preflight.toString('utf8'));
     if(pf.passed!==true||pf.sourceCommit?.toLowerCase()!==g.sourceCommit?.toLowerCase()||
       pf.gpu?.name!==g.gpuModel||pf.gpu?.vramMiB!==g.vramMiB||
       pf.gpu?.driver!==g.driver||pf.gpu?.vendor!=='NVIDIA'||
       pf.gpu?.dedicatedHardwareRequired!==true||
       pf.encoder?.name!=='h264_nvenc'||pf.encoder.actualEncodeSucceeded!==true||
       pf.encoder.deviceIndex!==pf.gpu.index||
       pf.lowQualityFallbackAvailable!==false||pf.softwareEncoderFallbackAvailable!==false)
      throw Error('Dedicated GPU/NVENC preflight does not match the exact source and server manifest');
    }catch(error){bad('Inconsistent preflight.json: '+error.message)}
   }
   if(retained.leftEye&&retained.rightEye&&
     digest(retained.leftEye)===digest(retained.rightEye))
    bad('Left/right evidence PNGs are identical; binocular perspective is not demonstrated');
   // This is a structural consistency check, not a source authenticity check.
   if(validatedLocalHashes!==REQUIRED.length)bad('Not all required evidence files matched hashes');
  }catch(error){bad('Cannot verify evidence hash manifest: '+error.message)}
 }else bad('Evidence paths/reader missing; refusing automatic hardware success');
 return {result:failures.length?'BLOCKED':'READY_FOR_PHYSICAL_HUMAN_REVIEW',
  validatedLocalHashes,requiredHashes:REQUIRED.length,failures,
  checks,physicalQuestValidatedByTool:false,serverRenderingValidatedByTool:false,
  humanApprovalGranted:false,
  note:'A valid file/hash bundle can be fabricated: only a real witnessed Quest test and separate human decision can authorize any GO.'};
}
async function cli(){
 const [file,dir]=process.argv.slice(2);
 if(!file||!dir)throw Error('Usage: node visual-qa/sr1-evidence-gate.mjs <run-manifest.json> <local-evidence-dir>');
 const m=JSON.parse(await readFile(file));
 const base=path.resolve(dir);
 const report=await checkSR1Evidence(m,{readArtifact:relative=>readFile(path.join(base,relative))});
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(report.result!=='READY_FOR_PHYSICAL_HUMAN_REVIEW')process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 cli().catch(e=>{process.stderr.write('SR1 evidence gate: '+e.message+'\n');process.exitCode=2});
