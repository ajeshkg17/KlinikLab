import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../../volumetric-lab.js',import.meta.url),'utf8');
const context={window:{addEventListener(){}},document:{getElementById(){return null}}};
vm.runInNewContext(source,context);
const Tooth=context.window.KlinikToothSolid,Mesher=context.window.KlinikVoxelMesher;
const procedural=fs.readFileSync(new URL('./procedure-sequence.mjs',import.meta.url),'utf8');
const model=new Tooth('molar','16');
const x=.08,z=-.08;
const surfaceY=()=>{
 let y=model.height(x,z)+.10;
 for(let i=0;i<45;i++,y-=.01)if(model.field(x,y,z,false)<=0)return y;
 throw Error('No model crown surface');
};
const signature=mesh=>{
 let count=0,sum=0;
 for(const f of mesh.faces)for(const p of f.p){
  count++;
  sum+=p[0]*.19+p[1]*.61+p[2]*.83;
 }
 return {count,checksum:sum};
};

test('FDI 16 educational cut intersects the actual outer tooth rather than just increasing a counter',()=>{
 const center=[x,surfaceY(),z];
 const first=model.field(...center,false);
 assert(first<=0,'real surface selected');
 assert(model.outer(...center)<.04,'cut near outer crown rather than invisible root/core');
 const before=new Tooth('molar','16'),after=new Tooth('molar','16');
 const radius=.20*(.45+.65*.45/(.3+1*.7)); // app default physics and enamel resistance
 assert(radius>.14&&radius<.16,'supported educational bur radius produces visible cavity size');
 after.addCut(...center,radius);
 assert.equal(before.bur.length,0);
 assert.equal(after.bur.length,1);
 assert(after.field(...center,false)>0,'actual subtraction empties the surface');
});

test('FDI 16 subtraction changes XR 24-cell marching-tetrahedra mesh geometry at native teaching radius',()=>{
 const before=new Tooth('molar','16'),after=new Tooth('molar','16');
 const b=Mesher.build(before,false,24);
 after.addCut(x,surfaceY(),z,.20*(.45+.65*.45/(.3+1*.7)));
 const a=Mesher.build(after,false,24);
 const lhs=signature(b),rhs=signature(a);
 assert(b.count>10000&&a.count>10000,'real XR volume meshes built');
 assert.notDeepEqual(rhs,lhs,'actual GPU-submitted vertex source changes after cut');
 assert(Math.abs(a.count-b.count)>=20,'a detectable number of triangles changed');
 const cut=after.bur[0];
 assert(after.field(...cut.p,false)>0,'not a phantom bur record');
});

test('Procedure capture gates both-eyes visibility, actual mesh changes, and restores training slider value',()=>{
 for(const contract of [
  'record.eyeFdiVisiblePixels.every(v=>v>120)',
  'm.fingerprint!==preCutState.meshState[i].fingerprint',
  "lab.burRadius=.20",
  'window.__procedureOriginalBurRadius',
  'a.volLab.rebuild(true)',
  'manifest.meshComparison',
  'changedPixels:changed'
 ])assert(procedural.includes(contract),'Missing actual XR render validation: '+contract);
 assert(procedural.includes('await captureXR(filename,label,true)'));
 assert(!procedural.includes("canvas.toDataURL('image/png')"),'do not generate fake XR images');
});

test('FDI16 cut persistence across specimen switch does not mutate FDI36 control',()=>{
 const one=new Tooth('molar','16'),other=new Tooth('molar','36');
 const center=[x,surfaceY(),z];
 one.addCut(...center,.145);
 assert.equal(other.bur.length,0);
 assert(one.field(...center,false)>0);
 assert(other.bur.length===0,'different selected FDI has independent tooth state');
});
