import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {cleanWindowsPowerShellEnv} from '../visual-qa/godot-powershell-environment.mjs';

const self=fileURLToPath(import.meta.url);
const expected=createHash('sha256').update(fs.readFileSync(self)).digest('hex');
const badValue=path.join(os.tmpdir(),'KL-SR1C-poisoned-nonexistent-PowerShell7-modules');

test('WindowsPowerShell child env removes inherited pwsh PSModulePath case-insensitively but preserves all other variables',()=>{
 const original={PATH:'C:\\Windows\\System32',PSModulePath:badValue,
  pSmOdUlEpAtH:badValue,APP_NAME:'KlinikLab',UNRELATED:'unchanged'};
 const child=cleanWindowsPowerShellEnv(original);
 assert.equal(Object.keys(child).filter(k=>k.toUpperCase()==='PSMODULEPATH').length,0);
 assert.equal(child.PATH,original.PATH);
 assert.equal(child.UNRELATED,'unchanged');
 assert.equal(child.APP_NAME,'KlinikLab');
 assert.equal(original.PSModulePath,badValue,'parent must remain untouched');
});

test('real pwsh-to-Node-to-WinPS 5.1 -File and -Command Get-FileHash work with sanitized child environment',t=>{
 if(process.platform!=='win32'){t.skip('Real Windows PowerShell 5.1 is Windows-only');return}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'klab-sr1c-psmodulepath-'));
 const probe=path.join(dir,'sha256-probe.ps1');
 const cmd=[
  "$ErrorActionPreference='Stop'",
  "$c=Get-Command -Name Get-FileHash -ErrorAction Stop",
  "$h=Get-FileHash -LiteralPath $env:KLINIKLAB_TEST_SHA_FILE -Algorithm SHA256 -ErrorAction Stop",
  "Write-Output ('HASH='+$h.Hash.ToLowerInvariant())",
  "Write-Output ('MODULE='+$c.ModuleName)",
  "Write-Output ('VERSION='+$PSVersionTable.PSVersion.ToString())"
 ].join('; ');
 try{
  fs.writeFileSync(probe,cmd,'utf8');
  // This emulates pwsh 7's contaminating PSModulePath passing through Node:
  // the old launcher forwarded it to Windows PowerShell 5.1 as-is.
  const contaminated={...process.env,PSModulePath:badValue,
   KLINIKLAB_TEST_SHA_FILE:self};
  const env=cleanWindowsPowerShellEnv(contaminated);
  assert.equal(Object.hasOwn(env,'PSModulePath'),false);
  const cases=[
   ['Command',['-NoProfile','-NonInteractive','-Command',cmd]],
   ['File',['-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',probe]]
  ];
  for(const [kind,args] of cases){
   const p=spawnSync('powershell.exe',args,{env,encoding:'utf8',timeout:30000,windowsHide:true});
   assert.equal(p.status,0,kind+' failed: '+String(p.stderr||p.error||p.stdout));
   assert(p.stdout.includes('HASH='+expected),kind+' did not perform real SHA-256 from module');
   assert(p.stdout.includes('MODULE=Microsoft.PowerShell.Utility'),
    kind+' picked wrong edition of Microsoft.PowerShell.Utility: '+p.stdout);
   assert.match(p.stdout,/VERSION=5\.1\./,kind+' must be Windows PowerShell 5.1');
  }
 }finally{fs.rmSync(dir,{force:true,recursive:true})}
});

test('actual Godot child launcher uses cleaned environment in BOTH hash preflight and -STA -File preparation',()=>{
 const s=fs.readFileSync(new URL('../visual-qa/godot-worker.mjs',import.meta.url),'utf8');
 assert(s.includes("import {cleanWindowsPowerShellEnv}"));
 assert(s.includes("const env=cleanWindowsPowerShellEnv({...process.env,KLINIKLAB_PS_PREFLIGHT_FILE:target})"));
 assert(s.includes("stdio:['ignore','pipe','pipe'],env:cleanWindowsPowerShellEnv(process.env)"));
 assert(s.includes("child stderr: '+childStderr.slice(-1800)"), 'actual child error retained in machine-readable job result');
 assert(s.includes('const childPowerShell=verifyChildHashModule()'));
 assert(s.includes("'-NoProfile','-STA','-ExecutionPolicy','Bypass','-File'"));
 assert(s.includes('Get-FileHash -LiteralPath $env:KLINIKLAB_PS_PREFLIGHT_FILE'));
 assert(s.includes('sha256PreflightPassed:true'));
});
