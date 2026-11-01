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
 for(const name of ['app.gd','app.tscn','project.godot','smoke.gd','volume-cut.gd','volume-cut-smoke.gd','multi-case-volume-smoke.gd','pulp-sample-smoke.gd','radiography-panel.gd','radiography-smoke.gd','fsp-kp-rubric.gd','fsp-kp-smoke.gd','direct-bur-smoke.gd','cc0-clinic.gd','cc0-clinic-smoke.gd','cc0-framing-smoke.gd','owner-pc-capture.gd','actual-app-smoke.gd','exported-app-capture.gd','raw-source-smoke.gd','atlas-viewer.gd','atlas-smoke.gd','scan-viewer.gd','scan-smoke.gd'])copy('native-godot/'+name,name);
 copy('native-godot/main-raw-sidecar.gd','main.gd');
 copy('visual-qa/godot-local-clinical/main.tscn','main.tscn');
 copy('native-godot/raw-source.gd','raw-source.gd');
 for(const name of ['sr1c-godot-clinic-overview.gd'])copy('visual-qa/'+name,name);
 const exportSource=path.join(src,'visual-qa/sr1-local-kliniklab-export.mjs');
 const exportCases=path.join(root,'visual-qa/sr1d-export-native-cases.mjs');
 const exportContent=path.join(root,'native-godot/export-content.mjs');
 function run(script,args){
  execFileSync(process.execPath,[script,...args],{stdio:'inherit',timeout:90000});
 }
 // The whole-clinic starter is the SAME exact reviewed GLB as the model
 // named "Dental practice floor" in the 54-piece source pack. Do not
 // duplicate the full pack or confuse equipment assets with anatomy.
 const cc0Path=path.join(root,'assets/cc0/3dassets-dental');
 const fullPack=path.join(root,'visual-qa/asset-research/assets/dental-practice-cc0-v1');
 const approved=JSON.parse(fs.readFileSync(path.join(cc0Path,'source-manifest.json'),'utf8'));
 const approvedFiles=[
  ['whole-clinic-starter-v1.glb','Dental practice floor (Dental Practice and Surgery).glb',
   '9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a',1177948],
  ['instrument-tray-v1.glb','Instrument Tray (Dental Practice and Surgery).glb',
   '63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036',30452]
 ];
 const crypto=await import('node:crypto');
 const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
 if(approved.licenseSPDX!=='CC0-1.0'||approved.status!=='REVIEWED_CC0_STATIC_VISUAL_PROTOTYPES_ONLY'||
   approved.files?.length!==2||approved.review?.clinicalAccepted!==false)
  throw Error('CC0 license or native review contract drift');
 const cc0Dest=path.join(dest,'assets/cc0/3dassets-dental');
 fs.mkdirSync(cc0Dest,{recursive:true});
 const {convert}=await import('./dequantize-cc0.mjs');
 const caseAssets=[];
 for(const [file,original,hash,bytes] of approvedFiles){
  const row=approved.files.find(x=>x.destFilename===file);
  if(!row||row.sha256!==hash||row.bytes!==bytes||row.licenseAccepted!==true||
     row.clinicalStatus!=='NOT_VALIDATED'||row.originalSourceBytesUnmodified!==true)
    throw Error('CC0 source license/metadata mismatch: '+file);
  const reviewedPath=path.join(cc0Path,file),packPath=path.join(fullPack,original);
  if(!fs.existsSync(reviewedPath)||!fs.existsSync(packPath)||
     fs.statSync(reviewedPath).size!==bytes||fs.statSync(packPath).size!==bytes||
     sha256(fs.readFileSync(reviewedPath))!==hash||sha256(fs.readFileSync(packPath))!==hash)
    throw Error('Reviewed GLB differs from same-source 54-model pack: '+file);
  // Keep original binary byte-for-byte, but avoid Godot trying to import
  // the unsupported quantized GLB as a resource. .source is raw evidence.
  const originalName=file+'.source';
  const destFile=path.join(cc0Dest,originalName);
  fs.copyFileSync(reviewedPath,destFile,fs.constants.COPYFILE_EXCL);
  if(sha256(fs.readFileSync(destFile))!==hash)throw Error('Native GLB package corruption: '+file);
  // Godot 4.7.2 does not parse the original KHR_mesh_quantization extension.
  // Dequantize mesh vertex attributes into float32, leaving original file
  // untouched. Preserve exact original GLB hashes, nodal transforms, materials.
  const compatible=convert(fs.readFileSync(reviewedPath),hash);
  const convertedName=file.replace(/\.glb$/, '-godot.glb');
  fs.writeFileSync(path.join(cc0Dest,convertedName),compatible.bytes,{flag:'wx'});
  if(sha256(fs.readFileSync(path.join(cc0Dest,convertedName)))!==compatible.convertedSha256 ||
    compatible.convertedAccessors<1)throw Error('CC0 Godot GLB compatibility export failed');
  caseAssets.push({name:file,originalFile:originalName,sha256:hash,bytes,
   godotFile:convertedName,godotSha256:compatible.convertedSha256,
   godotBytes:compatible.bytes.length,godotFloat32Accessors:compatible.convertedAccessors,
   sourcePackName:original,
   role:file.startsWith('whole-')?'assembledStaticEnvironment':'staticInstrumentProp'});
 }
 const clinicManifest={
  schemaVersion:1,kind:'REVIEWED_CC0_NATIVE_CLINIC_BACKGROUND_NOT_CLINICAL_APP_ANATOMY',
  sourceGitSHA:sha,licenseSPDX:'CC0-1.0',publisher:approved.packSource,
  reviewedAssetManifestSHA256:sha256(fs.readFileSync(path.join(cc0Path,'source-manifest.json'))),
  sourcePackReconciledBySHA256:true,
  godotConversion:'DETERMINISTIC_FLOAT32_VERTEX_ACCESSORS_PRESERVE_ORIGINAL_KHR_QUANTIZED_GLB',
  godotConverterSHA256:sha256(fs.readFileSync(path.join(root,'native-godot/dequantize-cc0.mjs'))),
  clinicalAccuracyValidated:false,
  fullAppParityValidated:false,assets:caseAssets
 };
 fs.writeFileSync(path.join(cc0Dest,'clinic-manifest.json'),JSON.stringify(clinicManifest,null,2)+'\n',{flag:'wx'});
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
  nativeCc0WholeClinicStaticEnvironment:true,
  nativeCc0InstrumentTrayProp:true,
  nativeCc0Hashes:caseAssets.map(x=>({name:x.name,sha256:x.sha256})),
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
