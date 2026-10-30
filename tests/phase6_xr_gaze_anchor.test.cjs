const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
test('viewer-anchored examination uses real transformed geometry and restores FDI positions',()=>{
 const fragment=src.slice(src.indexOf('  rescaleAnatomy(factor){'),src.indexOf('  buildScene(){'));
 const trs=(p,r,s)=>[s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,...p,1];
 const m=vm.runInNewContext('new (class Anatomy {'+fragment+'})',{M3:{trs}});
 const vertex=new Float32Array([0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0]);
 const crown={kind:'crown_1_0_1',tag:'crown',p:[.5,1.759,-1.26],s:[.09,1,.074],rot:[0,0,0],model:null,hidden:false};
 const gum={kind:'gingiva0',p:[0,0,0],s:[1,1,1],rot:[0,0,0],model:null,hidden:false};
 const hit={mesh:crown,key:'tooth:11',p:[.5,1.679,-1.26],radius:.13};
 const fdi={id:'11',pos:[...crown.p]};
 const scene={geom:{[crown.kind]:{cpu:vertex},[gum.kind]:{cpu:vertex}},
  archMeshes:[[gum,crown],[]],pickables:[hit],teeth:{11:fdi},
  anatomyPivot:[0,1.545,-1.78],anatomyDisplayMagnification:1,
  xrSession:{},rotateByQuat:v=>v,
  rescaleAnatomy:m.rescaleAnatomy,translateAnatomy:m.translateAnatomy,
  anatomyWorldBounds:m.anatomyWorldBounds,placeTeachingAnatomy:m.placeTeachingAnatomy,
  setTeachingMagnification:m.setTeachingMagnification};
 const before={crown:[...crown.p],gum:[...gum.p],hit:[...hit.p],fdi:[...fdi.pos]};
 scene.rescaleAnatomy(.055);
 const atNormal={crown:[...crown.p],gum:[...gum.p],hit:[...hit.p],fdi:[...fdi.pos]};
 scene.setTeachingMagnification(true);
 assert.equal(scene.teachingPlacementPending,true);
 scene.placeTeachingAnatomy({transform:{position:{x:0,y:1.6,z:0},orientation:{x:0,y:0,z:0,w:1}}});
 assert.equal(scene.teachingPlacementPending,false);
 const center=scene.anatomyWorldBounds().center;
 for(const [a,b] of center.map((v,i)=>[v,[0,1.625,-1.27][i]]))assert(Math.abs(a-b)<1e-8);
 assert.equal(hit.key,'tooth:11');
 scene.setTeachingMagnification(false);
 for(const [key,after] of [['crown',crown.p],['gum',gum.p],['hit',hit.p],['fdi',fdi.pos]])
  for(let k=0;k<3;k++)assert(Math.abs(after[k]-atNormal[key][k])<1e-8,key+' '+k);
 assert.equal(scene.anatomyDisplayMagnification,1);
 assert(before.crown[0]!==crown.p[0],'normal scale must remain distinct');
});
