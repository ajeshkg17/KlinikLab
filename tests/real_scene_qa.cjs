'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../real-dental-scene.js'),'utf8');
const context={};vm.createContext(context);vm.runInContext(code,context);
const M=context.KlinikRealMesh;
function v(x,y,z){return {p:[x,y,z],n:[0,1,0],uv:[x,z]}}
function prism(){
  const verts=[];
  for(const y of [0,1])for(const z of [-1,1])for(const x of [-1,1])verts.push(v(x,y,z));
  return [[verts[0],verts[1],verts[5]],[verts[0],verts[5],verts[4]],
    [verts[2],verts[3],verts[7]],[verts[2],verts[7],verts[6]],
    [verts[0],verts[2],verts[6]],[verts[0],verts[6],verts[4]],
    [verts[1],verts[3],verts[7]],[verts[1],verts[7],verts[5]],
    [verts[0],verts[1],verts[3]],[verts[0],verts[3],verts[2]],
    [verts[4],verts[5],verts[7]],[verts[4],verts[7],verts[6]]];
}
test('all sixteen source models map to explicit local filenames, no network-provided paths',()=>{
  for(const upper of [false,true])for(let tooth=1;tooth<=8;tooth++){
    const f=M.filename(upper,tooth);
    assert.match(f,/^(maxillary|mandibular)_[a-z_]+\.glb$/);
  }
  assert.equal(M.filename(true,1),'maxillary_left_central_incisor.glb');
  assert.equal(M.filename(false,8),'mandibular_third_molar.glb');
  assert.throws(()=>M.filename(true,0));assert.throws(()=>M.filename(false,9));
});
test('normalizes upper crown downward and lower crown upward without roots',()=>{
  for(const upper of [false,true])for(const style of [1,2,3,4]){
    const data=M.cropMesh(prism(),upper,style);
    assert.ok(data.positions.length>0);
    assert.equal(data.positions.length,data.normals.length);
    assert.equal(data.positions.length/3,data.uvs.length/2);
    assert.equal(data.indices.length,data.positions.length/3);
    assert.ok(data.positions.every(Number.isFinite));
    for(let i=1;i<data.positions.length;i+=3){const y=data.positions[i];assert.ok(upper?y<=1e-5:y>=-1e-5);}
  }
});
test('clips triangles to the correct gingival plane, preserving triangle attributes',()=>{
  const triangle=[v(0,-1,0),v(1,1,0),v(0,-1,1)];
  for(const upper of [true,false]){
    const pieces=M.sliceTriangle(triangle,0,upper);
    assert.ok(pieces.length>=1);
    for(const p of pieces)for(const point of p){
      assert.ok(upper?point.p[1]<=1e-7:point.p[1]>=-1e-7);
      assert.equal(point.uv.length,2);assert.equal(point.n.length,3);
    }
  }
});
test('only preexisting crown kinds can be replaced',()=>{
  assert.equal(M.parseKind('crown_4_0_7').tooth,7);
  assert.equal(M.parseKind('gingiva0'),null);
  assert.equal(M.parseKind('crown_4_0_0'),null);
  assert.equal(M.parseKind('random_external_asset'),null);
});
// Regression: render sync must have its own Babylon namespace binding.
test('real crown synchronization binds Babylon namespace locally',()=>{
  const source=code.slice(code.indexOf('function sync(layer){'),code.indexOf('root.KlinikRealMesh='));
  assert.match(source,/function sync\(layer\)\s*\{[\s\S]*?const B=layer\.B;/);
  assert.match(source,/new B\.Color3\(/);
});


test('3D sampled surface distance detects separated triangles in scene units',()=>{
  const a=[[[-1,-1,0],[1,-1,0],[0,1,0]]];
  const b=[[[-1,-1,1],[1,-1,1],[0,1,1]]];
  const result=M.surfaceDistance(a,b);
  assert.ok(Math.abs(result.distance-1)<1e-9);
  assert.equal(result.intersectsSampledTriangles,false);
  assert.match(result.units,/scene units/);
  assert.match(result.limitations,/upper bound/);
});
test('3D sampled surface distance detects edge-through-face intersections',()=>{
  const a=[[[-1,-1,0],[1,-1,0],[0,1,0]]];
  const b=[[[0,-.5,-1],[0,-.5,1],[0,.6,.5]]];
  const result=M.surfaceDistance(a,b);
  assert.equal(result.distance,0);
  assert.equal(result.intersectsSampledTriangles,true);
});
test('sampled surface distance rejects invalid or missing geometry',()=>{
  assert.throws(()=>M.surfaceDistance([],[]),/required/);
  assert.throws(()=>M.surfaceDistance([[[0,0,0],[1,0,0],[NaN,0,0]]],[[[0,0,0],[1,0,0],[0,1,0]]]),/finite/);
});


test('sampled world-space arch diagnostics cover 30 adjacent FDI pairs without changing source records',()=>{
  const upper=['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  const lower=['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
  let offset=0;
  const items=[...upper,...lower].map(id=>{
    const x=offset++*2.5;
    return {source:{key:'tooth:'+id},realMesh:{
      getVerticesData:()=>[0,0,0,1,0,0,0,1,0],
      getIndices:()=>[0,1,2],
      computeWorldMatrix:()=>({dx:x})
    }};
  });
  const originals=items.map(item=>item.source.key);
  const B={VertexBuffer:{PositionKind:'position'},Vector3:{
    FromArray:(positions,i)=>({x:positions[i],y:positions[i+1],z:positions[i+2]}),
    TransformCoordinates:(v,m)=>({x:v.x+m.dx,y:v.y,z:v.z})
  }};
  const diagnostics=M.measureArchSurfaces({B,items,anatomyLayout:{
    arches:[upper.map(id=>({id})),lower.map(id=>({id}))]
  }});
  assert.equal(diagnostics.teethMeasured,32);
  assert.equal(diagnostics.pairs.length,30);
  assert.equal(diagnostics.pairs[0].pair,'18-17');
  assert.equal(diagnostics.pairs[15].pair,'48-47');
  assert.ok(diagnostics.pairs.every(p=>Number.isFinite(p.distance)&&p.distance>0));
  assert.match(diagnostics.units,/not mm/);
  assert.deepEqual(items.map(item=>item.source.key),originals);
});
