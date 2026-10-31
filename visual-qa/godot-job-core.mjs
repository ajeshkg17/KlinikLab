/** Dedicated bounded Windows-native Godot FDI16 job. Never execute commands from JSON. */
export const INTEGRATION_BRANCH='integration/single-chat-validation-2026-10-30';
export const RESULT_BRANCH='visual-feedback';
export const JOB_REF='visual-qa/jobs/godot-current.json';
export const EXACT_SOURCE_SHA='f4d4d4151851a08342def08d9f2e461f5f5e7109';
const KEYS=new Set(['schemaVersion','jobId','commit','suite','graphics','timeoutSec','capture','launcherContract']);
export function validateGodotJob(job){
 if(!job||typeof job!=='object'||Array.isArray(job)||Object.keys(job).some(k=>!KEYS.has(k)))throw Error('Unknown Godot job field or non-object');
 if(job.schemaVersion!==2 || job.launcherContract!=='winps51-clear-psmodulepath-sha256-preflight' || !/^pc-godot-fdi16-[a-z0-9-]{8,50}$/.test(job.jobId||''))throw Error('Invalid bounded Godot job id');
 if(job.commit!==EXACT_SOURCE_SHA)throw Error('Godot job must pin the user-approved exact functional source SHA');
 if(job.suite!=='sr1c-fdi16-before-after'||job.graphics!=='forward_plus-vulkan'||job.capture!=='native-f12-before-after')throw Error('Unknown non-allowlisted Godot suite/graphics/capture');
 if(!Number.isInteger(job.timeoutSec)||job.timeoutSec<30||job.timeoutSec>180)throw Error('Godot timeout must be 30-180 seconds');
 return Object.freeze({...job});
}
