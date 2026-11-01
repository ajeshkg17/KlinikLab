import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
test('SR28 refuses an out-of-owner login before polling or lease read',async()=>{
 const script=await read('visual-qa/sr27-ownerpc-observe-only.ps1');
 assert.match(script,/Get-KLOwnerTaskContext/);
 assert.match(script,/OWNER_CONTEXT_NOT_VERIFIED__NO_LEASE_READ_NO_OBSERVATION__HOLD/);
 assert.ok(script.indexOf("if($null -eq $ownerGate")<script.indexOf('$first=Get-KLWatchSnapshot'));
 assert.match(script,/taskRefreshSafetyHold=\$true;taskRefreshAuthorized=\$false/);
 assert.match(script,/watcherQuiescenceCertified=\$false/);
});
test('SR28 reports raw lease, parser, identity and optional hash as independent stages',async()=>{
 const s=await read('visual-qa/sr28-owner-identity-readonly.ps1');
 for(const marker of ['Get-KLOwnerTaskContext','GetOwnerSid','processOwnerMatchesTaskPrincipal',
   'WRONG_LOGIN_NO_OWNER_LEASE_READ_ATTEMPT__HOLD',
   'leaseInspectionAttempted=$false','leaseReadErrorStages',
   'RAW_','TIMESTAMP_','JSON_','HASH_',
   'OWNER_LEASE_IDENTITY_VERIFIED_HASH_UNREADABLE__HOLD',
   'taskRefreshSafetyHold=$true','taskRefreshAuthorized=$false','ledgerRepairAuthorized=$false']){
  assert.ok(s.includes(marker),'missing '+marker);
 }
 assert.ok(s.indexOf('WRONG_LOGIN_NO_OWNER_LEASE_READ_ATTEMPT__HOLD')<
  s.indexOf('$out.leaseInspectionAttempted=$true'));
 assert.ok(s.indexOf('Get-Content -LiteralPath $leasePath')<
  s.indexOf('Get-FileHash -LiteralPath $leasePath'));
 assert.doesNotMatch(s,/\b(?:Stop-Process|Start-Process|Set-ScheduledTask|Start-ScheduledTask|Stop-ScheduledTask|Register-ScheduledTask|Remove-Item|Set-Content|Add-Content|New-Item|Invoke-RestMethod)\b/);
});
test('SR28 owner probe never reports identity or filesystem secrets',async()=>{
 const s=await read('visual-qa/sr28-owner-identity-readonly.ps1');
 const core=await read('visual-qa/sr28-owner-identity-core.ps1');
 for(const field of ['taskSidInternal','currentSidInternal','taskWorkerDirInternal','knownRootInternal']){
  assert.ok(core.includes(field));
  assert.doesNotMatch(s,new RegExp('\\$out\\.'+field+'\\s*='));
 }
 assert.match(s,/noTaskOrProcessChange=\$true/);
 assert.match(s,/noLedgerWrite=\$true;noLeaseWrite=\$true/);
 assert.match(s,/noGodotLaunch=\$true;noNetwork=\$true;noJobQueueChange=\$true/);
});
test('SR28 historical disposition is offline, immutable and not a ledger write',async()=>{
 const s=await read('visual-qa/sr27-reconcile-consumed-readonly.mjs');
 assert.match(s,/REMOTE_PUBLISHED_ORIGINALS_CORROBORATED__LOCAL_LEDGER_GAP__NO_REPLAY__NO_REPAIR/);
 assert.match(s,/dispositionIsOnlyAnOfflineAnalyticalClassification=true/);
 assert.match(s,/consumedJobIdsRemainImmutable=true/);
 assert.match(s,/originalPixelsVisualAcceptanceClaimed=false/);
 assert.doesNotMatch(s,/(?:fs\.)?writeFile\s*\(/);
});
