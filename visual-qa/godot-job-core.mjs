/** Dedicated bounded Windows-native Godot FDI16 job. Never execute commands from JSON. */
export const INTEGRATION_BRANCH='integration/single-chat-validation-2026-10-30';
export const RESULT_BRANCH='visual-feedback';
export const JOB_REF='visual-qa/jobs/godot-current.json';
export const EXACT_SOURCE_SHA='f4d4d4151851a08342def08d9f2e461f5f5e7109';
const KEYS=new Set(['sceneMode','schemaVersion','jobId','commit','suite','graphics','timeoutSec','capture','launcherContract','backgroundContract','desktopApiContract','telemetryContract']);
export function validateGodotJob(job){
 if(!job||typeof job!=='object'||Array.isArray(job)||Object.keys(job).some(k=>!KEYS.has(k)))
  throw Error('Unknown Godot job field or non-object');
 if(job.desktopApiContract!=='raw-utf16-createdesktopw-bom-safe-recovery' ||
    job.backgroundContract!=='private-winsta0-vulkan-autocapture-no-foreground' ||
    job.launcherContract!=='winps51-clear-psmodulepath-sha256-preflight')
  throw Error('Invalid private desktop / child PowerShell contract');
 if(job.commit!==EXACT_SOURCE_SHA)throw Error('Original production FDI16 source SHA must remain exact');
 if(job.graphics!=='forward_plus-vulkan')throw Error('Native Vulkan Forward+ required');
 if(!Number.isInteger(job.timeoutSec)||job.timeoutSec<30||job.timeoutSec>180)
  throw Error('Godot timeout must be 30-180 seconds');
 if(job.schemaVersion===5){
  if(job.sceneMode!==undefined || job.telemetryContract!=='persistent-pdh-1hz-dxgi-luid-42s-orbit-v1' ||
   !/^pc-godot-fdi16-[a-z0-9-]{8,50}$/.test(job.jobId||'') ||
   job.suite!=='sr1c-fdi16-before-after' || job.capture!=='native-orbit-frontal-occlusal')
   throw Error('Invalid legacy job05 or older schema');
 }else if(job.schemaVersion===6){
  if(job.telemetryContract!=='persistent-pdh-valid-rows-dxgi-luid-42s-orbit-v2' ||
   !/^pc-godot-clinic-[a-z0-9-]{8,50}$/.test(job.jobId||'') ||
   job.suite!=='sr1c-clinic-workspace-prototype' ||
   job.sceneMode!=='clinic-overview' ||
   job.capture!=='native-clinic-orbit-frontal-occlusal')
   throw Error('Unknown/unapproved native clinic migration mode');
 }else throw Error('Unsupported Godot job schema');
 return Object.freeze({...job});
}
