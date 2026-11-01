import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const gate=source('../visual-qa/sr1p-job08-publication-gate.ps1');
const pub=source('../visual-qa/sr1n-publish-original-job08-images.ps1');
const engine=source('../visual-qa/sr1o-owner-pc-native-comparison-once.ps1');
const unity=source('../visual-qa/sr1q-owner-pc-unity-whole-clinic-once.ps1');
const unityProbe=source('../visual-qa/run-unity-source-probe.ps1');
const unityGPU=source('../visual-qa/run-unity-clinic-render-pc.ps1');
const unityPublisher=source('../visual-qa/publish-unity-clinic-evidence.ps1');

test('missing job08 ledger is allowed only if canonical published remote original is verified with source+worker+GPU status',()=>{
 for(const marker of ['LOCAL_JOB08_ENTRY_ABSENT_REMOTE_ORIGINAL_PUBLISHED',
  'LOCAL_JOB08_ENTRY_PRESENT_AND_REMOTE_ORIGINAL_PUBLISHED',
  'RemoteJob.jobId','RemoteJob.sourceGitSHA','RemoteJob.workerGitSHA',
  'RemoteJob.overallStatus','RemoteJob.imageExists',
  'RemoteJob.rtx5060DxgiLuid','oldEntry.recoveryOnly',
  'oldEntry.result.reexecuted']){
   assert.ok(gate.includes(marker),marker);
 }
 for(const marker of ['git -C $repo fetch origin visual-feedback','FETCH_HEAD:',
  'Assert-KLJob08OriginalPublicationGate','Assert-KLOriginalRemoteByteParity',
  'native-source-submission.json','godot-owner-pc-result.json',
  'godot-native-workflow-state.json','godot-gpu-3d-counters.json',
  'godot-gpu-pdh-diagnostics.json','git -C $repo hash-object',
  'remoteOriginalGitCommit','remoteOriginalJob08BlobSHA',
  'ledgerModified=$false','Get-FileHash','originalOwnerReportGpuProcessCorroborated=$false']){
   assert(pub.includes(marker),marker);
 }
 assert(!pub.includes('saveLedger('));
 assert(!pub.includes('Set-Content (Join-Path $root'));
 assert(!pub.includes('Start-KLPrivateDesktopGodot'));
 assert(!pub.includes('godot-worker.mjs --once'));
 assert(!pub.includes("WriteAllText((Join-Path $root 'godot-ledger.json'"));
 assert(!engine.includes("-not $now -or $now.status"));
 assert(engine.includes('sr1n-publish-original-job08-images.ps1'));
});

test('Unity new owner PC runner is exact-SHA two-stage source import PLUS real private D3D11 GPU and automatic SHA256 PNG publication',()=>{
 for(const marker of ['ExpectedCodeSha','UnityExe','RunReceiptPath',
  'run-unity-source-probe.ps1','UNITY_SOURCE_PROBE_NEW_RECEIPT',
  'run-unity-clinic-render-pc.ps1','UNITY_NATIVE_D3D11_SOURCE_RUN',
  'publish-unity-clinic-evidence.ps1','sourceGitSHA',
  'fullKlinikLabApplicationMigrated','-RunReceiptPath $nativeReceipt',
  'UNITY_NATIVE_WHOLE_CLINIC_ORIGINAL_PNGS_PUBLISHED_NEEDS_DIRECT_PIXEL_REVIEW']){
   assert(unity.includes(marker),marker);
 }
 for(const marker of ['UNITY_SOURCE_IMPORTED_SCENE_SAVED_NO_GPU_RENDER',
  'FileMode]::CreateNew','sourceRun=$run','realGpuRendered=$false']){
   assert(unityProbe.includes(marker),marker);
 }
 for(const marker of ['-force-d3d11','CreateDesktopRaw','GetProcessWindowStation',
  'Get-Counter','-MaxSamples 34','DxgiEvidence','FromGpuEnginePath',
  'processGpuCorroborated=$gpuOK','nativeCaseStationSelectionPreviewVerified',
  'sourceRun=$src','nativeRun=$run','codeGitSHA=$code',
  'FileMode]::CreateNew']){
   assert(unityGPU.includes(marker),marker);
 }
 for(const marker of ['unity-whole-clinic-overview.png','unity-whole-clinic-angled.png',
  'unity-fdi16-cut-occlusal.png','Get-FileHash',
  'UNITY_PC_LATEST.md','push origin HEAD:refs/heads/visual-feedback',
  'nativeCaseStationSelectionPreviewVerified','originalPngHashesVerified']){
   assert(unityPublisher.includes(marker),marker);
 }
 for(const danger of ['SwitchDesktop','SetForegroundWindow','SendKeys',
  'godot-ledger.json','godot-current.json','Start-ScheduledTask','Stop-ScheduledTask']){
   assert(!unity.includes(danger),'owner runner must not mutate Godot watcher or foreground '+danger);
 }
});

test('Godot watcher does not mark unknown ledger job executing when original evidence already exists',()=>{
 const w=source('../visual-qa/godot-worker.mjs');
 const start=w.indexOf("if(!previous){",w.indexOf("async function tick()"));
 const write=w.indexOf("state.completed[j.jobId]={commit:j.commit,status:'executing'",start);
 assert(start>=0&&write>start);
 const segment=w.slice(start,write);
 for(const phrase of ["fs.stat(originalRun)","existing-original-evidence-ledger-reconciliation-required",
  "publisherToken","/contents/","remote-original-published-ledger-reconciliation-required",
  "if(!String(e.message).includes('status 404'))throw e"]){
  assert(segment.includes(phrase),phrase);
 }
 assert(!segment.includes("await execute(j)"));
});
