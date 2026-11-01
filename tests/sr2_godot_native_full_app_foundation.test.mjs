import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const head=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');

test('SR2: exact-source builds a standalone Godot app with real FDI16 source, 6 cases, 7 stations, 4 original quiz families',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kl-godot-app-'));
 const project=path.join(dir,'once');
 try{
  execFileSync(process.execPath,[path.join(root,'native-godot/build-app.mjs'),
   '--source-dir='+root,'--expected-sha='+head,'--output='+project],{encoding:'utf8',timeout:180000});
  const expected=['project.godot','app.tscn','app.gd','main.tscn','main.gd',
   'sr1c-godot-clinic-overview.gd','source/fdi16-before.obj','source/fdi16-after-cut.obj',
   'source/kliniklab-export-manifest.json','source/kliniklab-native-cases.json',
   'source/app-content.json','source/expected-sha.txt','native-build-manifest.json'];
  for(const file of expected)assert(fs.statSync(path.join(project,file)).size>15,file);
  const app=JSON.parse(fs.readFileSync(path.join(project,'source/app-content.json'),'utf8'));
  const core=JSON.parse(fs.readFileSync(path.join(project,'source/kliniklab-native-cases.json'),'utf8'));
  const mesh=JSON.parse(fs.readFileSync(path.join(project,'source/kliniklab-export-manifest.json'),'utf8'));
  const report=JSON.parse(fs.readFileSync(path.join(project,'native-build-manifest.json'),'utf8'));
  assert.equal(app.sourceGitSHA,head);
  assert.equal(app.sourceAppSHA256,core.sourceFileSHA256);
  assert.equal(app.cases.length,6);
  assert.deepEqual(app.cases.map(x=>x.fdi),['16','36','11','26','48','46']);
  assert.deepEqual(app.stations.map(x=>x.id),
   ['interview','letter','handover','written','practical','viva','clinic']);
  for(const name of ['interview','handover','viva','clinic']){
   assert(app.quiz[name].length>=5,name);
   for(const q of app.quiz[name]){
    assert.equal(q.options.length,3);
    assert(q.correct>=0&&q.correct<=2);
    assert(q.explanation.length>8);
   }
  }
  assert(app.tools.length>=15);
  assert.equal(mesh.sceneStates.before.triangles,14856);
  assert.equal(mesh.sceneStates.after.triangles,14936);
  assert.equal(report.fullInteractiveAppMigrated,false);
  assert.equal(report.verifiedNativeGpu,false);
  assert.equal(app.migrationGates.interactiveThreeDPreparation,'NOT_PORTED');
  assert.match(read('native-godot/app.gd'),/func _save_progress\(/);
  assert.match(read('native-godot/app.gd'),/func _show_quiz\(/);
  assert.match(read('native-godot/app.gd'),/func _show_writing\(/);
  assert.match(read('native-godot/app.gd'),/func _show_practical\(/);
  assert.match(read('native-godot/app.gd'),/KL_COMPLETE_OPERATORY_WORKSPACE/);
  assert.throws(()=>execFileSync(process.execPath,[path.join(root,'native-godot/build-app.mjs'),
   '--source-dir='+root,'--expected-sha='+head,'--output='+project],{encoding:'utf8',stdio:'pipe'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('SR2: source exporter does not evaluate full browser application or import patient data',()=>{
 const exporter=read('native-godot/export-content.mjs');
 assert.match(exporter,/vm\.runInNewContext/);
 assert.match(exporter,/const names=\['CASES','STATIONS','TOOLS','FSP_DIALOGUE','HANDOVER','VIVA','CLINIC'\]/);
 assert.match(exporter,/syntheticCasesOnly:true,clinicalAssessmentValidated:false/);
 assert.match(exporter,/sourceAppSHA256/);
 assert.match(read('native-godot/app.gd'),/full app port IN PROGRESS/);
 assert.doesNotMatch(read('native-godot/app.gd'),/HTTPRequest|OS\.shell_open|API_KEY|fetch\(/);
});
