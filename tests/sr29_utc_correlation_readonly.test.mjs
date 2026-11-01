import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
test('SR29 owner process/lease clock comparison never casts an already-UTC string to DateTime',async()=>{
 const caller=await read('visual-qa/sr28-owner-identity-readonly.ps1');
 const helper=await read('visual-qa/sr29-utc-correlation.ps1');
 assert.match(caller,/Get-KLLeaseProcessUtcCorrelation -LeaseStartedAt/);
 assert.match(caller,/\. \(Join-Path \$PSScriptRoot 'sr29-utc-correlation.ps1'\)/);
 assert.doesNotMatch(caller,/\$created\s*=\s*\[datetime\]\$candidate\[0\]\.createdUTC/);
 assert.doesNotMatch(caller,/\(\$stamp\.UtcDateTime-\$created\)\.TotalSeconds/);
 assert.match(helper,/Get-KLExplicitUtcInstant/);
 assert.match(helper,/DateTimeOffset\]::TryParse/);
 assert.match(helper,/\$lease\.UtcDateTime-\$created\.UtcDateTime/);
 assert.match(helper,/SR29_TIMESTAMP_EXPLICIT_ZONE_REQUIRED/);
 assert.doesNotMatch(helper,/(?:New-Item|Set-Content|Out-File|Set-ScheduledTask|Stop-Process|Start-Process|Invoke-RestMethod|Get-Content|Get-CimInstance)/);
});
test('SR29 dual-engine test covers exact original timestamp, explicit timezone equivalence, wrong one-hour event and missing offset',async()=>{
 const windows=await read('tests/sr29_utc_correlation_windows.ps1');
 for(const required of ['2026-11-01T12:56:29.736Z','2026-11-01T12:56:29.6817300Z',
  '0.05427','2026-11-01T13:56:29.6817300+01:00','-3599.946',
  'SR29_UTC_OFFSET_AND_OWNER_CLOCK_CORRELATION_PASS','SR29_INVALID_CREATION_TIMESTAMP_ACCEPTED']){
  assert.ok(windows.includes(required),required);
 }
});
test('SR29 does not change live watcher, ledger, admission, or source job',async()=>{
 const yaml=await read('.github/workflows/sr1c-godot-pc-watcher-syntax.yml');
 assert.match(yaml,/tests\/sr29_utc_correlation_windows\.ps1/);
 assert.match(yaml,/tests\/sr29_utc_correlation_readonly\.test\.mjs/);
 assert.match(yaml,/SR29.*Windows PowerShell 5\.1/);
 const caller=await read('visual-qa/sr28-owner-identity-readonly.ps1');
 assert.match(caller,/taskRefreshSafetyHold=\$true/);
 assert.match(caller,/taskRefreshAuthorized=\$false/);
 assert.match(caller,/ledgerRepairAuthorized=\$false/);
});
