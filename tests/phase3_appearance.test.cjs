'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../dental-appearance.js');
require('../babylon-anatomy.js');
const A=global.KlinikDentalAppearance,G=global.KlinikBabylonAnatomy;
function mock(){
  class Color3{constructor(r,g,b){this.r=r;this.g=g;this.b=b}}
  class PBRMaterial{
    constructor(){this.clearCoat={};this.sheen={};this.metadata={}}
  }
  class Mesh {
    constructor(name){this.name=name;this.isVisible=true;this.isPickable=true}
  }
  class VertexData{
    applyToMesh(mesh){mesh.vertexData=this}
  }
  return {B:{Color3,PBRMaterial,Mesh,VertexData}};
}
test('deterministic bounded crown shade follows cervical to occlusal direction',()=>{
  for(const upper of [true,false])for(const style of [1,2,3,4]){
    const crown=G.crownData(style,upper),col=A.crownColors(crown.positions,upper,style);
    assert.equal(col.length,crown.vertices*4);
    assert(col.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
    for(let i=3;i<col.length;i+=4)assert.equal(col[i],1);
    assert.deepEqual(col,A.crownColors(crown.positions,upper,style));
    const y=crown.positions;
    const near=col.slice(0,3),far=col.slice((24*72)*4,(24*72)*4+3);
    assert(far[2]>near[2],'occlusal blue channel should increase relative to cervical shade');
    assert.throws(()=>A.crownColors([0,NaN,0],upper),/Invalid/);
  }
});
test('gingival tone varies by cross section and remains opaque',()=>{
  const gum=G.gingivaData(true),cols=A.gingivaColors(gum.positions,24);
  assert.equal(cols.length,gum.vertices*4);
  assert(cols.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  assert(cols[6*4+1]>cols[18*4+1],'crest should be brighter than rootward tissue');
  for(let i=3;i<cols.length;i+=4)assert.equal(cols[i],1);
});
test('all eight synthetic crown templates and two gingiva templates receive vertex colors',()=>{
  const {B}=mock();
  for(const arch of [0,1]){
    const gum=G.createTemplate(B,{},'gingiva'+arch);
    assert.equal(gum.vertexData.colors.length,gum.vertexData.positions.length/3*4);
    assert.equal(gum.metadata.appearanceVersion,1);
    assert.equal(gum.useVertexColors,true);
    for(let style=1;style<=4;style++){
      const mesh=G.createTemplate(B,{},'crown_'+style+'_'+arch);
      assert.equal(mesh.vertexData.colors.length,mesh.vertexData.positions.length/3*4);
      assert.equal(mesh.useVertexColors,true);
    }
  }
});
test('appearance materials are nonmetallic, bounded and revert between two presets',()=>{
  const {B}=mock();
  for(const kind of ['enamel','gingiva']){
    const mat=new B.PBRMaterial();
    assert.equal(A.applyMaterial(B,mat,kind,'balanced'),true);
    const initial=mat.roughness;
    assert.equal(mat.metallic,0);assert.equal(mat.useVertexColors,true);
    assert(mat.clearCoat.intensity>=0&&mat.clearCoat.intensity<=1);
    assert(A.applyMaterial(B,mat,kind,'studio'));
    assert.notEqual(initial,mat.roughness);
    assert.equal(mat.metadata.mode,'studio');
    assert(A.applyMaterial(B,mat,kind,'balanced'));
    assert.equal(mat.roughness,initial);
  }
  assert.equal(A.applyMaterial(B,new B.PBRMaterial(),'restoration','studio'),false);
  assert.equal(A.modeName('unknown'),'balanced');
});
test('studio lighting is reversible and has no new environment-map dependency',()=>{
  const scene={imageProcessingConfiguration:{exposure:1,contrast:1}},lights=Object.fromEntries(['hemi','key','fill','rim'].map(k=>[k,{intensity:0}]));
  const p=A.applyLighting(scene,lights,'balanced');
  assert.equal(scene.imageProcessingConfiguration.exposure,p.exposure);
  assert.equal(lights.key.intensity,p.key);
  A.applyLighting(scene,lights,'studio');
  assert.notEqual(lights.key.intensity,p.key);
  A.applyLighting(scene,lights,'balanced');
  assert.equal(lights.key.intensity,p.key);
  assert.equal(A.version,1);
});
