import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseGodotJson} from '../visual-qa/godot-json.mjs';
import {cleanWindowsPowerShellEnv} from '../visual-qa/godot-powershell-environment.mjs';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const worker=read('../visual-qa/godot-worker.mjs');
const desktop=read('../visual-qa/sr1c-private-desktop.ps1');
const collector=read('../visual-qa/sr1c-capture-godot-background-pc.ps1');

test('WinPS UTF-8 BOM is tolerated on owner-report, ledger, and source-job JSON; malformed JSON still fails',()=>{
 const src='{"status":"EVIDENCE_INCOMPLETE","privateDesktopCreated":false,"godotPid":null}';
 for(const prefix of ['', '\uFEFF']){
  const value=parseGodotJson(prefix+src,'historical owner-PC report');
  assert.equal(value.status,'EVIDENCE_INCOMPLETE');
  assert.equal(value.privateDesktopCreated,false);
  assert.equal(value.godotPid,null);
 }
 assert.throws(()=>parseGodotJson('\uFEFF{bad json','corrupt source'),/corrupt source.*invalid JSON/);
 assert.throws(()=>parseGodotJson(' \uFEFF{"status":"pass"}'),/invalid JSON/);
 assert(worker.includes("parseGodotJson(await fs.readFile(path.join(capture,'godot-owner-pc-result.json'),'utf8')"));
 assert(worker.includes("parseGodotJson(await fs.readFile(originalResultPath,'utf8')"));
 assert(worker.includes("parseGodotJson(await fs.readFile(LEDGER,'utf8')"));
 assert(worker.includes("parseGodotJson(git(['show','FETCH_HEAD:'+JOB_REF])"));
 assert(worker.includes("parseGodotJson(await fs.readFile(path.join(capture,'godot-owner-pc-result.json'),'utf8'),'published original owner-PC JSON')"));
});

test('Real Windows PowerShell 5.1 Set-Content -Encoding utf8 creates BOM: Node parses without swallowing incomplete evidence',t=>{
 if(process.platform!=='win32'){t.skip('Windows PowerShell 5.1 exact BOM reproduction requires Windows');return}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'klab-sr1c-bom-'));
 const file=path.join(dir,'evidence.json');
 try{
  const code=[
   "$ErrorActionPreference='Stop'",
   "[IO.File]::WriteAllText($env:KL_JSON_SOURCE, '{"+'"status":"EVIDENCE_INCOMPLETE","godotPid":null'+"}', [Text.Encoding]::ASCII)",
   "Get-Content -LiteralPath $env:KL_JSON_SOURCE -Raw | Set-Content -LiteralPath $env:KL_JSON_OUTPUT -Encoding UTF8"
  ].join('; ');
  const source=path.join(dir,'source.json');
  const env=cleanWindowsPowerShellEnv({...process.env,KL_JSON_SOURCE:source,KL_JSON_OUTPUT:file});
  const run=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',code],{env,encoding:'utf8',timeout:30000});
  assert.equal(run.status,0,run.stderr||run.stdout||String(run.error));
  const actual=fs.readFileSync(file);
  assert.equal(actual.subarray(0,3).toString('hex'),'efbbbf');
  assert.equal(parseGodotJson(actual.toString('utf8')).status,'EVIDENCE_INCOMPLETE');
  assert.throws(()=>JSON.parse(actual.toString('utf8')),SyntaxError);
 }finally{fs.rmSync(dir,{force:true,recursive:true})}
});

test('New owner PowerShell results are explicitly UTF8 no BOM, and error 87 is diagnosed with WinSta0 and minimal rights',()=>{
 assert(collector.includes('New-Object System.Text.UTF8Encoding($false)'));
 assert(!collector.includes("Set-Content -LiteralPath $reportPath -Encoding utf8"));
 assert(!collector.includes("Set-Content -LiteralPath $counterOutput -Encoding utf8"));
 assert(desktop.includes('GetProcessWindowStation'));
 assert(desktop.includes('GetUserObjectInformation'));
 assert(desktop.includes('$desktopAccess=[uint32]0x000000C3'));
 assert(!desktop.includes('[uint32]0x000F01FF,[IntPtr]::Zero)'));
 assert(desktop.includes('GetLastWin32Error()'));
 assert(desktop.includes('StringToHGlobalUni($desktopName)'));
 assert(desktop.includes('CreateDesktopRaw($desktopNamePointer,'));
 assert(desktop.includes('FreeHGlobal($desktopNamePointer)'));
 assert(!desktop.includes('CreateDesktop($desktopName,$null'), 'production must not use broken managed string PInvoke');

 assert(/no (?:fallback to foreground|foreground fallback)/i.test(desktop));
 assert(!/^\s*.*SwitchDesktop\s*\(/m.test(desktop));
 assert(!/^\s*.*SetForegroundWindow\s*\(/m.test(desktop));
});

test('Old job02/job03 ledger recovery is publication-only and will NEVER execute them again',()=>{
 for(const id of ['pc-godot-fdi16-20261031-job02','pc-godot-fdi16-20261031-job03'])
  assert(worker.includes("'"+id+"'"));
 assert(worker.includes("process.argv.includes('--recover-incomplete')"));
 assert(worker.includes('async function recoverIncompleteAttempts()'));
 const recovery=worker.slice(worker.indexOf('async function recoverIncompleteAttempts()'),worker.indexOf('let busy=false;'));
 assert(recovery.includes("status:'publish-pending'"));
 assert(recovery.includes("overallStatus:'EVIDENCE_INCOMPLETE'"));
 assert(recovery.includes('reexecuted:false'));
 assert(recovery.includes("flag:'wx'"));
 assert(recovery.includes('await publish(j,run,terminalResult)'));
 assert(!recovery.includes('await execute('));
 assert(!recovery.includes('await powershell('));
 assert(!recovery.includes('worktree add'));
});
