import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=async name=>fs.readFile(new URL('../'+name,import.meta.url),'utf8');
test('SR30 owner-PC lineage probe cannot operate task/lease/ledger or admit job',async()=>{
 const script=await source('visual-qa/sr30-ownerpc-process-lineage-readonly.ps1');
 for(const field of ['currentLoginMatchesTaskPrincipal=$false',
   'leaseReadAttempted=$false','leaseHashAttempted=$false',
   'ledgerReadAttempted=$false','evidenceReadAttempted=$false',
   'quiescenceCertified=$false','taskRefreshSafetyHold=$true',
   'taskRefreshAuthorized=$false','ledgerRepairAuthorized=$false',
   'noTaskOrProcessChange=$true','noFileMutation=$true','noNetwork=$true',
   'noJobQueueChange=$true','SR30_SINGLE_SNAPSHOT_READ_ONLY_PROCESS_LINEAGE'])
  assert.ok(script.includes(field),field);
 assert.ok(script.indexOf('NOT_EXACT_HISTORICAL_TASK_OWNER_CONTEXT__HOLD')<
  script.indexOf('Get-CimInstance -ClassName Win32_Process'));
 assert.ok(script.indexOf("Get-KLOwnerTaskContext")<
  script.indexOf('Get-CimInstance -ClassName Win32_Process'));
 assert.doesNotMatch(script,/^\s*(?:Start-Process|Stop-Process|Start-ScheduledTask|Stop-ScheduledTask|Set-ScheduledTask|Register-ScheduledTask|Remove-Item|Set-Content|New-Item|Add-Content|Invoke-RestMethod)\b/gim);
 assert.doesNotMatch(script,/Get-FileHash|Get-Content|Get-Item|Save-Ledger|writeLedger|godot-worker-active\.lock|godot-ledger\.json/);
});
test('SR30 never claims that zero children means quiescence; categorizes helpers without raw commands',async()=>{
 const script=await source('visual-qa/sr30-ownerpc-process-lineage-readonly.ps1');
 const helper=await source('visual-qa/sr30-process-lineage-core.ps1');
 assert.match(script,/NO_DESCENDANTS_AT_THIS_INSTANT__NOT_QUIESCENCE/);
 assert.match(script,/POLLING_OR_OTHER_KNOWN_HELPERS_OBSERVED__NOT_QUIESCENCE/);
 assert.match(script,/UNVERIFIED_OR_UNKNOWN_DESCENDANTS__HOLD/);
 assert.match(script,/NATIVE_APP_DESCENDANT_OBSERVED__HOLD/);
 assert.match(script,/Get-KLSanitizedProcessKind/);
 assert.match(script,/Test-KLSafeProcessParentTime/);
 assert.match(script,/GetOwnerSid/);
 assert.doesNotMatch(script,/\$report\.(?:cmd|commandLine|userName|sid|rawPath)\s*=/);
 assert.match(helper,/git_helper/);
 assert.match(helper,/godot_or_exported_app/);
 assert.match(helper,/Get-KLExplicitUtcInstant/);
});
test('SR30 CI runs explicit WinPS 5.1/7 synthetic tests, not owner-PC task',async()=>{
 const workflow=await source('.github/workflows/sr1c-godot-pc-watcher-syntax.yml');
 const tests=await source('tests/sr30_process_lineage_windows.ps1');
 assert.match(workflow,/tests\/sr30_process_lineage_windows\.ps1/);
 assert.match(workflow,/tests\/sr30_process_lineage_readonly\.test\.mjs/);
 assert.match(workflow,/SR30.*PowerShell 5\.1.*PowerShell 7/);
 assert.match(tests,/SR30_PROCESS_LINEAGE_READONLY_SYNTHETIC_PASS/);
 assert.match(tests,/2026-11-01T12:56:29\.6817300Z/);
});
