const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const buildStart=src.indexOf('  buildXRControllers(){'),buildEnd=src.indexOf('  controllerMatrix(pose){',buildStart);
assert(buildStart>=0&&buildEnd>buildStart);
const build=vm.runInNewContext('({'+src.slice(buildStart,buildEnd)+'}).buildXRControllers');
test('Phase9 controller props preserve true tracking/handedness while reducing oversized shells',()=>{
 const all=[];
 const create=(kind)=>(p,s,c,opts={})=>{const m={kind,p,s,color:c,options:opts,hidden:false,model:null};all.push(m);return m};
 const scene={cy:create('cylinder'),sphere:create('sphere'),tor:create('torus'),box:create('box')};
 build.call(scene);
 assert.equal(scene.xrControllers.length,2);
 assert.deepEqual(Array.from(scene.xrControllers,c=>c.handedness),['left','right']);
 for(const controller of scene.xrControllers){
  assert.equal(controller.parts.length,6);
  const [grip,cap,ring,trigger,stick,button]=controller.parts;
  assert.equal(grip.kind,'cylinder');assert.equal(cap.kind,'sphere');assert.equal(ring.kind,'torus');
  assert(ring.s.every(v=>v<=.061),'smaller tracking ring diameter');
  assert(cap.s.every(v=>v<=.044),'remove oversized white egg appearance');
  assert(grip.s[1]<.10,'compact handle');
  assert(!/^(#c2c8cf|#b5bcc6)$/i.test(ring.color),'no bright white tracking disk');
  assert(controller.ray.kind==='cylinder','independent aim ray remains');
  assert.deepEqual(Object.keys(controller.buttons).sort(),['grip','primary','secondary','thumbstick','trigger'].sort());
  assert(['left','right'].includes(controller.handedness));
 }
 const method=src.slice(src.indexOf('  updateXRController(slot,source,frame){'),src.indexOf('  replaceLabel(mesh',src.indexOf('  updateXRController(slot,source,frame){')));
 assert(method.includes('source.gripSpace')&&method.includes('source.targetRaySpace'));
 assert(method.includes('m.hidden=!grip||(holding&&i===2)'),'hide ring only while carrying');
 assert(method.includes('side*.026'),'mirrored trigger/thumb controls');
 assert(method.includes('-side*.025'),'mirrored face button');
 assert(src.includes('gripOffset=[side*.025,-.025,-.25]'),'tool working end remains forward');
});
test('Phase9 compact controller dimensions remain within clinical prop bounds',()=>{
 const start=src.indexOf('    const layouts=['),end=src.indexOf('    for(let i=0;i<c.parts.length;i++)',start);
 const t=src.slice(start,end);
 for(const entry of ['s:[.037,.092,.041]','s:[.043,.028,.044]','s:[.061,.058,.061]'])assert(t.includes(entry));
 assert.equal(src,fs.readFileSync(path.join(root,'public/engine.js'),'utf8'));
 const bundle=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
 assert(bundle.includes(src.replaceAll('</script>','<\\/script>')));
});
