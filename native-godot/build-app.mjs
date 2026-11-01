#!/usr/bin/env node
/**
 * Builds a completely separate runnable Godot project from original exact-Git
 * KlinikLab source and new reviewed native code. No PC render/evidence
 * job is reused and no published feedback is changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const options=Object.fromEntries(process.argv.slice(2).filter(s=>s.startsWith('--')&&s.includes('=')).map(s=>{
 const i=s.indexOf('=');return [s.slice(2,i),s.slice(i+1)];
}));
const sourceDir=options['source-dir'],output=options.output,sha=options['expected-sha'];
if(!sourceDir||!output||!/^[a-f0-9]{40}$/.test(sha||''))
 throw Error('Usage: --source-dir=PATH --output=UNUSED_FOLDER --expected-sha=40hex');
const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'..');
const src=fs.realpathSync(sourceDir);
const actual=execFileSync('git',['-C',src,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(actual!==sha)throw Error('Native app requires exact original source commit; refusing source drift');
const dest=path.resolve(output);
if(fs.existsSync(dest))throw Error('Refusing to overwrite existing native Godot project');
fs.mkdirSync(dest,{recursive:true});
const copy=(from,to)=>fs.copyFileSync(path.join(root,from),path.join(dest,to));
try{
 for(const name of ['app.gd','app.tscn','project.godot','smoke.gd','volume-cut.gd','volume-cut-smoke.gd','multi-case-volume-smoke.gd','radiography-panel.gd','radiography-smoke.gd','fsp-kp-rubric.gd','fsp-kp-smoke.gd','direct-bur-smoke.gd','atlas-viewer.gd','atlas-smoke.gd','scan-viewer.gd','scan-smoke.gd'])copy('native-godot/'+name,name);
 for(const name of ['main.gd','main.tscn'])copy('visual-qa/godot-local-clinical/'+name,name);
 for(const name of ['sr1c-godot-clinic-overview.gd'])copy('visual-qa/'+name,name);
 const exportSource=path.join(src,'visual-qa/sr1-local-kliniklab-export.mjs');
 const exportCases=path.join(root,'visual-qa/sr1d-export-native-cases.mjs');
 const exportContent=path.join(root,'native-godot/export-content.mjs');
 function run(script,args){
  execFileSync(process.execPath,[script,...args],{stdio:'inherit',timeout:90000});
 }
 const exported=path.join(dest,'source');
 run(exportSource,['--output='+exported,'--expected-sha='+sha]);
 run(exportCases,['--source-dir='+src,'--output='+path.join(exported,'kliniklab-native-cases.json'),'--expected-sha='+sha]);
 run(exportContent,['--source-dir='+src,'--output='+path.join(exported,'app-content.json'),'--expected-sha='+sha]);
 run(path.join(root,'native-godot/export-volume.mjs'),
  ['--source-dir='+src,'--output='+path.join(exported,'fdi16-volume-field.bin'),'--expected-sha='+sha]);
 run(path.join(root,'native-godot/export-pathway.mjs'),
  ['--source-dir='+src,'--output='+path.join(exported,'clinical-pathways.json'),'--expected-sha='+sha]);
 run(path.join(root,'native-godot/export-atlas.mjs'),
  ['--source-dir='+src,'--output='+path.join(exported,'atlas'),'--expected-sha='+sha]);
 run(path.join(root,'native-godot/export-radiography.mjs'),
  ['--source-dir='+src,'--output='+path.join(exported,'radiography'),'--expected-sha='+sha]);
 run(path.join(root,'native-godot/export-fsp-kp.mjs'),
  ['--source-dir='+src,'--output='+path.join(exported,'fsp-kp.json'),'--expected-sha='+sha]);
 fs.writeFileSync(path.join(exported,'expected-sha.txt'),sha+'\n',{flag:'wx'});
 const hash=JSON.parse(fs.readFileSync(path.join(exported,'kliniklab-export-manifest.json'),'utf8'));
 const content=JSON.parse(fs.readFileSync(path.join(exported,'app-content.json'),'utf8'));
 const cases=JSON.parse(fs.readFileSync(path.join(exported,'kliniklab-native-cases.json'),'utf8'));
 if(hash.sourceGitSHA!==sha||hash.sceneStates.before.triangles!==14856||
   hash.sceneStates.after.triangles!==14936||content.sourceAppSHA256!==cases.sourceFileSHA256||
   content.cases.length!==6||content.stations.length!==7)throw Error('Native export failed independent app/source parity');
 const volumes=JSON.parse(fs.readFileSync(path.join(exported,'editable-case-volumes.json'),'utf8'));
 const expectedVolumes=[['molar','16'],['endo','36'],['anterior','11'],
  ['crown','26'],['surgery','48'],['perio','46']];
 if(volumes.sourceGitSHA!==sha||Object.keys(volumes.cases||{}).length!==6)
  throw Error('Six-case source volume catalog missing or source revision drift');
 for(const [id,fdi] of expectedVolumes){
  const entry=volumes.cases[id];
  if(!entry||entry.fdi!==fdi||entry.file!=='fdi'+fdi+'-volume-field.bin')
   throw Error('Source FDI identity mismatch '+id+'/'+fdi);
  const descriptor=JSON.parse(fs.readFileSync(path.join(exported,'fdi'+fdi+'-volume-field-manifest.json'),'utf8'));
  if(descriptor.sourceGitSHA!==sha||descriptor.caseId!==id||
    descriptor.fdi!==fdi||descriptor.fieldSHA256!==entry.sha256||
    fs.statSync(path.join(exported,entry.file)).size!==descriptor.sampleCount*16)
   throw Error('Six-case native volume provenance/byte count failed '+id);
 }
 const radiography=JSON.parse(fs.readFileSync(path.join(exported,'radiography/manifest.json'),'utf8'));
 if(radiography.sourceGitSHA!==sha||Object.keys(radiography.cases||{}).length!==6||
   radiography.patientImage!==false||radiography.clinicalAccuracyValidated!==false)
  throw Error('Six-case synthetic native radiography integrity contract invalid');
 for(const [id,fdi] of expectedVolumes){
  const row=radiography.cases[id];
  const png=path.join(exported,'radiography','fdi'+fdi+'-synthetic.png');
  if(!row||row.fdi!==fdi||row.file!=='fdi'+fdi+'-synthetic.png'||
   !fs.existsSync(png)||fs.statSync(png).size<1000)
   throw Error('Six-case source synthetic radiography missing FDI '+fdi);
 }
 const sourceFsp=JSON.parse(fs.readFileSync(path.join(exported,'fsp-kp.json'),'utf8'));
 if(sourceFsp.sourceGitSHA!==sha||Object.keys(sourceFsp.cases||{}).length!==4||
    sourceFsp.phases.length!==4||sourceFsp.parityProbes.length!==68||
    sourceFsp.clinicalReviewPending!==true||sourceFsp.certifiedLanguageExam!==false)
   throw Error('Source four-case sixteen-exercise FSP/KP formative parity contract failed');
 const record={
  schemaVersion:1,originalSourceGitSHA:sha,sourceAppSHA256:content.sourceAppSHA256,
  sourceGeometryBeforeTriangles:14856,sourceGeometryAfterTriangles:14936,
  nativeCases:6,nativeStations:7,nativeQuizzes:Object.values(content.quiz).reduce((n,x)=>n+x.length,0),
  sourcePatientReplyStagesPerCase:7,localFormativeReportExport:true,nativeSourceClinicalJourneySixCases:true,nativeProcedural32ToothAtlas:true,nativeLocalStlObjInspection:true,
  nativeSourceSyntheticRadiographySixCases:true,
  nativeOriginalFspKpFourCasesSixteenPhases:true,
  nativeMeshSurfacePointerEditingOptIn:true,
  nativeFdi16EditableSampledVolume:true,otherCasesEditableVolume:true,
  sourceVerifiedEditableCases:expectedVolumes.map(([id,fdi])=>({id,fdi})),
  clinicalCalibrationVerified:false,
  fullInteractiveAppMigrated:false,verifiedNativeGpu:false,
  buildStatus:'NATIVE_GODOT_APP_PROJECT_BUILT_NEEDS_NATIVE_RUNTIME_QA',
  limitation:'All six source case volumes are editable synthetic sampled geometry, NOT calibrated tissue mechanics. Full browser parity, Quest/XR, AI, radiography and clinical validation remain incomplete.'
 };
 fs.writeFileSync(path.join(dest,'native-build-manifest.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
 console.log('KLINIKLAB_NATIVE_APP_PROJECT_CREATED: '+dest);
}catch(err){
 console.error('Build attempt incomplete; preserve output for forensics, use NEW unique path. '+String(err.message));
 process.exitCode=1;
}
