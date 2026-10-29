'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
require('../babylon-anatomy.js');
const A=global.KlinikBabylonAnatomy;
const UP=[[.105,-1.26],[.260,-1.275],[.406,-1.335],[.535,-1.485],[.643,-1.672],[.713,-1.862],[.741,-2.080],[.750,-2.303]];
const LO=[[.095,-1.292],[.237,-1.305],[.371,-1.363],[.496,-1.504],[.602,-1.685],[.665,-1.879],[.691,-2.091],[.699,-2.307]];
function arch(){
 const src=[];
 for(const [p,qs,base] of [[UP,[1,2],1.759],[LO,[4,3],1.332]])
  for(const q of qs)for(let n=1;n<=8;n++){
   const [x,z]=p[n-1],sign=q===1||q===4?-1:1;
   const width=(n===1?.09:n===2?.076:n===3?.082:n<=5?.085:.105)*(q<=2?1:.95);
   src.push({key:'tooth:'+q+n,tag:'crown',p:[sign*x,base,z],s:[width,1,n<=2?.074:n===3?.079:n<=5?.094:.113],rot:[0,0,0]});
  }
 return A.archPlacement(src);
}
test('Phase 4 fine crown geometry increases sampling without changing default crown meshes',()=>{
 for(const upper of [true,false])for(let style=1;style<=4;style++){
  const old=A.crownData(style,upper),fine=A.crownData(style,upper,2);
  assert.equal(old.vertices,3169);assert.equal(old.triangles,6264);
  assert.equal(fine.vertices,7617);assert.equal(fine.triangles,15120);
  assert(fine.positions.every(Number.isFinite));
  assert(fine.normals.every(Number.isFinite));
  for(let j=0;j<fine.normals.length;j+=3)
   assert(Math.abs(Math.hypot(...fine.normals.slice(j,j+3))-1)<.0001);
 }
});
test('synthetic alveolar surfaces are two watertight closed meshes with finite normals',()=>{
 const layout=arch();assert.deepEqual(layout.diagnostics.archCounts,[16,16]);
 for(const upper of [true,false]){
  const g=A.jawData(upper,layout.arches[upper?0:1]);
  assert.equal(g.vertices,5786);
  assert.equal(g.triangles,11568);
  assert.equal(g.structuralLayer,'alveolar-proxy');
  assert(g.synthetic&&g.closedEnds);
  assert(g.positions.every(Number.isFinite)&&g.normals.every(Number.isFinite));
  const boundary=new Map();
  for(let j=0;j<g.indices.length;j+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]){
   const x=g.indices[j+a],y=g.indices[j+b],key=Math.min(x,y)+':'+Math.max(x,y);
   boundary.set(key,(boundary.get(key)||0)+1);
  }
  assert([...boundary.values()].every(x=>x===2),'jaw has no open triangle edges');
  const base=upper?1.759:1.332;
  const y=g.positions.filter((_,i)=>i%3===1);
  assert(upper?Math.min(...y)>base+.03:Math.max(...y)<base-.03,'alveolar proxy must stay rootward of crowns');
 }
});
test('jaw support rejects missing or corrupted placement records',()=>{
 assert.throws(()=>A.jawData(true,[]),/16/);
 const sites=arch().arches[0].map(x=>({...x,p:x.p.slice()}));
 sites[0].p[1]=NaN;
 assert.throws(()=>A.jawData(true,sites),/Invalid/);
});
test('Phase 4 jaw templates remain display-only, uncoupled from FDI selection meshes',()=>{
 class Mesh{constructor(name){this.name=name}}
 class VertexData{applyToMesh(mesh){mesh.data=this}}
 const B={Mesh,VertexData};
 const layout=arch();
 for(const kind of ['jaw0','jaw1']){
  const mesh=A.createTemplate(B,{},kind,layout);
  assert(mesh);assert.equal(mesh.metadata.synthetic,true);
  assert.equal(mesh.metadata.structuralLayer,'alveolar-proxy');
  assert.equal(mesh.metadata.anatomyVersion,7);
  assert.equal(mesh.data.positions.length/3,5786);
  assert.equal(mesh.isPickable,false);
 }
 assert.equal(A.createTemplate(B,{},'jaw2',layout),null);
});

test('jaw and crown-detail controls change display states without WebGL or XR side effects',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../babylon-preview.js'),'utf8');
 const children=[];
 function node(){return {id:'',style:{},attributes:{},listeners:{},
  setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this.listeners[k]=fn},
  appendChild(n){children.push(n)}};}
 const root=node();
 const document={readyState:'complete',
   querySelector:q=>q==='#stage-controls .float-title'?root:null,
   getElementById:id=>children.find(n=>n.id===id)||null,
   createElement:()=>node()};
 const ctx={window:{},document,setTimeout:cb=>cb()};
 vm.runInNewContext(source,ctx);
 const jaw=document.getElementById('jaw-layer-toggle'),
   detail=document.getElementById('crown-detail-toggle');
 assert(jaw&&detail,'separate jaw and geometry toggles');
 assert.equal(ctx.window.KlinikBabylon.jawVisible,false);
 assert.equal(ctx.window.KlinikBabylon.crownSource,'dundee');
 jaw.listeners.click();detail.listeners.click();
 assert.equal(ctx.window.KlinikBabylon.jawVisible,true);
 assert.equal(ctx.window.KlinikBabylon.crownSource,'procedural');
 assert.equal(jaw.attributes['aria-pressed'],'true');
 assert.equal(detail.attributes['aria-pressed'],'true');
 jaw.listeners.click();detail.listeners.click();
 assert.equal(ctx.window.KlinikBabylon.jawVisible,false);
 assert.equal(ctx.window.KlinikBabylon.crownSource,'dundee');
});


test('schematic upper four-cusp and lower five-cusp molars differ in real mesh relief',()=>{
  const u=A.molarCusps(true),l=A.molarCusps(false);
  assert.equal(u.length,4);assert.equal(l.length,5);
  for(const c of [...u,...l])assert.equal(c.length,3);
  assert(A.molarRelief(true,-.46,.46,.65)>A.molarRelief(true,0,0,0));
  assert(A.molarRelief(false,-.03,-.50,.65)>A.molarRelief(false,0,0,0));
  const up=A.crownData(4,true,1),lo=A.crownData(4,false,1);
  assert.equal(up.occlusalCusps,4);assert.equal(lo.occlusalCusps,5);
  const difference=up.positions.reduce((sum,v,i)=>sum+(i%3===1?Math.abs(Math.abs(v)-Math.abs(lo.positions[i])):0),0);
  assert(difference>.05,'upper and lower occlusal relief differs');
});
test('procedural crown LOD levels have bounded and deterministic geometry',()=>{
  const budgets=[[609,1184],[3169,6264],[7617,15120]];
  for(let q=0;q<3;q++){
    const m=A.crownData(4,false,q);
    assert.equal(m.quality,q);assert.equal(m.vertices,budgets[q][0]);assert.equal(m.triangles,budgets[q][1]);
    assert(m.positions.every(Number.isFinite)&&m.normals.every(Number.isFinite));
    assert(m.indices.every(i=>i>=0&&i<m.vertices));
  }
  for(const q of [-1,3,1.25,NaN,'2'])assert.throws(()=>A.crownData(4,true,q),/quality/);
  class Mesh{constructor(name){this.name=name}}
  class VertexData{applyToMesh(mesh){mesh.data=this}}
  const B={Mesh,VertexData};
  const defaultMesh=A.createTemplate(B,{},'crown_4_0_6');
  const lowMesh=A.createTemplate(B,{},'crown_4_0_6',null,{crownQuality:0});
  assert.equal(defaultMesh.metadata.vertices,7617);
  assert.equal(defaultMesh.metadata.occlusalCusps,4);
  assert.equal(lowMesh.metadata.vertices,609);assert.equal(lowMesh.metadata.crownQuality,0);
  assert.equal(defaultMesh.isPickable,false);assert.equal(lowMesh.isPickable,false);
});
