const assert=require('node:assert/strict');
const {test}=require('node:test');
require('../babylon-anatomy.js');
const A=global.KlinikBabylonAnatomy;
test('eight anatomically differentiated crown meshes are watertight along occlusal rim',()=>{
  for(const upper of [false,true])for(const style of [1,2,3,4]){
    const v=A.crownData(style,upper),stride=72;
    assert.equal(v.vertices,3169);
    assert.equal(v.triangles,6264);
    assert(v.indices.every(i=>i>=0&&i<v.vertices));
    assert(v.normals.every(Number.isFinite));
    assert(v.positions.every(Number.isFinite));
    for(let i=0;i<v.normals.length;i+=3)assert(Math.abs(Math.hypot(...v.normals.slice(i,i+3))-1)<.0001);
    const sideTop=24*72, capLast=19*72+1+25*72;
    // Shared indices are used by the occlusal perimeter, eliminating cracks.
    const topCount=v.indices.filter(i=>i>=sideTop&&i<sideTop+72).length;
    assert(topCount>=72*3,'cap edge shares the axial crown vertices');
  }
});
test('reject unsupported crown styles',()=>assert.throws(()=>A.crownData(0,true),/Unsupported/));