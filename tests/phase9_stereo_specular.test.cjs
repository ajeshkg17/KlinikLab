const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const begin=source.indexOf('const M3 = (() => {');
const stop=source.indexOf("\n\n\n'use strict';",begin);
assert(begin>=0&&stop>begin,'M3 helper bounds');
const M3=vm.runInNewContext(source.slice(begin,stop)+'; M3;');
const drawStart=source.indexOf('  draw(view,proj){');
const drawEnd=source.indexOf('  // A single desktop RAF chain owns flat rendering',drawStart);
assert(drawStart>0&&drawEnd>drawStart);
const draw=vm.runInNewContext('({'+source.slice(drawStart,drawEnd)+'}).draw',{M3});
const near=(a,b)=>{assert.equal(a.length,b.length);a.forEach((x,i)=>assert(Math.abs(x-b[i])<2e-6,`coordinate ${i}: ${x} != ${b[i]}`))};

test('Phase9 lighting uses each submitted eye matrix rather than a fixed world camera',()=>{
 const eyeCalls=[];
 const gl={
  uniformMatrix4fv(){},
  uniform3fv(location,values){eyeCalls.push({location,eye:Array.from(values)})},
  disable(){},depthMask(){},
  BLEND:3042
 };
 const scene={gl,loc:{uView:'view',uProj:'proj',uEyeWorld:'eye'},xrFdiEvidence:false,anatomyDisplayMagnification:1,meshes:[],archMeshes:[]};
 const proj=M3.perspective(.95,1,.05,100);
 const left=[-.032,1.61,0],right=[.032,1.61,0],desktop=[.4,1.8,2.2];
 for(const position of [left,right,desktop])draw.call(scene,M3.lookAt(position,[0,1.55,-1]),proj);
 assert.equal(eyeCalls.length,3,'one world-eye uniform update per eye render');
 [left,right,desktop].forEach((p,i)=>{assert.equal(eyeCalls[i].location,'eye');near(eyeCalls[i].eye,p)});
 assert(eyeCalls[0].eye[0]<eyeCalls[1].eye[0],'left and right eyes retain real stereo parallax');
});

test('Phase9 lighting stays single pass and independent of application geometry/inputs',()=>{
 assert(source.includes('vec3 view=normalize(uEyeWorld-vWorld);'));
 assert(source.includes("'uEyeWorld'"));
 assert(!source.includes('vec3 view=normalize(vec3(0.35,2.6,3.2)-vWorld)'));
 assert(source.includes('gl.uniform3fv(L.uEyeWorld,new Float32Array(M3.inverse(view).slice(12,15)))'));
 assert(source.includes('gl.uniform3fv(L.uColor,m.color)'),'material output retained');
 assert.equal(source,fs.readFileSync(path.join(root,'public/engine.js'),'utf8'));
 const bundle=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
 assert(bundle.includes(source.replaceAll('</script>','<\\/script>')));
});
