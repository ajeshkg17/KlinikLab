export const INTEGRATION_BRANCH='integration/single-chat-validation-2026-10-30';
export const JOB_REF='visual-qa/jobs/xr-current.json';
export const RESULT_BRANCH='visual-feedback';
export const RUN_ID=/^[a-z0-9][a-z0-9_-]{3,63}$/;
export const SHA=/^[a-f0-9]{40}$/;
const KEYS=new Set(['schemaVersion','jobId','commit','suite','graphics','deadlineMs','captures','procedureCapture']);
const VIEWS=['room-table','both-controllers','left-hover','left-pickup','right-pickup','release-return','help-open','help-closed','catalog-open','catalog-closed'];
export function validateXRJob(j){
 if(!j||typeof j!=='object'||Array.isArray(j)||Object.keys(j).some(k=>!KEYS.has(k)))throw Error('Unknown XR job field');
 if(j.schemaVersion!==1||!RUN_ID.test(j.jobId||'')||!SHA.test(j.commit||''))throw Error('Invalid schema, job ID or exact commit');
 if(j.procedureCapture!==undefined&&j.procedureCapture!==true)throw Error('procedureCapture must be true or omitted');
 if(j.procedureCapture===true&&(!j.jobId.startsWith('pc-xr-procedure-')||j.jobId.length>57))throw Error('Procedure capture requires bounded unique pc-xr-procedure-* ID');
 if(j.suite!=='quest2-phase3'||!['default','software'].includes(j.graphics))throw Error('Unknown bounded suite/graphics');
 if(!Number.isInteger(j.deadlineMs)||j.deadlineMs<15000||j.deadlineMs>120000)throw Error('Deadline outside 15–120 seconds');
 if(!Array.isArray(j.captures)||j.captures.length!==10||VIEWS.some((v,i)=>j.captures[i]!==v))throw Error('Phase 4 needs exact ten safe capture checkpoints');
 return Object.freeze({...j,captures:[...j.captures]});
}
export const REQUIRED_CAPTURES=Object.freeze(VIEWS);
