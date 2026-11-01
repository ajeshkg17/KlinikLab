#!/usr/bin/env node
/**
 * Builds a completely separate runnable Godot project from original exact-Git
 * KlinikLab source and new reviewed native code. No PC render/evidence
 * job is reused and no published feedback is changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
 for(const name of ['app.gd','app.tscn','project.godot','smoke.gd','volume-cut.gd','volume-cut-smoke.gd','multi-case-volume-smoke.gd','radiography-panel.gd','radiography-smoke.gd','fsp-kp-rubric.gd','fsp-kp-smoke.gd','direct-bur-smoke.gd','cc0-clinic.gd','cc0-clinic-smoke.gd','owner-pc-capture.gd','atlas-viewer.gd','atlas-smoke.gd','scan-viewer.gd','scan-smoke.gd'])copy('native-godot/'+name,name);
 for(const name of ['main.gd','main.tscn'])copy('visual-qa/godot-local-clinical/'+name,name);
 for(const name of ['sr1c-godot-clinic-overview.gd'])copy('visual-qa/'+name,name);
 const exportSource=path.join(src,'visual-qa/sr1-local-kliniklab-export.mjs');
 const exportCases=path.join(root,'visual-qa/sr1d-export-native-cases.mjs');
 const exportContent=path.join(root,'native-godot/export-content.mjs');
 function run(script,args){
  execFileSync(process.execPath,[script,...args],{stdio:'inherit',timeout:90000});
 }
 // Only these two individually reviewed CC0 visual props are accepted for
 // native packaging. Never silently import the other 52 unreviewed candidates.
 const sourceAssets=path.join(root,'assets/cc0/3dassets-dental');
 const sourceLicense=JSON.parse(fs.readFileSync(path.join(sourceAssets,'source-manifest.json'),'utf8'));
 if(sourceLicense.licenseSPDX!=='CC0-1.0'||sourceLicense.status!=='REVIEWED_CC0_STATIC_VISUAL_PROTOTYPES_ONLY'||
   sourceLicense.review?.clinicalAccepted!==false||sourceLicense.review?.anatomyFDIValidated!==false)
   throw Error('CC0 review/license manifest not approved for native static use');
 const selected=[
  {id:'whole-clinic-starter',filename:'whole-clinic-starter-v1.glb',
   sha256:'9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a'},
  {id:'instrument-tray',filename:'instrument-tray-v1.glb',
   sha256:'63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036'}
 ];
 const hashFile=(name)=>crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');
 const selectedManifest={schemaVersion:1,appGitSHA:sha,
  kind:'REVIEWED_CC0_CLINIC_STATIC_VISUAL_ONLY',licenseSPDX:'CC0-1.0',
  creator:sourceLicense.creator,licenseDeed:sourceLicense.licenseDeed,
  originalReviewSourceCommit:sourceLicense.review.originalPreviewSourceCodeSha,
  originalReviewRunId:sourceLicense.review.githubRunId,
  clinicalValidated:false,fdiAnatomySupplied:false,assets:{}};
 fs.mkdirSync(path.join(dest,'cc0'),{recursive:true});
 for(const asset of selected){
  const manifest=sourceLicense.files.find(f=>f.candidateId===asset.id);
  const file=path.join(sourceAssets,asset.filename);
  if(!manifest||manifest.licenseAccepted!==true||manifest.originalSourceBytesUnmodified!==true||
    manifest.sha256!==asset.sha256||fs.statSync(file).size!==manifest.bytes||
    hashFile(file)!==asset.sha256)
   throw Error('Original reviewed CC0 source bytes/permissions drift for '+asset.id);
  // Godot 4.7.2 does NOT import the publisher's KHR_mesh_quantization.
  // Keep original bytes verbatim in a non-imported .bin asset; only a
  // separately derived, dequantized GLB is scanned as a Godot PackedScene.
  const originalName=asset.filename+'.original.bin';
  const originalCopy=path.join(dest,'cc0',originalName);
  fs.copyFileSync(file,originalCopy,fs.constants.COPYFILE_EXCL);
  if(hashFile(originalCopy)!==asset.sha256)
   throw Error('CC0 native original source changed in packaging '+asset.id);
  const derivedName=asset.filename.replace('-v1.glb','-godot-v1.glb');
  if(derivedName===asset.filename||!derivedName.endsWith('.glb'))
   throw Error('Unsafe derived CC0 model filename');
  const derived=path.join(dest,'cc0',derivedName);
  // glTF-Transform dequantize only: no decimation, editing, or added imagery.
  const npx=process.platform==='win32'?'npx.cmd':'npx';
  execFileSync(npx,['--yes','--package=@gltf-transform/cli@4.5.1',
     'gltf-transform','dequantize',file,derived],{stdio:'inherit',timeout:120000});
  if(!fs.existsSync(derived)||fs.statSync(derived).size<1000)
   throw Error('CC0 Godot compatibility dequantization missing '+asset.id);
  const d=fs.readFileSync(derived);
  if(d.toString('ascii',0,4)!=='glTF'||d.readUInt32LE(4)!==2||
     d.readUInt32LE(8)!==d.length||d.toString('ascii',16,20)!=='JSON')
   throw Error('Godot-derived CC0 is not a valid GLB v2 container');
  const json=JSON.parse(d.subarray(20,20+d.readUInt32LE(12)).toString('utf8'));
  if((json.extensionsRequired||[]).includes('KHR_mesh_quantization'))
   throw Error('CC0 derived GLB still requires unsupported mesh quantization');
  selectedManifest.assets[asset.id]={
   path:'res://cc0/'+originalName,sha256:asset.sha256,bytes:manifest.bytes,
   importPath:'res://cc0/'+derivedName,importSha256:hashFile(derived),
   importBytes:d.length,compatibilityConverter:'@gltf-transform/cli@4.5.1 dequantize',
   status:'STATIC_VISUAL_ONLY',publisher:manifest.sourceUrl};
 }
 fs.copyFileSync(path.join(sourceAssets,'README.md'),path.join(dest,'cc0','README-ORIGINAL-SOURCE.md'),fs.constants.COPYFILE_EXCL);
 const exported=path.join(dest,'source');
 // The historical SR1B source exporter must create this directory itself.
 // Keep generated CC0 provenance in memory until AFTER that immutable export.

 run(exportSource,['--output='+exported,'--expected-sha='+sha]);
 fs.writeFileSync(path.join(exported,'cc0-clinic-manifest.json'),
  JSON.stringify(selectedManifest,null,2)+'\n',{flag:'wx'});
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
  nativeReviewedCC0ClinicImportedFromExactOriginals:true,
  nativeReviewedCC0SourceSha256:selectedManifest.assets['whole-clinic-starter'].sha256,
  nativeReviewedCC0DerivedCompatibilitySha256:selectedManifest.assets['whole-clinic-starter'].importSha256,
  nativeReviewedCC0MeshAndPixelAcceptancePending:true,
  nativeFdi16EditableSampledVolume:true,otherCasesEditableVolume:true,
  sourceVerifiedEditableCases:expectedVolumes.map(([id,fdi])=>({id,fdi})),
  clinicalCalibrationVerified:false,
  fullInteractiveAppMigrated:false,verifiedNativeGpu:false,
  buildStatus:'NATIVE_GODOT_APP_PROJECT_BUILT_NEEDS_NATIVE_RUNTIME_QA',
  limitation:'Reviewed CC0 static environment and tray are packaged and checked; six original independent FDI case volumes remain synthetic. Native renderer/RTX workstation pixels and clinical anatomy/forces are NOT accepted; full browser parity, Quest/XR and AI remain incomplete.'
 };
 fs.writeFileSync(path.join(dest,'native-build-manifest.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
 console.log('KLINIKLAB_NATIVE_APP_PROJECT_CREATED: '+dest);
}catch(err){
 console.error('Build attempt incomplete; preserve output for forensics, use NEW unique path. '+String(err.message));
 process.exitCode=1;
}
