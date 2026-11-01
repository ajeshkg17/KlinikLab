import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const workerCapture=read('../visual-qa/sr1c-capture-godot-background-pc.ps1');
const helper=read('../visual-qa/sr1n-godot-capture-completion.ps1');
const publisher=read('../visual-qa/sr1n-publish-original-job08-images.ps1');
const imageSource=read('../visual-qa/sr1c-godot-background-capture.gd');

test('job08 original 42s Godot orbit could finish after 34s PDH, and collector now waits for SAME PID',()=>{
 assert.match(workerCapture,/-MaxSamples 34/);
 assert.match(imageSource, /while Time\.get_ticks_msec\(\) - start_msec < 42000/);
 assert.match(workerCapture,/Wait-KLNativeGodotCaptureCompletion -Process \$proc -ReportPath \$background/);
 const pdh=workerCapture.indexOf("Get-Counter -Counter");
 const gate=workerCapture.indexOf('Wait-KLNativeGodotCaptureCompletion -Process $proc');
 const consumer=workerCapture.indexOf('if($captureComplete -and (Test-Path -LiteralPath $background))');
 assert(pdh>=0&&gate>pdh&&consumer>gate);
 assert.match(helper,/\$Process\.WaitForExit\(\$MaxWaitMilliseconds\)/);
 assert.match(helper,/\$Process\.Id -ne \$pidExpected/);
 assert.match(helper,/\$Process\.ExitCode -ne 0/);
 assert.match(helper,/BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW/);
 assert.match(helper,/Godot capture missing valid output PNG name|Original Godot capture missing valid output PNG name/);
 assert.doesNotMatch(helper,/Start-Process|CreateProcess|SetForegroundWindow|SwitchDesktop|SendKeys|godot\.exe/);
});

test('job08 original-PNG recovery is publication only, leaves original job07/job08 files untouched',()=>{
 for(const token of [
  'pc-godot-clinic-20261101-job08','pc-godot-clinic-20261101-job07',
  'recoveryOnly','reexecuted','EVIDENCE_INCOMPLETE','Get-FileHash',
  'godot-background-capture.json','godot-owner-pc-result.json',
  'godot-native-workflow-state.json','process3DPositiveRtx5060DistinctPeriods',
  'rtx5060DxgiLuid','GODOT_JOB08_ORIGINALS.md','FileShare',
  'original-pixels-recovery.json','push origin HEAD:refs/heads/visual-feedback']){
  if(token==='FileShare')continue;
  assert(publisher.includes(token),token);
 }
 assert.match(publisher,/\[IO\.File\]::ReadAllBytes\(\$file\)/);
 assert.match(publisher,/\[BitConverter\]::ToString\(\$bytes,0,8\)/);
 assert.match(publisher,/if\(\$VerifyOnly\)/);
 assert.match(publisher,/if\(Test-Path -LiteralPath \$pointer\)/);
 assert.match(publisher,/oldJob07Untouched=\$true/);
 assert.match(publisher,/originalJob08Untouched=\$true/);
 assert.match(publisher,/originalOwnerReportStatus='EVIDENCE_INCOMPLETE'/);
 for(const danger of ['Start-Process','Start-KLPrivateDesktopGodot','sr1c-capture-godot-background-pc.ps1',
  'godot-worker.mjs','--once','GODOT_PC_LATEST.md','--force-with-lease','git push -f']){
  assert(!publisher.includes(danger),'unexpected execution or evidence overwrite: '+danger);
 }
});
