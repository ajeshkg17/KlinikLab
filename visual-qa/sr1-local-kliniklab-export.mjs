/**
 * Deterministic source-to-native mesh bridge for a NON-patient educational FDI16.
 * Uses production ToothSolid and VoxelMesher from volumetric-lab.js unchanged.
 * Outputs a separate OBJ for uncut/cut states, one MTL and a hash/provenance manifest.
 * Does NOT render in Unreal, validate anatomy, or collect workstation GPU evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const MATERIALS=Object.freeze({
 enamel:[239,230,205],dentin:[221,166,106],pulp:[182,76,97],
 cementum:[159,130,109],caries:[101,68,69]
});
export const RESOLUTION=24, DISPLAY_CM_PER_MODEL_UNIT=10;
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'..');
const sourceFile=path.join(repo,'volumetric-lab.js');
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
function getRevision(){
 const p=spawnSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8',shell:false,timeout:10000});
 if(p.error||p.status!==0||!/^([a-f0-9]{40})\s*$/.test(p.stdout||''))throw Error('Exact source revision unavailable');
 return p.stdout.trim();
}
export function loadProductionSolid(source){
 const fakeWindow={addEventListener(){}};
 const context={window:fakeWindow,document:{},performance:{now:()=>0}};
 vm.runInNewContext(source,context,{filename:'volumetric-lab.js',timeout:12000});
 const ToothSolid=fakeWindow.KlinikToothSolid;
 const Mesher=fakeWindow.KlinikVoxelMesher;
 if(!ToothSolid||!Mesher||typeof Mesher.build!=='function')throw Error('Production tooth/mesher exports unavailable');
 return {ToothSolid,Mesher,CASES:fakeWindow.KlinikLabVolumeModels?.CASES};
}
function objForFaces(faces,objectName,mtlName){
 const lines=['# KlinikLab original production ToothSolid/VoxelMesher derived geometry',
  '# NON-PATIENT SCHEMATIC EDUCATIONAL MODEL — NOT clinically calibrated',
  'mtllib '+mtlName,'o '+objectName,'s 1'];
 let index=1;
 const counts=Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,0]));
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 const v=p=>{
  // Clinic app uses Y-up; Unreal native OBJ is exported with Z-up:
  // app (x,y,z) -> Unreal (x,z,y), in display-only centimeters.
  const a=[p[0],p[2],p[1]].map(v=>v*DISPLAY_CM_PER_MODEL_UNIT);
  for(let i=0;i<3;i++){bounds.min[i]=Math.min(bounds.min[i],a[i]);bounds.max[i]=Math.max(bounds.max[i],a[i])}
  return a.map(n=>Number(n.toFixed(6)));
 };
 for(const material of Object.keys(MATERIALS)){
  const selected=faces.filter(f=>f.material===material);
  if(!selected.length)continue;
  lines.push('g '+objectName+'_'+material,'usemtl KL_'+material);
  for(const f of selected){
   if(!Array.isArray(f.p)||f.p.length!==3||f.p.some(a=>!Array.isArray(a)||a.length!==3||a.some(x=>!Number.isFinite(x))))throw Error('Invalid production mesh triangle');
   const xyz=f.p.map(v);
   // Transformation swaps Y and Z (negative determinant), so swap winding.
   for(const p of xyz)lines.push('v '+p.join(' '));
   lines.push('f '+index+' '+(index+2)+' '+(index+1));
   index+=3;counts[material]++;
  }
 }
 const triangles=Object.values(counts).reduce((a,b)=>a+b,0);
 if(triangles<500)throw Error('Produced unexpectedly tiny/non-clinical FDI16 geometry');
 if(!Object.values(bounds.min).every(Number.isFinite))throw Error('Invalid FDI16 bounds');
 return {content:lines.join('\n')+'\n',triangles,counts,bounds};
}
function createMtl(){
 const lines=['# KlinikLab educational palette; simple diffuse MTL; materials uncalibrated'];
 for(const [name,rgb] of Object.entries(MATERIALS)){
  lines.push('newmtl KL_'+name,
    'Ka 0.06 0.06 0.06',
    'Kd '+rgb.map(c=>(c/255).toFixed(6)).join(' '),
    'Ks 0.20 0.20 0.20','Ns 45','d 1.0','illum 2');
 }
 return lines.join('\n')+'\n';
}
export function buildClinicalSlice(source){
 const {ToothSolid,Mesher,CASES}=loadProductionSolid(source);
 const caseConfig=CASES?.molar;
 if(caseConfig?.procedure!=='restoration')throw Error('Clinical source case is not FDI16 molar restoration');
 const make=withCut=>{
  const solid=new ToothSolid('molar','16');
  if(solid.toothClass()!=='molar'||!solid.isUpper()||solid.isLeft())throw Error('FDI16 classification mismatch');
  if(withCut)solid.addCut(0,1.01,0,.22);
  const result=Mesher.build(solid,false,RESOLUTION);
  if(!result?.faces?.length)throw Error('Empty production voxel mesh');
  const obj=objForFaces(result.faces,withCut?'FDI16_AFTER_SIMULATED_CUT':'FDI16_BEFORE','kliniklab-fdi16.mtl');
  if(result.count!==result.faces.length)throw Error('Mesher triangle count inconsistent');
  return {obj,cut:withCut?{center:[0,1.01,0],radius:.22,units:'unscaled educational model units'}:null};
 };
 const before=make(false),after=make(true);
 if(before.obj.content===after.obj.content)throw Error('Simulated cut did not change actual produced surface triangles');
 if(before.obj.triangles===after.obj.triangles&&JSON.stringify(before.obj.counts)===JSON.stringify(after.obj.counts))throw Error('Cut produced no demonstrable topology difference');
 return {before,after,mtl:createMtl(),caseLabel:caseConfig.label,caseProcedure:caseConfig.procedure};
}
export function createClinicalExport({outputDir,expectedSha}){
 if(!/^([a-f0-9]{40})$/.test(expectedSha||''))throw Error('--expected-sha is mandatory and must contain 40 lowercase hexadecimal characters');
 if(expectedSha!==getRevision())throw Error('Repo HEAD differs from exact source SHA; refusing to create evidence');
 if(!outputDir)throw Error('Unique output directory required');
 const dest=path.resolve(outputDir);
 if(fs.existsSync(dest))throw Error('Refusing to modify existing output folder: '+dest);
 // Output must be a unique local evidence directory, never a source-controlled asset folder.
 const gitRoot=path.resolve(repo);
 if(dest.startsWith(gitRoot+path.sep)&&!dest.startsWith(path.join(gitRoot,'visual-qa','evidence-local')+path.sep))
  throw Error('Do not write native evidence to tracked source directories');
 const source=fs.readFileSync(sourceFile,'utf8');
 const result=buildClinicalSlice(source);
 const files={
  'fdi16-before.obj':result.before.obj.content,
  'fdi16-after-cut.obj':result.after.obj.content,
  'kliniklab-fdi16.mtl':result.mtl
 };
 const hashes=Object.fromEntries(Object.entries(files).map(([name,body])=>[name,sha256(body)]));
 const manifest={
  schemaVersion:1,kind:'SR1B KlinikLab native clinical-geometry SOURCE EXPORT (not GPU render)',
  sourceGitSHA:expectedSha,
  productionSource:'volumetric-lab.js',
  productionSourceSHA256:sha256(source),
  unrealVersionRequired:'5.8.x',
  fdi:'16',jaw:'upper',side:'right',toothClass:'molar',
  caseLabel:result.caseLabel,procedure:result.caseProcedure,
  contentType:'own procedural schematic teaching geometry, not patient anatomy',
  importedThirdPartyAssets:[],
  clinicalAccuracyVerified:false,
  gpuRenderVerified:false,nativeScreenshotReviewed:false,
  sceneStates:{
   before:{triangles:result.before.obj.triangles,byMaterial:result.before.obj.counts,boundsDisplayCm:result.before.obj.bounds},
   after:{triangles:result.after.obj.triangles,byMaterial:result.after.obj.counts,boundsDisplayCm:result.after.obj.bounds,simulatedCut:result.after.cut}
  },
  coordinateTransform:'app(x,y,z) -> Unreal OBJ (x,z,y); inverted triangle winding for axis swap',
  displayCentimetersPerModelUnit:DISPLAY_CM_PER_MODEL_UNIT,
  scaleIsClinicallyCalibrated:false,
  originals:hashes,
  notes:['Both OBJ assets are calculated by the actual browser production VoxelMesher, not hand-drawn substitutes.',
   'Display size is intentionally enlarged; do not interpret 10 cm/model-unit as physical tooth measurements.',
   'These files are not screenshots; Unreal import and dedicated-GPU native raster remain independent evidence gates.']
 };
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.mkdirSync(dest);
 for(const [name,body] of Object.entries(files))fs.writeFileSync(path.join(dest,name),body,{flag:'wx'});
 fs.writeFileSync(path.join(dest,'kliniklab-export-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return {outputDir:dest,manifest};
}
function parseArgs(args){
 const opts={};
 for(const arg of args){
  const x=arg.indexOf('=');
  if(!arg.startsWith('--')||x<0)throw Error('Invalid CLI argument '+arg);
  const key=arg.slice(2,x),val=arg.slice(x+1);
  if(!['output','expected-sha'].includes(key)||opts[key])throw Error('Unknown/duplicate CLI argument '+key);
  opts[key]=val;
 }
 if(!opts.output||!opts['expected-sha'])throw Error('--output and --expected-sha required');
 return opts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=parseArgs(process.argv.slice(2));
  const r=createClinicalExport({outputDir:a.output,expectedSha:a['expected-sha']});
  process.stdout.write(JSON.stringify({outputDir:r.outputDir,sourceGitSHA:r.manifest.sourceGitSHA,
    fdi:r.manifest.fdi,triangles:r.manifest.sceneStates},null,2)+'\n');
 }catch(err){process.stderr.write('SR1B mesh export FAILED: '+err.message+'\n');process.exitCode=2}
}
