const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const xr=fs.readFileSync(path.join(root,'xr-procedure.js'),'utf8');
const start=engine.indexOf('  geometry(data,usage=');
const end=engine.indexOf('  tri(a,b,c',start);
assert(start>0&&end>start,'geometry helper boundaries');
const Scene=vm.runInNewContext('class TestScene { '+engine.slice(start,end)+' };TestScene');
const method=xr.slice(xr.indexOf('  updateMesh(){'),xr.indexOf('  poseRay('));
assert(method.includes('scene.updateDynamicGeometry'));

function fixture(){
 const calls={creates:[],binds:[],uploads:[],deletes:[]};
 const gl={
  ARRAY_BUFFER:34962,STATIC_DRAW:35044,DYNAMIC_DRAW:35048,
  createBuffer(){const b={id:calls.creates.length+1};calls.creates.push(b);return b;},
  bindBuffer(target,buffer){calls.binds.push({target,buffer});},
  bufferData(target,data,usage){calls.uploads.push({target,data:Array.from(data),usage});},
  deleteBuffer(buffer){calls.deletes.push(buffer)}
 };
 const scene=new Scene();scene.gl=gl;scene.geom={};
 const materials=['enamel','dentin','pulp','cementum','caries'];
 let triangles=[
  {material:'enamel',p:[[0,0,0],[1,0,0],[0,1,0]]},
  {material:'cementum',p:[[0,-.5,0],[1,-.5,0],[0,-.6,1]]}
 ];
 const window={KlinikVoxelMesher:{build(_solid,section,res){assert.equal(section,false);return {faces:triangles,count:triangles.length,res};}}};
 const fn=vm.runInNewContext('({'+method+'}).updateMesh',{window,materials,performance:{now:()=>1337}});
 const lab={solid:{field(x,y,z){return x+y+z;}},revision:3};
 const practice={lab,scene,triggers:new Set(),dirty:true,lastRevision:0,lastMeshAt:0};
 return {calls,gl,scene,materials,practice,run:()=>fn.call(practice),setTriangles(v){triangles=v}};
}
test('Phase9 dynamic dental buffers keep five stable VBO identities across edits and LOD transitions',()=>{
 const f=fixture();assert.equal(f.run(),true);
 assert.equal(f.calls.creates.length,5);
 assert.equal(f.calls.uploads.length,5);
 assert(f.calls.uploads.every(x=>x.usage===f.gl.DYNAMIC_DRAW));
 const first=f.materials.map(m=>f.scene.geom['xrvol-'+m].buffer);
 assert.equal(f.scene.geom.xrvol_enamel.count,3);
 assert.equal(f.scene.geom.xrvol_cementum.count,3);
 assert.equal(f.scene.geom.xrvol_dentin.count,0);
 assert.equal(f.practice.surfaceNormalMode,'implicit-field-gradient');
 assert.equal(f.practice.visibleTriangles,2);
 f.practice.triggers.add('right');
 f.setTriangles([{material:'dentin',p:[[0,0,0],[.8,0,0],[0,.8,0]]}]);
 assert.equal(f.run(),true);
 assert.equal(f.calls.creates.length,5,'no new buffers during updated cut');
 assert.equal(f.calls.uploads.length,10,'all five materials uploaded with changed LOD');
 assert.equal(f.calls.deletes.length,0);
 for(let i=0;i<5;i++)assert.equal(f.scene.geom['xrvol-'+f.materials[i]].buffer,first[i]);
 assert.equal(f.scene.geom.xrvol_enamel.count,0,'removed material does not retain stale triangles');
 assert.equal(f.scene.geom.xrvol_cementum.count,0);
 assert.equal(f.scene.geom.xrvol_dentin.count,3);
 assert.equal(f.scene.geom.xrvol_dentin.cpu.length,24,'CPU vertex copy tracks latest geometry');
 assert.equal(f.practice.visibleTriangles,1);
});
test('Phase9 dynamic geometry rejects malformed data without corrupting existing GPU mesh',()=>{
 const f=fixture();f.run();
 const original=f.scene.geom.xrvol_enamel,uploads=f.calls.uploads.length;
 assert.throws(()=>f.scene.updateDynamicGeometry('xrvol_enamel',[1,2,3]),/interleaved/);
 assert.equal(f.calls.uploads.length,uploads);assert.equal(f.scene.geom.xrvol_enamel,original);
 const staticMesh=f.scene.geometry([0,0,0,0,1,0,0,0]);
 assert.equal(f.calls.uploads.at(-1).usage,f.gl.STATIC_DRAW,'static geometry retains existing behavior');
 assert.equal(staticMesh.count,1);
});
test('Phase9 scene/editor mirrors and generated bundle contain matching dynamic code',()=>{
 assert.equal(engine,fs.readFileSync(path.join(root,'public/engine.js'),'utf8'));
 assert.equal(xr,fs.readFileSync(path.join(root,'public/xr-procedure.js'),'utf8'));
 const bundle=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
 assert(bundle.includes(engine.replaceAll('</script>','<\\/script>')));
 assert(bundle.includes(xr.replaceAll('</script>','<\\/script>')));
 assert(!xr.includes('scene.gl.deleteBuffer(old.buffer)'),'edits must not churn VBO allocations');
});
