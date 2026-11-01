#!/usr/bin/env node
/**
 * Reproducible native scalar grid from the unchanged production ToothSolid.
 * The scalar grid is synthetic source geometry, never patient imaging.
 * Field order is OUTER, DENTIN, PULP, CARIES, float32 little endian.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadProductionSolid, RESOLUTION} from '../visual-qa/sr1-local-kliniklab-export.mjs';

const flags=Object.fromEntries(process.argv.slice(2).map(a=>{
 const p=a.indexOf('=');
 if(!a.startsWith('--')||p<3)throw Error('Expected --key=value');
 return [a.slice(2,p),a.slice(p+1)];
}));
const dir=flags['source-dir'],out=flags.output,sha=flags['expected-sha'];
if(!dir||!out||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Require --source-dir --output --expected-sha');
const src=fs.realpathSync(dir);
if(execFileSync('git',['-C',src,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sha)
 throw Error('Exact source commit mismatch');
const source=fs.readFileSync(path.join(src,'volumetric-lab.js'),'utf8');
const {ToothSolid}=loadProductionSolid(source);
const solid=new ToothSolid('molar','16');
if(solid.toothClass()!=='molar'||!solid.isUpper()||solid.isLeft())
 throw Error('Expected source-derived upper right FDI16, no other anatomy');
const n=RESOLUTION,ny=Math.round(n*1.42),count=(n+1)*(ny+1)*(n+1);
const min=[-1.39,-1.67,-1.22],max=[1.39,1.44,1.22];
const dx=(max[0]-min[0])/n,dy=(max[1]-min[1])/ny,dz=(max[2]-min[2])/n;
const channels=['outer','dentin','pulp','caries'];
const buf=Buffer.allocUnsafe(count*channels.length*4);
let least=Infinity,greatest=-Infinity;
for(let k=0;k<channels.length;k++){
 let q=0;
 for(let i=0;i<=n;i++)for(let j=0;j<=ny;j++)for(let z=0;z<=n;z++){
  const x=min[0]+i*dx,y=min[1]+j*dy,zz=min[2]+z*dz;
  const v=solid[channels[k]](x,y,zz);
  if(!Number.isFinite(v))throw Error('Nonfinite production field sample');
  buf.writeFloatLE(v,(k*count+q++)*4);
  least=Math.min(least,v);greatest=Math.max(greatest,v);
 }
 if(q!==count)throw Error('Grid points mismatch');
}
if(!(least<0&&greatest>0))throw Error('Original field lost inside/outside');
const manifest={
 schemaVersion:1,sourceGitSHA:sha,productionFile:'volumetric-lab.js',
 productionSHA256:crypto.createHash('sha256').update(source).digest('hex'),
 model:'ORIGINAL_PROCEDURAL_FDI16_SYNTHETIC_UNCALIBRATED',
 channels,resolution:n,ny,sampleCount:count,
 gridMin:min,gridMax:max,layout:'channel-major i-y-z, IEEE754 float32 little-endian',
 file:'fdi16-volume-field.bin',
 fieldSHA256:crypto.createHash('sha256').update(buf).digest('hex'),
 patientScan:false,clinicalAccuracyValidated:false
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,buf,{flag:'wx'});
fs.writeFileSync(path.join(path.dirname(out),'fdi16-volume-field-manifest.json'),
 JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log('KLINIKLAB_VOLUME_FIELD_SOURCE_EXPORTED FDI16 '+count+' points x 4 fields '+manifest.fieldSHA256);
