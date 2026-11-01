import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectPublication,PUBLISHED_ANCHORS} from '../visual-qa/sr27-reconcile-consumed-readonly.mjs';
const pngNames=['kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png'];
const hash=x=>createHash('sha256').update(x).digest('hex');
const fixture=(name)=>({
 key:name,jobId:'pc-godot-exported-20261101-test-'+name,source:'1'.repeat(40),
 worker:'2'.repeat(40),
 images:Object.fromEntries(pngNames.map(n=>[n,hash(Buffer.from(name+n))]))
});
async function prepare(root,anchors,ledger={completed:{}}){
 const ledgerBytes=JSON.stringify(ledger);
 await fs.writeFile(path.join(root,'godot-ledger.json'),ledgerBytes);
 for(const a of anchors){
  const run=path.join(root,'godot-evidence',a.jobId+'-'+a.source.slice(0,10),'Captures');
  await fs.mkdir(run,{recursive:true});
  const native={sourceGitSHA:a.source,stage:'completed',sourceCases:6,selectedFDI:'36',
   selectedCase:'endo',renderingMethod:'forward_plus',renderingDriver:'vulkan'};
  for(const [i,name] of pngNames.entries()){
   const bytes=Buffer.from(a.key+name);
   await fs.writeFile(path.join(run,name),bytes);
   const object={sha256:hash(bytes),file:name,width:1600,height:900};
   native[i===0?'environmentImage':'practicalImage']=object;
  }
  const job={jobId:a.jobId,sourceGitSHA:a.source,workerGitSHA:a.worker,
   imageExists:true,angledImageExists:true};
  const owner={sourceGitSHA:a.source,nativeImagePresent:true,nativeAngledImagePresent:true};
  for(const [n,v] of [['godot-job-result.json',job],
   ['godot-owner-pc-result.json',owner],['native-exported-app-result.json',native]]){
   await fs.writeFile(path.join(run,n),JSON.stringify(v));
  }
 }
 return ledgerBytes;
}
test('SR27 observed remote hashes are pinned independently for consumed jobs12/13',()=>{
 assert.equal(PUBLISHED_ANCHORS.length,2);
 assert.equal(PUBLISHED_ANCHORS[0].jobId,'pc-godot-exported-20261101-cc0-job12-approved-678f92');
 assert.equal(PUBLISHED_ANCHORS[1].jobId,'pc-godot-exported-20261101-cc0-job13-6a077f');
 for(const a of PUBLISHED_ANCHORS){
  assert.equal(a.worker,'033fb0520212fe696df02bf2a0c5aca12ad3e848');
  assert.equal(a.source.length,40);
  for(const value of Object.values(a.images))assert.match(value,/^[a-f0-9]{64}$/);
 }
});
test('SR27 supports byte-matching original evidence but refuses to synthesize absent terminal ledger',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'kl-sr27-readonly-'));
 const fixtures=[fixture('a'),fixture('b')];
 try{
  const original=await prepare(root,fixtures);
  const result=await inspectPublication(root,fixtures);
  assert.equal(result.ledgerParseAccepted,true);
  assert.equal(result.nonterminalLedgerCount,0);
  assert.equal(result.reconciliationStatus,'HISTORICAL_REMOTE_PUBLICATIONS_WITH_LOCAL_LEDGER_GAP__NO_REPLAY');
  assert.equal(result.jobs.length,2);
  for(const j of result.jobs){
   assert.equal(j.sourceWorkerAndCaptureStateMatch,true);
   assert.equal(j.localPngHashesMatchPublishedAnchors,true);
   assert.equal(j.localLedgerHasJob,false);
   assert.equal(j.localEvidenceAndLedgerReconciled,false);
   assert.equal(j.safeDisposition,'HOLD_NO_REPLAY_NO_LEDGER_WRITE');
  }
  assert.equal(await fs.readFile(path.join(root,'godot-ledger.json'),'utf8'),original);
  assert.equal(result.noLedgerWrite,true);
  assert.equal(result.noNetwork,true);
  assert.equal(result.taskRefreshAuthorized,false);
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
test('SR27 mismatched original PNG bytes or active ledger always fails closed',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'kl-sr27-tamper-'));
 const a=fixture('c');
 try{
  await prepare(root,[a]);
  const cap=path.join(root,'godot-evidence',a.jobId+'-'+a.source.slice(0,10),'Captures');
  await fs.writeFile(path.join(cap,pngNames[0]),'tampered original');
  let r=await inspectPublication(root,[a]);
  assert.equal(r.reconciliationStatus,'STATE_MISMATCH_OR_PARTIAL_RECONCILIATION__FAIL_CLOSED');
  assert.equal(r.jobs[0].localPngHashesMatchPublishedAnchors,false);
  await prepare(root,[a],{completed:{other:{status:'executing'}}});
  r=await inspectPublication(root,[a]);
  assert.equal(r.nonterminalLedgerCount,1);
  assert.equal(r.reconciliationStatus,'STATE_MISMATCH_OR_PARTIAL_RECONCILIATION__FAIL_CLOSED');
  assert.equal(r.ledgerRepairAuthorized,false);
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
test('SR27 watcher probe cannot authorize refresh even when observations are quiet',async()=>{
 const q=await fs.readFile(new URL('../visual-qa/sr27-ownerpc-observe-only.ps1',import.meta.url),'utf8');
 const recon=await fs.readFile(new URL('../visual-qa/sr27-reconcile-consumed-readonly.mjs',import.meta.url),'utf8');
 for(const required of ['Get-CimInstance -ClassName Win32_Process','Start-Sleep -Seconds $ObservationSeconds',
  'descendantInspectionComplete','ledgerNonterminalEntryCount','evidenceLatestWriteUTC',
  "NO_CAPTURE_OBSERVED_IN_BOUNDED_WINDOW__NOT_QUIESCENCE_PROOF",
  'taskRefreshSafetyHold=$true','taskRefreshAuthorized=$false','watcherQuiescenceCertified=$false']){
  assert.ok(q.includes(required),required);
 }
 assert.doesNotMatch(q,/\b(Stop-Process|Start-Process|Stop-ScheduledTask|Start-ScheduledTask|Set-ScheduledTask|Register-ScheduledTask|Remove-Item|Set-Content|Add-Content|New-Item|Invoke-RestMethod)\b/);
 const executable=recon.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
 assert.doesNotMatch(executable,/\b(?:writeFile|mkdir|rename|unlink|fetchRemote)\s*\(|\b(?:fetch|spawn|exec|api)\s*\(|\bgit\s+fetch\b/);
 assert.match(recon,/noRerender:true,ledgerRepairAuthorized:false,taskRefreshAuthorized:false/);
});
