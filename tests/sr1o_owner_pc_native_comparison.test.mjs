import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const one=readFileSync(new URL('../visual-qa/sr1o-owner-pc-native-comparison-once.ps1',import.meta.url),'utf8');
test('owner PC orchestration never launches/queues Godot, modifies a prior job, or claims full app',()=>{
 for(const token of [
  'sr1n-publish-original-job08-images.ps1','-VerifyOnly','-Publish',
  'GODOT_JOB08_ORIGINALS.md','godot-ledger.json','recoveryOnly',
  'pc-godot-clinic-20261101-job07','pc-godot-clinic-20261101-job08',
  'run-unreal-whole-clinic-pc.ps1','-Mode Prepare','-Mode Render',
  'publish-whole-clinic-comparison-pc.ps1','-Engine Unreal',
  'unreal-clinic-','NewGuid','UnrealEditor.exe','UnrealEditor-Cmd.exe']){
  assert(one.includes(token),token);
 }
 for(const forbidden of ['--once','godot-current.json','Start-KLPrivateDesktopGodot',
  'Start-ScheduledTask','Stop-ScheduledTask','SetForegroundWindow','SwitchDesktop',
  'SendKeys','GODOT_PC_LATEST.md','job07-archived','GodotExe']){
  assert(!one.includes(forbidden),'forbidden '+forbidden);
 }
 assert.match(one,/if\(Test-Path -LiteralPath \$run\)/);
 assert.match(one,/if\(\$LASTEXITCODE -ne 0\)\{throw 'Unreal private native whole-clinic render failed/);
 assert.match(one,/GODOT_JOB08_ORIGINALS_PUBLISHED_NO_RERENDER/);
 assert.match(one,/UNREAL_WHOLE_CLINIC_ORIGINAL_NATIVE_EVIDENCE_PUBLISHED_PENDING_INDEPENDENT_PIXEL_AND_GPU_REVIEW/);
});
