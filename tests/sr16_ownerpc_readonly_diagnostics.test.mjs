import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const diagnostic=read('visual-qa/sr16-ownerpc-readonly-diagnostics.ps1');

test('SR16 owner-PC diagnostics derives the evidence directory from the exact requested source SHA',()=>{
 assert.match(diagnostic,/\[string\]\$ExpectedSha='ed3239c85a499205bf76b13395dc54c87b8ffe75'/);
 assert.match(diagnostic,/\$ExpectedSha -notmatch '\^\[a-f0-9\]\{40\}\$'/);
 assert.match(diagnostic,/\$JobId\+'-'+\$ExpectedSha\.Substring\(0,10\)/);
 assert.doesNotMatch(diagnostic,/\$JobId\+'-ed3239c85a'/);
 assert.match(diagnostic,/localOriginalEvidenceFolderExists/);
 assert.match(diagnostic,/localLedgerHasJob/);
});

test('SR16 owner-PC diagnostics compares the scheduled task identity, worker checkout and LOCALAPPDATA roots',()=>{
 for(const field of ['currentLoginMatchesTaskPrincipal','taskWorkerDirectoryExists',
  'taskWorkerHeadMatchesTaskSha','taskActionExecutableExists','taskInstallScriptExists',
  'localAppDataEnvironmentPresent','localAppDataMatchesKnownFolder','workerRootMatchesKnownFolder',
  'heartbeatJobId','runtimeWorkerSha','latestWorkerStdoutLedgerReconciliationMessage'])
  assert.match(diagnostic,new RegExp(field));
 assert.match(diagnostic,/godot-watcher-\*-stdout\.log/);
 assert.match(diagnostic,/godot-watcher-\*-stderr\.log/);
});

test('SR16 owner-PC diagnostics is strictly read-only and never launches the app or repairs the ledger',()=>{
 for(const marker of ['noLedgerWrite=$true','noTaskChange=$true','noGodotLaunch=$true','noScreenCapture=$true'])
  assert.ok(diagnostic.includes(marker),marker);
 assert.doesNotMatch(diagnostic,/\b(Register-ScheduledTask|Set-ScheduledTask|Start-ScheduledTask|Start-Process|CreateProcessW|Set-Content|Add-Content)\b/);
 assert.match(diagnostic,/systemWidePdhDoesNotProveSamePidRtx3d=\$true/);
});
