import {validateGodotJob} from './godot-job-core.mjs';
import {JOB07_ID,JOB07_SOURCE} from './godot-job07-forensics.mjs';

/** No IO: strict gate for hypothetical unique job admission.
 * Does not queue an actual job and never declares GPU/render acceptance.
 */
export const PROBE_JOB_ID='pc-godot-clinic-20261101-probe-never-queued-job08';
export function verifyNextJobAdmission({lease,receipt,current,ledger,workerSHA,now=Date.now()}){
 if(!lease?.exists||lease.malformed||lease.processAlive!==true||!Number.isInteger(lease.pid))
  throw Error('No live exclusive owner-PC watcher lease');
 if(!receipt||receipt.workerPid!==lease.pid||receipt.workerGitSHA!==workerSHA)
  throw Error('Runtime receipt PID/SHA differs from live watcher');
 for(const field of ['executableEnvironmentInherited','executableExists',
  'childPowerShellHashModuleVerified','githubPublisherPermissionVerified','githubJobApprovalVerified',
  'privateDesktopOnly','noJobExecutedByReceipt']){
  if(receipt[field]!==true)throw Error('Watcher runtime attestation missing '+field);
 }
 const stamp=Date.parse(receipt.updatedUTC);
 if(!Number.isFinite(stamp)||now-stamp<0||now-stamp>40000)
  throw Error('Watcher runtime receipt is stale or in the future');
 if(current?.jobId!==JOB07_ID||current?.commit!==JOB07_SOURCE)
  throw Error('GitHub current job changed: only non-consuming verification of terminal job07 allowed');
 if(receipt.currentApprovedJob!==current.jobId||receipt.sourceGitSHA!==current.commit)
  throw Error('Runtime and current approved job identities differ');
 const past=ledger?.completed?.[JOB07_ID];
 if(past?.status!=='published'||past?.commit!==JOB07_SOURCE||
   past.recoveryOnly!==true||past.result?.reexecuted!==false||
   past.result?.gpuProcessCorroborated!==false||
   past.result?.overallStatus!=='EVIDENCE_INCOMPLETE')
  throw Error('Published job07 recovery-only ledger gate failed');
 const future=validateGodotJob({...current,jobId:PROBE_JOB_ID});
 if(ledger.completed[PROBE_JOB_ID])
  throw Error('Readiness probe identity is in ledger; no reused job IDs');
 return future;
}
