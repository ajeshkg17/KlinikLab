#!/usr/bin/env node
/**
 * Original source-derived 32-tooth synthetic permanent dentition atlas.
 * Uses the unchanged ToothSolid and VoxelMesher at deliberately bounded
 * preview resolution. These are NOT scans, diagnosis or clinical anatomy.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadProductionSolid} from '../visual-qa/sr1-local-kliniklab-export.mjs';
const flags=Object.fromEntries(process.argv.slice(2).map(s=>{
 const p=s.indexOf('=');
 if(!s.startsWith('--')||p<3)throw Error('Expected --key=value');
 return [s.slice(2,p),s.slice(p+1)];
}));
const dir=flags['source-dir'],output=flags.output,sha=flags['expected-sha'];
if(!dir||!output||!/^[a-f0-9]{40}$/.test(sha||''))
 throw Error('Expected --source-dir --output --expected-sha');
const real=fs.realpathSync(dir);
if(execFileSync('git',['-C',real,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sha)
 throw Error('Source revision mismatch for 32-tooth atlas');
if(fs.existsSync(output))throw Error('Refusing atlas output folder reuse');
const src=fs.readFileSync(path.join(real,'volumetric-lab.js'),'utf8');
const {ToothSolid,Mesher}=loadProductionSolid(src);
const tissueNames=['enamel','dentin','pulp','cementum','caries'];
const byCase={'16':'molar','36':'endo','11':'anterior','26':'crown','48':'surgery','46':'perio'};
const data={schemaVersion:1,kind:'SOURCE_PROCEDURAL_SYNTHETIC_32_TOOTH_ATLAS_NOT_CLINICAL',
 sourceGitSHA:sha,productionFile:'volumetric-lab.js',
 productionSHA256:crypto.createHash('sha256').update(src).digest('hex'),
 resolution:16,teeth:{},originalScan:false,clinicalAnatomyValidated:false,
 coordinates:'source ToothSolid xyz, Godot imported x y -z',tissueNames};
fs.mkdirSync(output,{recursive:true});
for(let q=1;q<=4;q++)for(let number=1;number<=8;number++){
 const fdi=String(q)+String(number);
 const solid=new ToothSolid(byCase[fdi]||'molar',fdi);
 if(solid.fdi!==fdi||solid.toothClass()==null)throw Error('Original ToothSolid FDI identity mismatch '+fdi);
 const result=Mesher.build(solid,false,16);
 if(result.faces.length<100||result.faces.length>30000)throw Error('Unexpected FDI source topology '+fdi);
 const count=result.faces.length;
 const buffer=Buffer.allocUnsafe(4+count*37);
 buffer.writeUInt32LE(count,0);
 const counts=Object.fromEntries(tissueNames.map(n=>[n,0]));
 for(let i=0;i<count;i++){
  const tri=result.faces[i];
  const tissue=tissueNames.indexOf(tri.material);
  if(tissue<0||!Array.isArray(tri.p)||tri.p.length!==3)throw Error('Source tissue/material corrupt '+fdi);
  counts[tri.material]++;
  const off=4+i*37;
  buffer.writeUInt8(tissue,off);
  for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++){
   const x=tri.p[v][axis];
   if(!Number.isFinite(x)||Math.abs(x)>5)throw Error('Nonfinite/out-of-bounds source vertex');
   buffer.writeFloatLE(x,off+1+(v*3+axis)*4);
  }
 }
 const file='fdi'+fdi+'.bin';
 fs.writeFileSync(path.join(output,file),buffer,{flag:'wx'});
 data.teeth[fdi]={
  fdi,caseId:byCase[fdi]||null,toothClass:solid.toothClass(),
  upper:solid.isUpper(),left:solid.isLeft(),
  triangles:count,materials:counts,file,
  sha256:crypto.createHash('sha256').update(buffer).digest('hex')
 };
}
if(Object.keys(data.teeth).length!==32)throw Error('Source dental atlas incomplete');
fs.writeFileSync(path.join(output,'atlas.json'),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
console.log('KLINIKLAB_SOURCE_ATLAS_32_TOOTH_EXPORTED sha='+sha+' teeth=32 at res16; NOT CLINICAL');
