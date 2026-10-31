/** Read-only validation of immutable, interrupted job07 owner-PC original bytes.
 * No Godot, PowerShell, GPU query, screenshot synthesis, or file writes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseGodotJson} from './godot-json.mjs';

export const JOB07_ID='pc-godot-clinic-20261101-job07';
export const JOB07_SOURCE='f4d4d4151851a08342def08d9f2e461f5f5e7109';
export const JOB07_WORKER='c3f2f71a1f6e2d48fc1a7144ea023b6e13863ebf';
export const JOB07_DIR=JOB07_ID+'-'+JOB07_SOURCE.slice(0,10);
const pngMagic=Buffer.from([137,80,78,71,13,10,26,10]);
const digest=b=>createHash('sha256').update(b).digest('hex');
async function json(file){
 return parseGodotJson(await fs.readFile(file,'utf8'),path.basename(file));
}
async function maybeFile(file){
 try{return await fs.readFile(file)}catch(e){if(e.code==='ENOENT')return null;throw e}
}
function ensure(cond,message){
 if(!cond)throw Error('JOB07_FORENSIC_GATE: '+message);
}
function checkPng(bytes,expectedHash,expectedW,expectedH,name){
 ensure(bytes&&bytes.length>10_000,name+' original bytes absent/undersized');
 ensure(bytes.subarray(0,8).equals(pngMagic),name+' original PNG signature invalid');
 ensure(bytes.toString('ascii',12,16)==='IHDR',name+' no IHDR');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 ensure(width===expectedW && height===expectedH,name+' dimensions invalid '+width+'x'+height);
 const hash=digest(bytes);
 ensure(hash===String(expectedHash).toLowerCase(),name+' SHA256 differs from native Godot capture report');
 return {name,sha256:hash,bytes:bytes.length,width,height};
}
export async function inspectJob07(root){
 const run=path.join(root,'godot-evidence',JOB07_DIR);
 const capturePath=path.join(run,'Captures');
 const [source,caseReport,original,workflow,submission]=await Promise.all([
  json(path.join(run,'godot-source-prepare.json')),
  json(path.join(run,'godot-native-cases-prepare.json')),
  json(path.join(capturePath,'godot-background-capture.json')),
  json(path.join(capturePath,'godot-native-workflow-state.json')),
  json(path.join(capturePath,'native-source-submission.json'))
 ]);
 ensure(source.sourceGitSHA===JOB07_SOURCE &&
  source.status==='SOURCE_EXPORTED_GODOT_PROJECT_READY_NOT_RENDERED','source prep SHA/status');
 ensure(caseReport.sourceGitSHA===JOB07_SOURCE &&
  caseReport.cases===6 && caseReport.stations===7 &&
  caseReport.fullKlinikLabApplicationMigrated===false,'source case/station preparation');
 ensure(submission.sourceGitSHA===JOB07_SOURCE &&
  submission.status==='NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU','native original submission provenance');
 ensure(Number(submission.states?.before?.submittedTriangles)===14856 &&
  Number(submission.states?.after?.submittedTriangles)===14936,'five-tissue FDI16 original triangle parity');
 ensure(original.status==='BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW' &&
  original.nativeSceneMode==='clinic-cases' &&
  original.fullKlinikLabApplicationMigrated===false,'native source scene/migration disclosure');
 ensure(original.renderingMethod==='forward_plus' && original.renderingDriver==='vulkan' &&
  /RTX\\s*5060/i.test(String(original.videoAdapterName)) &&
  /NVIDIA/i.test(String(original.videoAdapterVendor)),'original Godot Vulkan GPU self-report');
 ensure(original.headlessUsed===false && original.userDesktopActivationRequested===false,
  'capture must remain private desktop without headless or foreground switch');
 ensure(Number(original.orbitDurationSeconds)>=40 && Number(original.orbitDurationSeconds)<=45,
  'original 40-45s native orbit completion');
 ensure(workflow.valid===true && workflow.caseCount===6 && workflow.stationCount===7 &&
  workflow.selectedCaseId==='endo' && String(workflow.selectedFDI)==='36' &&
  workflow.selectedStationId==='practical' &&
  workflow.originalFDI16GeometryAvailable===false &&
  workflow.fullKlinikLabApplicationMigrated===false &&
  workflow.originalCaseSpecificSimulationImplemented===false &&
  Array.isArray(workflow.caseStationEvents) && workflow.caseStationEvents.filter(e=>e.type==='case').length>=2,
  'no original case/station transition parity');
 const first=String(original.imageFile||'');
 const angled=String(original.angledImageFile||'');
 ensure(/^godot-native-fdi16-frontal-[0-9]+\\.png$/.test(first),'frontal filename not original/allowlisted');
 ensure(/^godot-native-fdi16-occlusal-[0-9]+\\.png$/.test(angled),'occlusal filename not original/allowlisted');
 const [b1,b2]=await Promise.all([fs.readFile(path.join(capturePath,first)),fs.readFile(path.join(capturePath,angled))]);
 const images=[
  checkPng(b1,original.imageSHA256,1600,900,first),
  checkPng(b2,original.angledImageSHA256,1600,900,angled)
 ];
 const owner=await maybeFile(path.join(capturePath,'godot-owner-pc-result.json'));
 const job=await maybeFile(path.join(capturePath,'godot-job-result.json'));
 ensure(!owner && !job,'existing owner/job JSON found: forensic recovery must not overwrite it');
 const extras=['godot-gpu-3d-counters.json','godot-gpu-pdh-diagnostics.json','godot-native-background.log',
  'godot-native-stdout.log','godot-native-stderr.log'];
 const files={};
 for(const name of extras){
  const bytes=await maybeFile(path.join(capturePath,name));
  files[name]=bytes?{sha256:digest(bytes),bytes:bytes.length}:null;
 }
 const originalReport=await fs.readFile(path.join(capturePath,'godot-background-capture.json'));
 const workflowBytes=await fs.readFile(path.join(capturePath,'godot-native-workflow-state.json'));
 return {
  jobId:JOB07_ID,sourceGitSHA:JOB07_SOURCE,actualWorkerSHA:JOB07_WORKER,
  originalOwnerPCResultPresent:false,originalWorkerResultPresent:false,
  allRawFilesPreserved:true,sourceMeshVerified:true,workflowSourceVerified:true,
  nativeCaseWorkflowVerified:true,originalNativeImagesVerified:true,images,
  originalBackgroundSHA256:digest(originalReport),originalWorkflowSHA256:digest(workflowBytes),
  rawFiles:files,originalProcessGpuPDHEvidencePresent:!!files['godot-gpu-3d-counters.json'],
  nativeRendererSelfReportedRtx5060:true,
  independentGpuPidLuidAccepted:false,independentPixelReviewed:false,
  fullKlinikLabApplicationMigrated:false,
  status:'FORENSIC_RAW_NATIVE_IMAGES_VALIDATED_GPU_UNATTRIBUTED'
 };
}
