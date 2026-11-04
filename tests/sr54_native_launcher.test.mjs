import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('SR54 exact-source fresh project must import original clinic before any interactive launch',()=>{
 const script=read('native-godot/launch-local.ps1');
 const doc=read('native-godot/README.md');
 const builder=read('native-godot/build-app.mjs');
 assert.match(script,/function Invoke-GodotImport\(/);
 assert.match(script,/Start-Process -FilePath \$Executable -ArgumentList \$args -WorkingDirectory \$Project -Wait -PassThru/);
 assert.match(script,/--headless/);
 assert.match(script,/--editor/);
 assert.match(script,/--import/);
 assert.match(script,/\.godot\\imported/);
 assert.match(script,/whole-clinic-starter-v1-godot\.glb\*/);
 assert.match(script,/result\.ExitCode -ne 0/);
 assert.match(script,/PackedScene import is missing/);
 assert.match(script,/function Start-GodotDesktop\(/);
 const build=script.indexOf("& $node 'native-godot/build-app.mjs'");
 const importAt=script.indexOf('$importExit = Invoke-GodotImport');
 const launchAt=script.indexOf('$desktopPid = Start-GodotDesktop');
 assert.ok(build>=0 && importAt>build && launchAt>importAt,'build -> checked import -> desktop launch order');
 assert.match(builder,/source.*git|sourceGitSHA|sourceSha/i);
 assert.match(doc,/--headless --editor --path \$run --import/);
 assert.match(doc,/No loader found for whole-clinic-starter-v1-godot\.glb/);
});

test('SR54 user-session launch provides diagnostics and never mutates watcher/capture evidence',()=>{
 const ps=read('native-godot/launch-local.ps1');
 const windows=read('.github/workflows/sr1c-godot-pc-watcher-syntax.yml');
 const ci=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 const testSource=read('tests/sr54_native_launcher_windows.ps1');
 for(const name of ['Godot_v4.7.2-stable_win64.exe','godot.exe','godot']){
   assert.ok(ps.includes(name),'PATH discovery missing '+name);
 }
 assert.match(ps,/Start-Sleep -Seconds 5/);
 assert.match(ps,/\$process\.Refresh\(\)/);
 assert.match(ps,/\$process\.HasExited/);
 assert.match(ps,/desktop\.stdout\.log/);
 assert.match(ps,/desktop\.stderr\.log/);
 assert.match(ps,/import\.stdout\.log/);
 assert.match(ps,/import\.stderr\.log/);
 assert.match(ps,/launcher\.txt/);
 assert.match(ps,/sourceSHA=\$sourceSha/);
 assert.match(ps,/desktopPid=\$desktopPid/);
 assert.match(ps,/interactive Windows desktop|interactive desktop session|CALLER.s Windows session/);
 assert.match(ps,/NOT ACCEPTED/);
 assert.doesNotMatch(ps,/Stop-Process|Start-ScheduledTask|Register-ScheduledTask|--kliniklab-exported-pc-capture/);
 assert.match(testSource,/SR54_WINPS_LAUNCH_IMPORT_AND_EARLY_EXIT_PASS/);
 assert.match(testSource,/Invoke-Expression \$definition\.Extent\.Text/);
 assert.match(windows,/SR54 mocked fresh-project import and early desktop exit/);
 assert.match(windows,/tests\/sr54_native_launcher_windows\.ps1/);
 assert.match(ci,/tests\/sr54_native_launcher\.test\.mjs/);
 assert.match(ci,/whole-clinic-starter-v1-godot\.glb/);
});