/**
 * SR27: OFFLINE, READ-ONLY reconciliation of consumed job12/job13.
 * No network, git fetch, job admission, watcher launch, ledger/lease/file write.
 * Published anchors below were independently read from visual-feedback; these
 * do NOT replace GitHub publication re-verification or authorize ledger repair.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const PUBLISHED_ANCHORS=Object.freeze([
 {key:'job12',jobId:'pc-godot-exported-20261101-cc0-job12-approved-678f92',
  source:'678f92e28dd3a1e1bb98c4d94e58028eefa5d9ec',
  worker:'033fb0520212fe696df02bf2a0c5aca12ad3e848',
  images:{
   'kliniklab-exported-cc0-environment.png':'727e59e4fefe2218a2049351bd102219eca0cc6e8dea9a4766fd98f14a794c27',
   'kliniklab-exported-fdi36-practical.png':'ebc470d22e89389ecf62abb29a24b8a012876d5c978ce7c2bf1963e704812d9d'}},
 {key:'job13',jobId:'pc-godot-exported-20261101-cc0-job13-6a077f',
  source:'6a077fc8781d9b51ea34a751986a0187cd163764',
  worker:'033fb0520212fe696df02bf2a0c5aca12ad3e848',
  images:{
   'kliniklab-exported-cc0-environment.png':'ca293976cd82d9d5d5c8896f613d26ecee52c604171ffd6ef94f5a5ccd1fc29b',
   'kliniklab-exported-fdi36-practical.png':'992ae15501235f9c77e55e83061080b865cc3c9fb69d9b127f3cd85879b9e301'}}
]);
const allowedFiles=['godot-job-result.json','godot-owner-pc-result.json','native-exported-app-result.json'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function loadJson(file){
 const bytes=await fs.readFile(file);
 return JSON.parse(bytes.toString('utf8'));
}
const safeError=e=>e?.code==='ENOENT'?'MISSING':e?.name==='SyntaxError'?'INVALID_JSON':'UNREADABLE';
async function one(root,ledger,anchor){
 const run=path.join(root,'godot-evidence',anchor.jobId+'-'+anchor.source.slice(0,10));
 const capture=path.join(run,'Captures');
 const detail={
  key:anchor.key,jobId:anchor.jobId,sourceGitSHA:anchor.source,workerGitSHA:anchor.worker,
  remoteEvidencePointer:'https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback/runs/pc-godot-'+anchor.jobId+'-'+anchor.source,
  localOriginalEvidenceFolderExists:false,localResultFilesPresent:false,
  localPngHashesMatchPublishedAnchors:false,sourceWorkerAndCaptureStateMatch:false,
  localLedgerHasJob:false,localLedgerStatus:null,localEvidenceAndLedgerReconciled:false,
  publicationReference:'REMOTE_ORIGINALS_PREVIOUSLY_VERIFIED_NOT_FETCHED_BY_THIS_OFFLINE_PROBE',
  safeDisposition:'HOLD_NO_REPLAY_NO_LEDGER_WRITE'
 };
 const entry=ledger?.completed?.[anchor.jobId];
 detail.localLedgerHasJob=entry!==undefined;
 detail.localLedgerStatus=entry?.status||null;
 let files;
 try{files=await fs.readdir(run);detail.localOriginalEvidenceFolderExists=true;}
 catch(e){detail.localFailure='EVIDENCE_'+safeError(e);return detail}
 detail.localTopLevelFileCount=files.length;
 let records;
 try{records=await Promise.all(allowedFiles.map(f=>loadJson(path.join(capture,f))))}
 catch(e){detail.localFailure='RESULT_'+safeError(e);return detail}
 const [job,owner,native]=records;
 detail.localResultFilesPresent=true;
 const sourceOkay=job.jobId===anchor.jobId &&
  job.sourceGitSHA===anchor.source && job.workerGitSHA===anchor.worker &&
  owner.sourceGitSHA===anchor.source && native.sourceGitSHA===anchor.source;
 const workflowOkay=native.stage==='completed' && native.sourceCases===6 &&
  native.selectedFDI==='36' && native.selectedCase==='endo' &&
  native.renderingMethod==='forward_plus' && native.renderingDriver==='vulkan' &&
  job.imageExists===true && job.angledImageExists===true &&
  owner.nativeImagePresent===true && owner.nativeAngledImagePresent===true;
 detail.sourceWorkerAndCaptureStateMatch=sourceOkay&&workflowOkay;
 let pngOkay=true;
 for(const [name,sha] of Object.entries(anchor.images)){
  try{
   const bytes=await fs.readFile(path.join(capture,name));
   const matching=digest(bytes)===sha;
   const report=name.includes('environment')?native.environmentImage:native.practicalImage;
   pngOkay=pngOkay&&matching&&report?.sha256===sha&&
    report.width===1600&&report.height===900&&report.file===name;
  }catch(e){pngOkay=false;detail.localPngReadError=safeError(e)}
 }
 detail.localPngHashesMatchPublishedAnchors=pngOkay;
 const exactTerminal=entry?.commit===anchor.source && entry?.status==='published';
 detail.localEvidenceAndLedgerReconciled=detail.sourceWorkerAndCaptureStateMatch&&
  detail.localPngHashesMatchPublishedAnchors&&exactTerminal;
 detail.readOnlyPublicationAssessment=
  detail.sourceWorkerAndCaptureStateMatch && pngOkay && !detail.localLedgerHasJob
   ?'ORIGINAL_BYTES_CORROBORATED__TERMINAL_LEDGER_ABSENT__NO_REPAIR_AUTHORIZED'
   :detail.localEvidenceAndLedgerReconciled
    ?'LOCAL_TERMINAL_AND_ORIGINAL_BYTES_CONSISTENT__NO_ACTION'
    :'INCOMPLETE_OR_CONFLICTING_LOCAL_STATE__FAIL_CLOSED';
 return detail;
}

export async function inspectPublication(root,anchors=PUBLISHED_ANCHORS){
 const report={
  mode:'SR27_OFFLINE_CONSUMED_PUBLICATION_RECONCILIATION_READ_ONLY',
  noGodotLaunch:true,noGitFetch:true,noNetwork:true,noLedgerWrite:true,
  noLeaseWrite:true,noTaskOrProcessChange:true,
  noRerender:true,ledgerRepairAuthorized:false,taskRefreshAuthorized:false,
  examinedAtUTC:new Date().toISOString(),ledgerExists:false,ledgerSHA256:null,
  ledgerParseAccepted:false,nonterminalLedgerCount:null,
  jobs:[]
 };
 let ledger;
 try{
  const bytes=await fs.readFile(path.join(root,'godot-ledger.json'));
  report.ledgerExists=true;report.ledgerSHA256=digest(bytes);
  ledger=JSON.parse(bytes.toString('utf8'));
  if(!ledger||typeof ledger.completed!=='object'||ledger.completed===null||
    Array.isArray(ledger.completed))throw Error('INVALID_LEDGER_SCHEMA');
  report.ledgerParseAccepted=true;
  report.nonterminalLedgerCount=Object.values(ledger.completed).filter(v=>
    v && ['executing','publish-pending'].includes(v.status)).length;
 }catch(e){report.ledgerError=safeError(e)==='UNREADABLE'?'INVALID_OR_UNREADABLE_LEDGER':safeError(e)}
 for(const anchor of anchors)report.jobs.push(await one(root,ledger,anchor));
 report.reconciliationStatus=report.ledgerParseAccepted &&
   report.jobs.every(j=>j.readOnlyPublicationAssessment===
    'ORIGINAL_BYTES_CORROBORATED__TERMINAL_LEDGER_ABSENT__NO_REPAIR_AUTHORIZED')
   ?'HISTORICAL_REMOTE_PUBLICATIONS_WITH_LOCAL_LEDGER_GAP__NO_REPLAY'
   :'STATE_MISMATCH_OR_PARTIAL_RECONCILIATION__FAIL_CLOSED';
 return report;
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
 if(process.argv.length!==2)throw Error('No command-line overrides are accepted');
 const root=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),
  'KlinikLabGodotWorker');
 const report=await inspectPublication(root);
 console.log(JSON.stringify(report,null,2));
}
