import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const job=JSON.parse(read('visual-qa/jobs/godot-current.json'));
const worker=read('visual-qa/godot-worker.mjs');
const bg=read('visual-qa/sr1c-godot-background-capture.gd');
const panel=read('visual-qa/sr1d-godot-case-workflow.gd');
const prep=read('visual-qa/sr1d-prepare-godot-cases.ps1');
const collector=read('visual-qa/sr1c-capture-godot-background-pc.ps1');
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();

test('six original app.js cases / seven original stations export into an exact-SHA native manifest',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kliniklab-sr1d-'));
 try{
  const out=path.join(dir,'cases.json');
  const p=spawnSync(process.execPath,['visual-qa/sr1d-export-native-cases.mjs',
    '--source-dir='+root,'--expected-sha='+sha,'--output='+out],
   {cwd:root,encoding:'utf8',timeout:20000});
  assert.equal(p.status,0,p.stderr||p.stdout);
  const value=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(value.sourceGitSHA,sha);
  assert.equal(value.sourceFile,'app.js');
  assert.equal(value.sourceFileSHA256.length,64);
  assert.equal(value.caseCount,6);
  assert.equal(value.stationCount,7);
  assert.deepEqual(value.cases.map(x=>x.id),['molar','endo','anterior','crown','surgery','perio']);
  assert.deepEqual(value.cases.map(x=>x.fdi),['16','36','11','26','48','46']);
  assert.deepEqual(value.stations.map(x=>x.id),['interview','letter','handover','written','practical','viva','clinic']);
  assert(value.cases.every(x=>x.title&&x.risk&&x.exam&&x.primaryPlan&&x.alternativePlan));
  assert(value.cases.every(x=>!('name' in x)&&!('age' in x)&&!('patientReply' in x)));
  assert.equal(value.syntheticCasesOnly,true);
  assert.equal(value.clinicalAssessmentValidated,false);
  assert.throws(()=>fs.writeFileSync(out,'overwrite',{flag:'wx'}),/EEXIST/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test('export rejects incorrect production revision and never writes a manifest',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kliniklab-sr1d-reject-'));
 try{
  const out=path.join(dir,'cases.json');
  const bad=spawnSync(process.execPath,['visual-qa/sr1d-export-native-cases.mjs',
    '--source-dir='+root,'--expected-sha='+'0'.repeat(40),'--output='+out],
   {cwd:root,encoding:'utf8',timeout:20000});
  assert.notEqual(bad.status,0);
  assert.match(bad.stderr,/not exact pinned commit/i);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test('new job08 is never-reused native clinic case/station job; archived job07 remains a distinct immutable historical ID',()=>{
 assert.equal(job.schemaVersion,7);
 assert.equal(job.jobId,'pc-godot-clinic-20261101-job08');
 assert.notEqual(job.jobId,'pc-godot-clinic-20261101-job07');
 assert.notEqual(job.jobId,'pc-godot-clinic-20261101-probe-never-queued-job08');
 assert.equal(job.sceneMode,'clinic-cases');
 assert.equal(job.suite,'sr1d-clinic-case-station-migration');
 assert.equal(job.commit,'f4d4d4151851a08342def08d9f2e461f5f5e7109');
 assert.equal(job.capture,'native-clinic-case-switch-orbit');
 assert.equal(job.telemetryContract,'persistent-pdh-valid-rows-dxgi-luid-42s-orbit-v2');
 assert(worker.includes("'sr1d-prepare-godot-cases.ps1'"));
 assert(worker.includes("j.sceneMode==='clinic-cases'"));
 assert(worker.includes("nativeWorkflowVerified:"));
 assert(worker.includes("fullKlinikLabApplicationMigrated:false"));
 assert(worker.includes("'godot-native-workflow-state.json'"));
 assert(prep.includes("sourceFileSHA256")&&prep.includes("Refusing to overwrite"));
 assert(collector.includes("nativeCaseWorkflowVerified"));
 assert(collector.includes("originalFDI16GeometryAvailable"));
 assert(collector.includes("selectedFDI -eq '36'"));
});

test('native Godot case selection hides wrong tooth identity and changes real station state',()=>{
 for(const t of [
  'MANIFEST_PATH', 'sourceGitSHA','clinicalAssessmentValidated',
  'EXPECTED_CASE_IDS', 'EXPECTED_STATIONS','_build_ui()',
  'func select_case(index: int)','func select_station(index: int)',
  'func next_station()','func previous_station()',
  'b.pressed.connect','original_fdi_visible','tooth.visible = original_fdi_visible',
  'originalFDI16GeometryAvailable','fullKlinikLabApplicationMigrated":false',
  'originalCaseSpecificSimulationImplemented":false',
  'caseStationEvents'
 ])assert(panel.includes(t),t);
 assert(bg.includes('native_scene_mode == "clinic-cases"'));
 assert(bg.includes('workflow.call("select_case", 1)'));
 assert(bg.includes('workflow.call("select_station", 4)'));
 assert(bg.includes('native-workflow-state.json'));
 assert(!panel.includes('HTTPRequest.new'));
 assert(!panel.includes('Gemini'));
 assert(!panel.includes('clinicalScore'));
});
