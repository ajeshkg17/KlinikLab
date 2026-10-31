import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildClinicalSlice} from '../visual-qa/sr1-local-kliniklab-export.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cases=buildClinicalSlice(fs.readFileSync(path.join(root,'volumetric-lab.js'),'utf8'));
function audit(obj){
 const p=[],h={};let material='',tiny0=0,low={};
 const seen=new Set();
 const bins=[0,1e-16,1e-12,1e-10,1e-8,1e-6,1e-4,1e-2,1,Infinity];
 const per={};
 for(const line of obj.split('\n')){
  if(line.startsWith('usemtl '))material=line.slice(7).replace(/^KL_/,'');
  if(line.startsWith('v '))p.push(line.split(/\s+/).slice(1).map(Number));
  if(!line.startsWith('f '))continue;
  const vertices=line.split(/\s+/).slice(1).map(x=>p[Number(x)-1]);
  const [a,b,c]=vertices;
  const ab=a.map((v,i)=>b[i]-v),ac=a.map((v,i)=>c[i]-v);
  const cr=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  const dblArea=Math.hypot(...cr);
  const key=vertices.map(v=>v.join(',')).sort().join(';');
  const st=per[material]||{source:0,exactZero:0,duplicate:0,nearZero:0,near1e6:0,minArea:Infinity,bins:new Array(bins.length-1).fill(0)};
  per[material]=st;st.source++;st.minArea=Math.min(st.minArea,dblArea);
  if(dblArea===0)st.exactZero++;
  if(dblArea<=1e-8)st.nearZero++;
  if(dblArea<=1e-6)st.near1e6++;
  if(seen.has(key))st.duplicate++;else seen.add(key);
  for(let k=0;k<bins.length-1;k++)if(dblArea>=bins[k]&&dblArea<bins[k+1]){st.bins[k]++;break}
 }
 return per;
}
test('Audit exact source OBJ near-degenerate triangle distribution ahead of UE static mesh build',()=>{
 for(const [state,record] of Object.entries({before:cases.before,after:cases.after})){
  const a=audit(record.obj.content);
  assert.equal(Object.values(a).reduce((n,x)=>n+x.source,0),record.obj.triangles);
  console.log('SR1B_TOPOLOGY_AUDIT '+state+' '+JSON.stringify(a));
 }
});
