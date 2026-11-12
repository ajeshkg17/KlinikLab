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
 for(const name of ['app.gd','app.tscn','project.godot','smoke.gd','volume-cut.gd','volume-cut-smoke.gd','multi-case-volume-smoke.gd','pulp-sample-smoke.gd','radiography-panel.gd','radiography-smoke.gd','fsp-kp-rubric.gd','fsp-kp-smoke.gd','direct-bur-smoke.gd','cc0-clinic.gd','cc0-clinic-smoke.gd','tooth36-reference.gd','tooth26-reference.gd','tooth16-mirror-reference.gd','fdi-reference-clearance.gd','anatomy-reference-panel.gd','visual-layout-smoke.gd','clinic-walk-intent.gd','clinic-walk-smoke.gd','guided-practical-smoke.gd','practical-choice-smoke.gd','practical-fdi-recall-smoke.gd','practical-strict-compat-smoke.gd','practical-run-score.gd','practical-replay-smoke.gd','practical-case-sequence.gd','practical-case-sequence-smoke.gd','practice-sequence-live-smoke.gd','practice-sequence-scene-identity-smoke.gd','practice-room-game.gd','practice-tool-handling.gd','procedure-drills.gd','procedure-scenarios.gd','procedure-lab.gd','procedure-lab-trial.gd','practice-expansion-smoke.gd','practice-room-game-smoke.gd','practice-room-game-app-smoke.gd','practical-tool-completion-smoke.gd','owner-pc-capture.gd','actual-app-smoke.gd','exported-app-capture.gd','exported-app-capture-node.gd','raw-source-smoke.gd','atlas-viewer.gd','atlas-smoke.gd','scan-viewer.gd','scan-smoke.gd'])copy('native-godot/'+name,name);
 for(const name of ['chairside-bench.gd','chairside-catalog.gd','chairside-model-preview.gd','tools-inventory-catalog.gd','tools-inventory-panel.gd','composite-inspection-trial.gd','sealant-inspection-trial.gd','fluoride-inspection-trial.gd','cleaning-inspection-trial.gd','root-planing-inspection-trial.gd','chart-inspection-trial.gd','bitewing-inspection-trial.gd','oral-exam-inspection-trial.gd','veneer-inspection-trial.gd','inlay-inspection-trial.gd','crown-inspection-trial.gd','bridge-inspection-trial.gd','full-denture-inspection-trial.gd','partial-denture-inspection-trial.gd','implant-inspection-trial.gd','endo-inspection-trial.gd','retreat-inspection-trial.gd','aligner-inspection-trial.gd','mouthguard-inspection-trial.gd','extraction-bench-inspection-trial.gd','furcation-inspection-trial.gd','bitewing-holder-inspection-trial.gd','endo-file-inspection-trial.gd','denture-wax-rim-inspection-trial.gd'])
  copy('native-godot/'+name,name);
 const gloveDir = 'assets/xr-gloves';
 fs.mkdirSync(path.join(dest,gloveDir),{recursive:true});
 for (const name of ['Hand_Glove_L.gltf','Hand_Glove_R.gltf','LICENSE','SOURCE.md']) {
  copy('native-godot/'+gloveDir+'/'+name,gloveDir+'/'+name);
 }
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
 // This experimental branch MUST NOT reuse the ordinary learner's user://.
 // The builder refuses an existing output folder; hashing that path gives a
 // distinct desktop user-data directory for every isolated game build.
 const userDir='KlinikLabPracticeRebuild-'+crypto.createHash('sha256').update(dest).digest('hex').slice(0,20);
 const settingsPath=path.join(dest,'project.godot');
 const oldSettings=fs.readFileSync(settingsPath,'utf8');
 const nameLine='config/name="KlinikLab Native — source-derived training foundation"';
 if(!oldSettings.includes(nameLine))throw Error('Cannot set isolated Practice Game user directory');
 fs.writeFileSync(settingsPath,oldSettings.replace(nameLine,
   nameLine+'\nconfig/use_custom_user_dir=true\nconfig/custom_user_dir_name="'+userDir+'"'));
 fs.writeFileSync(path.join(dest,'practice-game-userdir.txt'),userDir+'\n',{flag:'wx'});
 const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
 if(approved.licenseSPDX!=='CC0-1.0'||approved.status!=='REVIEWED_CC0_STATIC_VISUAL_PROTOTYPES_ONLY'||
   approved.files?.length!==2||approved.review?.clinicalAccepted!==false)
  throw Error('CC0 license or native review contract drift');
 const cc0Dest=path.join(dest,'assets/cc0/3dassets-dental');
 fs.mkdirSync(cc0Dest,{recursive:true});
 const {convert}=await import('./dequantize-cc0.mjs');
 // Reuse exactly the composite example's two CC0 study instruments.
 // Sealant does not introduce new 3D downloads, geometry, or clinical claims.
 const benchDir=path.join(dest,'assets/bench');
 fs.mkdirSync(benchDir,{recursive:true});
 // This is original synthetic training geometry, not a CC0 downloaded asset.
 copy('native-godot/assets/bench/synthetic-varnish-applicator.tscn','assets/bench/synthetic-varnish-applicator.tscn');
 copy('native-godot/assets/bench/synthetic-polishing-cup.tscn','assets/bench/synthetic-polishing-cup.tscn');
 copy('native-godot/assets/bench/synthetic-periodontal-probe.tscn','assets/bench/synthetic-periodontal-probe.tscn');
 copy('native-godot/assets/bench/synthetic-image-pointer.tscn','assets/bench/synthetic-image-pointer.tscn');
 copy('native-godot/assets/bench/synthetic-examination-mirror.tscn','assets/bench/synthetic-examination-mirror.tscn');
 copy('native-godot/assets/bench/synthetic-veneer-shell.tscn','assets/bench/synthetic-veneer-shell.tscn');
 copy('native-godot/assets/bench/synthetic-inlay-insert.tscn','assets/bench/synthetic-inlay-insert.tscn');
 copy('native-godot/assets/bench/synthetic-crown-shell.tscn','assets/bench/synthetic-crown-shell.tscn');
 copy('native-godot/assets/bench/synthetic-bridge-framework.tscn','assets/bench/synthetic-bridge-framework.tscn');
 copy('native-godot/assets/bench/synthetic-complete-denture.tscn','assets/bench/synthetic-complete-denture.tscn');
 copy('native-godot/assets/bench/synthetic-partial-denture.tscn','assets/bench/synthetic-partial-denture.tscn');
 copy('native-godot/assets/bench/synthetic-implant-crown.tscn','assets/bench/synthetic-implant-crown.tscn');
 copy('native-godot/assets/bench/synthetic-canal-tracing-stylus.tscn','assets/bench/synthetic-canal-tracing-stylus.tscn');
 copy('native-godot/assets/bench/synthetic-record-comparison-pointer.tscn','assets/bench/synthetic-record-comparison-pointer.tscn');
 copy('native-godot/assets/bench/synthetic-aligner-stage04.tscn','assets/bench/synthetic-aligner-stage04.tscn');
 copy('native-godot/assets/bench/synthetic-sports-mouthguard.tscn','assets/bench/synthetic-sports-mouthguard.tscn');
 copy('native-godot/assets/bench/synthetic-training-forceps.tscn','assets/bench/synthetic-training-forceps.tscn');
 const packIndex=JSON.parse(fs.readFileSync(path.join(fullPack,'download-index.json'),'utf8'));
 const benchModels=[
  ['curing-light.glb','34385','Curing Light (Dental Practice and Surgery).glb',
   '59c21274e9bed7b1c1239a7a04091685f1eb41dedf4a9acdb4cfdd864cb500f7'],
  ['ultrasonic-scaler.glb','34384','Ultrasonic Scaler (Dental Practice and Surgery).glb',
   '5e83a4f0be8c36c40d77997a6f9dfe0d406f6ea9f427f41079cee405d7354bd1']
 ];
 const benchSources=benchModels.map(([filename,id,original,sourceSha256])=>{
  const source='https://cdn.3dassets.dev/assets/'+id+'/v1/model.glb';
  const row=packIndex.find(asset=>asset.id===id);
  if(row?.file!==original||row.source!==source||
     row.sha256?.toLowerCase()!==sourceSha256)
   throw Error('Bench model provenance mismatch: '+original);
  const bytes=fs.readFileSync(path.join(fullPack,original));
  if(bytes.length!==row.bytes||sha256(bytes)!==sourceSha256)
   throw Error('Bench model does not match the catalogued source: '+original);
  const compatible=convert(bytes,sourceSha256);
  fs.writeFileSync(path.join(benchDir,filename),compatible.bytes,{flag:'wx'});
  return {filename,source,sourceSha256,godotSha256:compatible.convertedSha256,
   author:row.attribution,licenseSPDX:'CC0-1.0',role:'schematicInstrumentStudyModel'};
 });
 fs.writeFileSync(path.join(benchDir,'source-manifest.json'),JSON.stringify(benchSources,null,2)+'\n',{flag:'wx'});
 // Six additional instrument/equipment study props from the already downloaded
 // 54-model CC0 source pack. Never fetch unpinned downloads during a build.
 // Existing chairside bench models and selected/expected IDs remain unchanged.
 const inventoryModels=[
  ["instrument-tray.glb","34383","Instrument Tray (Dental Practice and Surgery).glb","63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036"],
  ["impression-trays.glb","34400","Impression Tray Set (Dental Practice and Surgery).glb","3554076056979242bc95c42b5e324a685f46cbfb85c32a99c2d16d911612784e"],
  ["xray-sensor-tray.glb","34388","Xray Sensor Tray (Dental Practice and Surgery).glb","82481e8a1defdb16fbcc32570c02e27e11743de32a9f29ab6e07d0a491d38e46"],
  ["suction-unit.glb","34378","Suction Unit (Dental Practice and Surgery).glb","14425c3e714ec741dae1ad2af5e2b36984db5c05fb80834e3ad869e09a207018"],
  ["articulator.glb","34398","Articulator With Model (Dental Practice and Surgery).glb","5f548d4efe6d27aa518b97393270df36222a07537ba4827dd232e4d35d5ed2d9"],
  ["ultrasonic-cleaner.glb","34393","Ultrasonic Cleaner Bath (Dental Practice and Surgery).glb","090a49b1c7bfb186458fceace6c5dade85dc510921be8bb5b78dcb042086539d"]
 ];
 const inventoryDir=path.join(dest,'assets/inventory');
 fs.mkdirSync(inventoryDir,{recursive:true});
 // Original schematic handheld instrument meshes: visual recognition only.
 // These are not source-pack downloads and are never used as clinical geometry.
 for(const filename of ['synthetic-explorer-23.tscn','synthetic-college-pliers.tscn','synthetic-spoon-excavator.tscn','synthetic-ball-burnisher.tscn','synthetic-k-file.tscn','synthetic-finger-spreader.tscn','synthetic-sickle-scaler.tscn','synthetic-composite-spatula.tscn'])
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
 // Original, self-contained schematic tool meshes (not downloaded CAD).
 // Their study labels and uncalibrated geometry must not affect chair simulations.
 const additionalHandToolScenes=["synthetic-high-speed-handpiece.tscn","synthetic-contra-angle-handpiece.tscn","synthetic-straight-handpiece.tscn","synthetic-round-bur.tscn","synthetic-pear-bur-330.tscn","synthetic-endo-z-bur.tscn","synthetic-rubber-dam-clamp.tscn","synthetic-rubber-dam-clamp-forceps.tscn","synthetic-straight-elevator.tscn","synthetic-extraction-forceps.tscn"];
 for(const filename of additionalHandToolScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Independent original teaching meshes, not downloaded clinical geometry.
 // These static study props are read-only and do not change chair tasks.
 const assistantRestorativeScenes=["synthetic-air-water-syringe.tscn","synthetic-hve-evacuator-tip.tscn","synthetic-saliva-ejector.tscn","synthetic-aspirating-cartridge-syringe.tscn","synthetic-tofflemire-matrix-retainer.tscn","synthetic-sectional-matrix-ring.tscn","synthetic-interdental-wooden-wedge.tscn","synthetic-rubber-dam-frame.tscn","synthetic-endodontic-apex-locator.tscn","synthetic-dental-bite-block.tscn"];
 for(const filename of assistantRestorativeScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Additional authored prosthodontic/orthodontic schematic study geometry.
 // No vendor CAD downloads, clinical dimensions, scoring or chair modifications.
 const prosthoOrthoScenes=["synthetic-impression-dispenser.tscn","synthetic-articulating-paper-forceps.tscn","synthetic-crown-remover.tscn","synthetic-crown-bridge-scissors.tscn","synthetic-bracket-holder.tscn","synthetic-distal-end-cutter.tscn","synthetic-ligature-cutter.tscn","synthetic-weingart-pliers.tscn","synthetic-bracket-remover.tscn","synthetic-orthodontic-band-pusher.tscn"];
 for(const filename of prosthoOrthoScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Independent original schematic periodontal/surgical/endodontic models.
 const perioSurgeryScenes=["synthetic-gracey-curette.tscn","synthetic-universal-curette.tscn","synthetic-hoe-scaler.tscn","synthetic-scalpel-handle.tscn","synthetic-periosteal-elevator.tscn","synthetic-tissue-forceps.tscn","synthetic-needle-holder.tscn","synthetic-mosquito-hemostat.tscn","synthetic-endo-plugger.tscn","synthetic-endo-irrigation-syringe.tscn"];
 for(const filename of perioSurgeryScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Ten additional original schematic restorative and preventive tool scenes.
 // This only copies local assets into the independent, read-only inventory.
 const finishingAccessoryScenes=["synthetic-retraction-cord-packer.tscn","synthetic-sectional-matrix-forceps.tscn","synthetic-composite-compule-gun.tscn","synthetic-finishing-strip.tscn","synthetic-polishing-disc-mandrel.tscn","synthetic-prophylaxis-polishing-cup.tscn","synthetic-cement-mixing-spatula.tscn","synthetic-dental-microbrush.tscn","synthetic-paper-point-dispenser.tscn","synthetic-rubber-dam-hole-punch.tscn"];
 for(const filename of finishingAccessoryScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Original oral-surgery and implant study geometries; no downloaded CAD.
 // Read-only 3D inventory use only, independent of chair/journal behavior.
 const surgeryImplantScenes=["synthetic-minnesota-retractor.tscn","synthetic-frazier-aspirator.tscn","synthetic-friedman-rongeur.tscn","synthetic-miller-colburn-bone-file.tscn","synthetic-lucas-bone-curette.tscn","synthetic-implant-torque-wrench.tscn","synthetic-implant-hand-driver.tscn","synthetic-implant-tissue-punch.tscn","synthetic-bone-graft-packer.tscn","synthetic-bone-grafting-syringe.tscn"];
 for(const filename of surgeryImplantScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Original static diagnostic and radiography study models (not acquired images).
 // No change to clinical bench actions, scoring, or patient study data.
 const diagnosticImagingScenes=["synthetic-wired-cmos-sensor.tscn","synthetic-psp-radiography-plate.tscn","synthetic-bitewing-receptor-holder.tscn","synthetic-xcp-aiming-ring-and-arm.tscn","synthetic-endo-radiograph-holder.tscn","synthetic-intraoral-camera.tscn","synthetic-tooth-shade-guide.tscn","synthetic-occlusal-photography-mirror.tscn","synthetic-electric-pulp-tester.tscn","synthetic-transillumination-wand.tscn"];
 for(const filename of diagnosticImagingScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Original static dental laboratory and impression meshes; not downloaded CAD.
 // Do not touch original clinical benches, learner progress, or journal.
 const laboratoryImpressionScenes=["synthetic-alginate-mixing-bowl.tscn","synthetic-alginate-mixing-spatula.tscn","synthetic-plaster-mixing-spatula.tscn","synthetic-fahnenstock-wax-knife.tscn","synthetic-le-cron-wax-carver.tscn","synthetic-boley-caliper.tscn","synthetic-denture-cleaning-brush.tscn","synthetic-articulator-mounting-plate.tscn","synthetic-bite-registration-wax-rim.tscn","synthetic-dental-wax-heater.tscn"];
 for(const filename of laboratoryImpressionScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Ten locally authored nonfunctional advanced endodontic study props.
 // Copy-only integration; no chair scoring, patient simulation or learner-data changes.
 const advancedEndodonticScenes=["synthetic-hedstrom-h-file.tscn","synthetic-niti-rotary-file.tscn","synthetic-gates-glidden-drill.tscn","synthetic-peeso-reamer.tscn","synthetic-endodontic-measuring-ruler.tscn","synthetic-endodontic-file-stand.tscn","synthetic-gutta-percha-point-box.tscn","synthetic-endodontic-motor.tscn","synthetic-heated-obturation-pen.tscn","synthetic-gutta-percha-backfill-gun.tscn"];
 for(const filename of advancedEndodonticScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Original schematic orthodontic bending/aligner study geometries.
 // Local read-only inventory assets only; no chair lesson or profile mutation.
 const orthoAlignmentScenes=["synthetic-bird-beak-pliers.tscn","synthetic-three-prong-pliers.tscn","synthetic-adams-pliers.tscn","synthetic-mathieu-ligature-pliers.tscn","synthetic-elastic-separating-pliers.tscn","synthetic-boone-bracket-height-gauge.tscn","synthetic-orthodontic-ligature-director.tscn","synthetic-tweed-loop-pliers.tscn","synthetic-orthodontic-torquing-turret.tscn","synthetic-aligner-removal-hook.tscn"];
 for(const filename of orthoAlignmentScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  // Ten original local static periodontal assessment, surgery and implant maintenance studies.
 // Read-only inventory only; no changes to chair lessons, grading, or learner files.
 const periodontalAssessmentScenes=["synthetic-unc15-periodontal-probe.tscn","synthetic-who-cpi-periodontal-probe.tscn","synthetic-nabers-furcation-probe.tscn","synthetic-goldman-fox-pocket-marker.tscn","synthetic-kirkland-gingivectomy-knife.tscn","synthetic-orban-interdental-knife.tscn","synthetic-goldman-fox-periodontal-scissors.tscn","synthetic-hirschfeld-periodontal-file.tscn","synthetic-ochsenbein-periodontal-chisel.tscn","synthetic-implant-polymer-scaler.tscn"];
 for(const filename of periodontalAssessmentScenes)
  copy('native-godot/assets/inventory/'+filename,'assets/inventory/'+filename);
  const inventorySources=inventoryModels.map(([filename,id,original,sourceSha256])=>{
  const source='https://cdn.3dassets.dev/assets/'+id+'/v1/model.glb';
  const row=packIndex.find(asset=>asset.id===id);
  if(row?.file!==original||row.source!==source||
     row.sha256?.toLowerCase()!==sourceSha256||
     row.license!=='CC0 1.0 Universal')
   throw Error('Dental inventory model provenance mismatch: '+original);
  const bytes=fs.readFileSync(path.join(fullPack,original));
  if(bytes.length!==row.bytes||sha256(bytes)!==sourceSha256)
   throw Error('Dental inventory source hash mismatch: '+original);
  const originalPath=path.join(inventoryDir,filename+'.source');
  fs.copyFileSync(path.join(fullPack,original),originalPath,fs.constants.COPYFILE_EXCL);
  if(sha256(fs.readFileSync(originalPath))!==sourceSha256)
   throw Error('Dental inventory original source-copy mismatch: '+original);
  const compatible=convert(bytes,sourceSha256);
  fs.writeFileSync(path.join(inventoryDir,filename),compatible.bytes,{flag:'wx'});
  if(sha256(fs.readFileSync(path.join(inventoryDir,filename)))!==compatible.convertedSha256)
   throw Error('Dental inventory converted model hash mismatch: '+original);
  return {id,filename,source,sourceSha256,godotSha256:compatible.convertedSha256,
   originalSourceFile:filename+'.source',publisher:row.attribution,
   licenseSPDX:'CC0-1.0',role:'staticDentalInventoryStudyProp',
   clinicalAccuracyValidated:false};
 });
 fs.writeFileSync(path.join(inventoryDir,'source-manifest.json'),
  JSON.stringify({schemaVersion:1,sourceGitSHA:sha,assets:inventorySources},null,2)+'\n',{flag:'wx'});

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
 // Optional source-pack chair: distinct real GLB, not an anatomy model.
 // Missing source bytes are explicit and nonfatal; mismatched present bytes fail closed.
 const chairSource='Dental Chair (Dental Practice and Surgery).glb';
 const chairHash='360ab5f97393f2cf0c8ba99e4d776d1a5d3e50d33889ec633f8eee03919bcfdd';
 const chairPath=path.join(fullPack,chairSource);
 const optionalChair={sourcePackName:chairSource,sha256:chairHash,bytes:41804,
  name:'operatory-chair-v1.glb',godotFile:'operatory-chair-v1-godot.glb',
  available:false,role:'staticOperatoryChair',clinicalAccuracyValidated:false};
 if(fs.existsSync(chairPath)){
  const bytes=fs.readFileSync(chairPath);
  if(bytes.length!==optionalChair.bytes||sha256(bytes)!==chairHash)
   throw Error('Optional chair source bytes differ from catalogued SHA256');
  fs.copyFileSync(chairPath,path.join(cc0Dest,'operatory-chair-v1.glb.source'),fs.constants.COPYFILE_EXCL);
  const compatible=convert(bytes,chairHash);
  fs.writeFileSync(path.join(cc0Dest,optionalChair.godotFile),compatible.bytes,{flag:'wx'});
  optionalChair.godotSha256=compatible.convertedSha256;
  optionalChair.available=true;
 }
 // First separately sourced tooth surface: Dundee mandibular left first molar, FDI 36.
 // Verify the upstream Git blob identity before any conversion; keep original bytes.
 const toothSource=path.join(root,'assets/dundee/mandibular_first_molar.glb');
 const toothBytes=fs.readFileSync(toothSource);
 const toothBlobSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+toothBytes.length+'\0'),toothBytes])).digest('hex');
 const expectedToothBlob='73e9f3029d770c6b4052ebbaba708283de4c47fd';
 if(toothBlobSha!==expectedToothBlob)throw Error('Dundee FDI36 source Git blob identity mismatch');
 const toothDir=path.join(dest,'assets/dundee');
 fs.mkdirSync(toothDir,{recursive:true});
 const toothOriginalName='mandibular_first_molar.glb.source';
 const toothOriginalPath=path.join(toothDir,toothOriginalName);
 fs.writeFileSync(toothOriginalPath,toothBytes,{flag:'wx'});
 const toothOriginalSha256=sha256(fs.readFileSync(toothOriginalPath));
 if(toothOriginalSha256!==sha256(toothBytes))throw Error('Dundee FDI36 original byte copy changed');
 const toothConvertedName='mandibular_first_molar-godot.glb';
 const toothConvertedPath=path.join(toothDir,toothConvertedName);
 const toothDecoder=path.join(root,'native-godot/decode-draco-tooth.mjs');
 const toothDecodeArgs=[
  '--input='+toothOriginalPath,
  '--decoder-js='+path.join(root,'assets/draco/draco_decoder_gltf.js'),
  '--decoder-wasm='+path.join(root,'assets/draco/draco_decoder_gltf.wasm'),
  '--expected-blob-sha='+expectedToothBlob
 ];
 run(toothDecoder,[...toothDecodeArgs,'--output='+toothConvertedPath]);
 const toothConvertedSha256=sha256(fs.readFileSync(toothConvertedPath));
 const toothConvertedSidecar=toothConvertedPath+'.source';
 fs.copyFileSync(toothConvertedPath,toothConvertedSidecar,fs.constants.COPYFILE_EXCL);
 if(sha256(fs.readFileSync(toothConvertedSidecar))!==toothConvertedSha256)throw Error('Dundee FDI36 converted raw sidecar checksum mismatch');
 const toothTrainingName='mandibular_first_molar-training.glb';
 const toothTrainingPath=path.join(toothDir,toothTrainingName);
 run(toothDecoder,[...toothDecodeArgs,'--output='+toothTrainingPath,'--preserve-texture=true']);
 const toothTrainingSidecar=toothTrainingName+'.source';
 const toothTrainingSidecarPath=path.join(toothDir,toothTrainingSidecar);
 const toothTrainingSha256=sha256(fs.readFileSync(toothTrainingPath));
 fs.copyFileSync(toothTrainingPath,toothTrainingSidecarPath,fs.constants.COPYFILE_EXCL);
 if(sha256(fs.readFileSync(toothTrainingSidecarPath))!==toothTrainingSha256)throw Error('Dundee FDI36 training raw sidecar checksum mismatch');
 const toothManifest={
  schemaVersion:1,sourceGitSHA:sha,caseId:'endo',fdi:'36',
  sourceFile:'mandibular_first_molar.glb',runtimeFile:toothConvertedName,
  originalSidecar:toothOriginalName,originalSha256:toothOriginalSha256,
  convertedSidecar:'mandibular_first_molar-godot.glb.source',
  originalGitBlobSha:expectedToothBlob,
  upstreamRepository:'sameralseedbth-Dental/dental-3d-models',
  upstreamCommit:'4f0ffb651998a4641ddf45c7632ea236cc164fcb',
  upstreamPath:'mandibular_first_molar.glb',
  upstreamSourceUrl:'https://github.com/sameralseedbth-Dental/dental-3d-models/blob/4f0ffb651998a4641ddf45c7632ea236cc164fcb/mandibular_first_molar.glb',
  licenseSPDX:'CC-BY-4.0',
  attribution:'3D tooth model © University of Dundee, School of Dentistry',
  licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
  sourceCollectionUrl:'https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f',
  convertedSha256:toothConvertedSha256,sourceGitBlobVerified:true,
  trainingRuntimeFile:toothTrainingName,trainingSidecar:toothTrainingSidecar,
  trainingSha256:toothTrainingSha256,trainingTexturePreserved:true,
  surfaceOnly:true,internalTissuesProvided:false,texturePreserved:false,
  clinicalAccuracyValidated:false,qualifiedAnatomyReviewPending:true,
  role:'FDI36_STATIC_SURFACE_REFERENCE_NOT_EDITABLE_TISSUE_VOLUME'
 };
 // Next exact-side Dundee surface: maxillary left first molar, FDI 26 crown case.
 // Verify the upstream Git blob identity before any conversion; keep original bytes.
 const tooth26Source=path.join(root,'assets/dundee/maxillary_first_molar.glb');
 const tooth26Bytes=fs.readFileSync(tooth26Source);
 const tooth26BlobSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+tooth26Bytes.length+'\0'),tooth26Bytes])).digest('hex');
 const expectedTooth26Blob='0948d093089c5921281185a103b323c513365502';
 if(tooth26BlobSha!==expectedTooth26Blob)throw Error('Dundee FDI26 source Git blob identity mismatch');
 const tooth26Dir=path.join(dest,'assets/dundee');
 fs.mkdirSync(tooth26Dir,{recursive:true});
 const tooth26OriginalName='maxillary_first_molar.glb.source';
 const tooth26OriginalPath=path.join(tooth26Dir,tooth26OriginalName);
 fs.writeFileSync(tooth26OriginalPath,tooth26Bytes,{flag:'wx'});
 const tooth26OriginalSha256=sha256(fs.readFileSync(tooth26OriginalPath));
 if(tooth26OriginalSha256!==sha256(tooth26Bytes))throw Error('Dundee FDI26 original byte copy changed');
 const tooth26ConvertedName='maxillary_first_molar-godot.glb';
 const tooth26ConvertedPath=path.join(tooth26Dir,tooth26ConvertedName);
 run(path.join(root,'native-godot/decode-draco-tooth.mjs'),[
  '--input='+tooth26OriginalPath,'--output='+tooth26ConvertedPath,
  '--decoder-js='+path.join(root,'assets/draco/draco_decoder_gltf.js'),
  '--decoder-wasm='+path.join(root,'assets/draco/draco_decoder_gltf.wasm'),
  '--expected-blob-sha='+expectedTooth26Blob
 ]);
 const tooth26ConvertedSha256=sha256(fs.readFileSync(tooth26ConvertedPath));
 const tooth26ConvertedSidecar=tooth26ConvertedPath+'.source';
 fs.copyFileSync(tooth26ConvertedPath,tooth26ConvertedSidecar,fs.constants.COPYFILE_EXCL);
 if(sha256(fs.readFileSync(tooth26ConvertedSidecar))!==tooth26ConvertedSha256)throw Error('Dundee FDI26 converted raw sidecar checksum mismatch');
 const tooth26Manifest={
  schemaVersion:1,sourceGitSHA:sha,caseId:'crown',fdi:'26',
  sourceFile:'maxillary_first_molar.glb',runtimeFile:tooth26ConvertedName,
  originalSidecar:tooth26OriginalName,originalSha256:tooth26OriginalSha256,
  convertedSidecar:'maxillary_first_molar-godot.glb.source',
  originalGitBlobSha:expectedTooth26Blob,
  upstreamRepository:'sameralseedbth-Dental/dental-3d-models',
  upstreamCommit:'4f0ffb651998a4641ddf45c7632ea236cc164fcb',
  upstreamPath:'maxillary_first_molar.glb',
  upstreamSourceUrl:'https://github.com/sameralseedbth-Dental/dental-3d-models/blob/4f0ffb651998a4641ddf45c7632ea236cc164fcb/maxillary_first_molar.glb',
  licenseSPDX:'CC-BY-4.0',
  attribution:'3D tooth model © University of Dundee, School of Dentistry',
  licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
  sourceCollectionUrl:'https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f',
  convertedSha256:tooth26ConvertedSha256,sourceGitBlobVerified:true,
  surfaceOnly:true,internalTissuesProvided:false,texturePreserved:false,
  clinicalAccuracyValidated:false,qualifiedAnatomyReviewPending:true,
  role:'FDI26_STATIC_SURFACE_REFERENCE_NOT_EDITABLE_TISSUE_VOLUME'
 };
 const clinicManifest={
  schemaVersion:1,kind:'REVIEWED_CC0_NATIVE_CLINIC_BACKGROUND_NOT_CLINICAL_APP_ANATOMY',
  sourceGitSHA:sha,licenseSPDX:'CC0-1.0',publisher:approved.packSource,
  reviewedAssetManifestSHA256:sha256(fs.readFileSync(path.join(cc0Path,'source-manifest.json'))),
  sourcePackReconciledBySHA256:true,
  godotConversion:'DETERMINISTIC_FLOAT32_VERTEX_ACCESSORS_PRESERVE_ORIGINAL_KHR_QUANTIZED_GLB',
  godotConverterSHA256:sha256(fs.readFileSync(path.join(root,'native-godot/dequantize-cc0.mjs'))),
  clinicalAccuracyValidated:false,
  fullAppParityValidated:false,cataloguedSourceGLBs:54,assets:caseAssets,optionalChair
 };
 fs.writeFileSync(path.join(cc0Dest,'clinic-manifest.json'),JSON.stringify(clinicManifest,null,2)+'\n',{flag:'wx'});
 const exported=path.join(dest,'source');
 run(exportSource,['--output='+exported,'--expected-sha='+sha]);
 fs.writeFileSync(path.join(exported,'tooth-fdi36-manifest.json'),JSON.stringify(toothManifest,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(exported,'tooth-fdi26-manifest.json'),JSON.stringify(tooth26Manifest,null,2)+'\n',{flag:'wx'});
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
  nativeCc0ChairOptionalAvailable:optionalChair.available,
  nativeDundeeFDI36SurfaceReference:true,
  nativeDundeeFDI36SourceGitBlobSHA:expectedToothBlob,
  nativeDundeeFDI36OriginalSHA256:toothOriginalSha256,
  nativeDundeeFDI36ConvertedSHA256:toothConvertedSha256,
  nativeDundeeFDI36License:'CC-BY-4.0',
  nativeDundeeFDI36SurfaceOnly:true,
  nativeDundeeFDI26SurfaceReference:true,
  nativeDundeeFDI26SourceGitBlobSHA:expectedTooth26Blob,
  nativeDundeeFDI26OriginalSHA256:tooth26OriginalSha256,
  nativeDundeeFDI26ConvertedSHA256:tooth26ConvertedSha256,
  nativeDundeeFDI26License:'CC-BY-4.0',nativeDundeeFDI26SurfaceOnly:true,
  cataloguedSourceGLBs:54,requiredCC0GLBs:2,optionalRealChairGLBs:optionalChair.available?1:0,
  nativeCc0Hashes:caseAssets.map(x=>({name:x.name,sha256:x.sha256})),
  nativeChairsideBenchShared:true,chairsideLessons:['composite','sealant','fluoride','cleaning','root_planing','chart','bitewing','oral_exam','veneer','inlay','crown','bridge','full_denture','partial_denture','implant','endo','retreat','aligner','mouthguard','extraction'],
  nativeChairsideCc0Models:benchSources.map(x=>({filename:x.filename,sourceSha256:x.sourceSha256,godotSha256:x.godotSha256,licenseSPDX:x.licenseSPDX})),
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
