const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'volumetric-lab.js'),'utf8');
const context={window:{addEventListener(){}},document:{}};
vm.runInNewContext(source,context,{filename:'volumetric-lab.js'});
const Mesher=context.window.KlinikVoxelMesher;
const Tooth=context.window.KlinikToothSolid;
const CERVIX=-.17,EPS=1e-6;

test('Phase9 cervical junction splits polygons without introducing gaps or winding flips',()=>{
 const a=[[-.4,-.31,0],[.4,-.03,0],[0,.10,.6]];
 const output=Mesher.splitAtCervix(a);
 assert.equal(output.length,3,'one corner below the plane yields 3 triangles');
 const originalArea=.5*Math.hypot(...cross(sub(a[1],a[0]),sub(a[2],a[0])));
 const total=output.reduce((sum,t)=>sum+.5*Math.hypot(...cross(sub(t[1],t[0]),sub(t[2],t[0]))),0);
 assert(Math.abs(originalArea-total)<1e-7,'clipping must preserve total exterior surface area');
 assert(output.every(tri=>tri.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])&&Number.isFinite(p[2]))));
 assert(output.every(tri=>tri.every(p=>p[1]>=CERVIX-EPS)||tri.every(p=>p[1]<=CERVIX+EPS)),'each triangle stays on one side');
 const flat=[[-1,-.1,0],[1,-.1,0],[0,.1,0]];
 assert.equal(Mesher.splitAtCervix(flat).length,1,'do not subdivide an already-single-band surface');
});
function sub(a,b){return a.map((x,i)=>x-b[i]);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}

test('Phase9 full FDI tooth meshes have continuous cervical material bands',()=>{
 for(const id of ['11','14','16','36','46']){
  const solid=new Tooth('molar',id);
  if(id==='16')solid.addCut(.08,.90,-.08,.25);
  for(const section of id==='16'?[false,true]:[false]){
   const mesh=Mesher.build(solid,section,16);
   assert(mesh.cervicalSplits>0,id+' must cross the material plane');
   assert.equal(mesh.count,mesh.faces.length);
   assert(mesh.count>mesh.originalFaceCount&&mesh.count<mesh.originalFaceCount*1.5,'splitting is bounded');
   for(const face of mesh.faces){
    const ys=face.p.map(p=>p[1]);
    assert(!(Math.min(...ys)<CERVIX-EPS&&Math.max(...ys)>CERVIX+EPS),id+' material triangle crosses cervical plane');
    assert(face.p.every(p=>p.every(Number.isFinite)));
    assert(['enamel','cementum','dentin','pulp','caries'].includes(face.material));
   }
   const repeats=Mesher.build(solid,section,16);
   assert.equal(mesh.count,repeats.count,'deterministic triangle counts');
   assert.equal(mesh.cervicalSplits,repeats.cervicalSplits);
  }
 }
});

test('Phase9 cervical treatment source mirrors and bundled generated output remain consistent',()=>{
 assert.equal(source,fs.readFileSync(path.join(root,'public/volumetric-lab.js'),'utf8'));
 assert(fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8').includes(source.replaceAll('</script>','<\\/script>')),'standalone must embed identical current source');
});
