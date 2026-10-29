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
test('gingival mesh follows upper and lower arches with finite smooth normals',()=>{
 for(const upper of [true,false]){
  const g=A.gingivaData(upper);
  assert.equal(g.vertices,5786); // (240 segments + 1) × 24 + two end-cap centres
  assert.equal(g.triangles,11568); // 240 × 24 × 2 plus 48 end-cap triangles
  assert(g.indices.every(i=>i>=0&&i<g.vertices));
  assert(g.positions.every(Number.isFinite));
  for(let i=0;i<g.normals.length;i+=3)assert(Math.abs(Math.hypot(...g.normals.slice(i,i+3))-1)<.0001);
 }
});
test('FDI site registration has 32 independent placements without changing source',()=>{
  const upper=[[.105,-1.26],[.260,-1.275],[.406,-1.335],[.535,-1.485],[.643,-1.672],[.713,-1.862],[.741,-2.080],[.750,-2.303]];
  const lower=[[.095,-1.292],[.237,-1.305],[.371,-1.363],[.496,-1.504],[.602,-1.685],[.665,-1.879],[.691,-2.091],[.699,-2.307]];
  const source=[];
  for(const [arch,path,quadrants,base] of [[0,upper,[1,2],1.759],[1,lower,[4,3],1.332]])
    for(const q of quadrants)for(let i=1;i<=8;i++){
      const [x,z]=path[i-1],sign=q===1||q===4?-1:1;
      source.push({key:'tooth:'+q+i,tag:'crown',p:[sign*x,base,z],s:[.075,1,.095],rot:[0,0,0]});
    }
  const before=JSON.stringify(source);
  const layout=A.archPlacement(source);
  assert.equal(layout.diagnostics.teeth,32);
  assert.deepEqual(layout.diagnostics.archCounts,[16,16]);
  assert.equal(layout.diagnostics.pairs.length,30);
  assert.equal(Object.keys(layout.byId).length,32);
  assert.equal(JSON.stringify(source),before,'do not alter legacy picking positions');
  assert(layout.byId['11'].mirrored&&layout.byId['48'].mirrored);
  assert(!layout.byId['21'].mirrored&&!layout.byId['38'].mirrored);
  assert(Math.abs(layout.byId['11'].p[0])<Math.abs(source.find(x=>x.key==='tooth:11').p[0]));
  assert(Math.abs(layout.byId['41'].p[0])<Math.abs(source.find(x=>x.key==='tooth:41').p[0]));
  assert.equal(layout.arches[0][0].id,'18');
  assert.equal(layout.arches[0][15].id,'28');
  assert.equal(layout.arches[1][0].id,'48');
  assert.equal(layout.arches[1][15].id,'38');
  for(const upperArch of [true,false]){
    const g=A.gingivaData(upperArch,layout.arches[upperArch?0:1]);
    assert.equal(g.cervicalSites,16);
    assert.equal(g.vertices,5786);
    assert.equal(g.triangles,11568);
    assert(g.continuous&&g.closedEnds);
    assert(g.positions.every(Number.isFinite)&&g.normals.every(Number.isFinite));
    const yCenter=g.positions[1],yBetween=g.positions[(8*24)*3+1];
    assert(upperArch?yBetween<yCenter-.015:yBetween>yCenter+.015,
      'interdental papillae must peak between crown centres, not on them');
  }
});
test('gingival mesh has no open boundary edges',()=>{
  for(const upper of [true,false]){
    const g=A.gingivaData(upper),edges=new Map();
    for(let i=0;i<g.indices.length;i+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]){
      const x=g.indices[i+a],y=g.indices[i+b],key=Math.min(x,y)+':'+Math.max(x,y);
      edges.set(key,(edges.get(key)||0)+1);
    }
    assert([...edges.values()].every(v=>v===2),'all edges must be shared by two triangles');
  }
});

test('arch-specific premolar spacing has no large bounding-ellipse gaps or overlap warnings',()=>{
  const paths=[
    [[.105,-1.26],[.260,-1.275],[.406,-1.335],[.535,-1.485],[.643,-1.672],[.713,-1.862],[.741,-2.080],[.750,-2.303]],
    [[.095,-1.292],[.237,-1.305],[.371,-1.363],[.496,-1.504],[.602,-1.685],[.665,-1.879],[.691,-2.091],[.699,-2.307]]
  ];
  const source=[];
  for(let arch=0;arch<2;arch++)for(const q of arch===0?[1,2]:[4,3])
    for(let tooth=1;tooth<=8;tooth++){
      const path=paths[arch],sign=q===1||q===4?-1:1;
      const [x,z]=path[tooth-1],a=path[Math.max(0,tooth-2)],b=path[Math.min(7,tooth)];
      const theta=Math.atan2(b[1]-a[1],b[0]-a[0]);
      const width=(tooth===1?.090:tooth===2?.076:tooth===3?.082:tooth<=5?.085:.105)*(arch===0?1:.95);
      const depth=tooth<=2?.074:tooth===3?.079:tooth<=5?.094:.113;
      source.push({key:'tooth:'+q+tooth,tag:'crown',p:[sign*x,arch===0?1.759:1.332,z],
        s:[width,1,depth],rot:[0,sign<0?theta:-theta,0]});
    }
  const layout=A.archPlacement(source);
  assert.deepEqual(layout.diagnostics.largeGaps,[]);
  assert.deepEqual(layout.diagnostics.possibleOverlaps,[]);
  for(const t of source){
    const placed=layout.byId[t.key.slice(6)];
    assert(Math.hypot(placed.p[0]-t.p[0],placed.p[2]-t.p[2])<.09,
      'displacements stay inside the legacy picking region');
  }
});
