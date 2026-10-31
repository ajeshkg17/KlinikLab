/** Dedicated bounded Windows-native Godot FDI16 job. Never execute commands from JSON. */
export const INTEGRATION_BRANCH='integration/single-chat-validation-2026-10-30';
export const RESULT_BRANCH='visual-feedback';
export const JOB_REF='visual-qa/jobs/godot-current.json';
export const EXACT_SOURCE_SHA='f4d4d4151851a08342def08d9f2e461f5f5e7109';
const KEYS=new Set(['schemaVersion','jobId','commit','suite','graphics','timeoutSec','capture','launcherContract','backgroundContract','desktopApiContract','telemetryContract']);
export function validateGodotJob(job){
 if(!job||typeof job!=='object'||Array.isArray(job)||Object.keys(job).some(k=>!KEYS.has(k)))throw Error('Unknown Godot job field or non-object');
 if(job.schemaVersion!==5 || job.telemetryContract!=='persistent-pdh-1hz-dxgi-luid-42s-orbit-v1' || job.desktopApiContract!=='raw-utf16-createdesktopw-bom-safe-recovery' || job.backgroundContract!=='private-winsta0-vulkan-autocapture-no-foreground' || job.launcherContract!=='winps51-clear-psmodulepath-sha256-preflight' || !/^pc-godot-fdi16-[a-z0-9-]{8,50}$/.test(job.jobId||''))throw Error('Invalid bounded Godot job id');
 if(job.commit!==EXACT_SOURCE_SHA)throw Error('Godot job must pin the user-approved exact functional source SHA');
 if(job.suite!=='sr1c-fdi16-before-after'||job.graphics!=='forward_plus-vulkan'||job.capture!=='native-orbit-frontal-occlusal')throw Error('Unknown non-allowlisted Godot suite/graphics/capture');
 if(!Number.isInteger(job.timeoutSec)||job.timeoutSec<30||job.timeoutSec>180)throw Error('Godot timeout must be 30-180 seconds');
 return Object.freeze({...job});
}
