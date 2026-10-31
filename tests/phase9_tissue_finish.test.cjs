const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'xr-procedure.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');

test('Phase9 dental material finishes are bounded, differentiated and preserve five fixed meshes',()=>{
 const context={window:{addEventListener(){}},document:{}};
 vm.runInNewContext(source,context,{filename:'xr-procedure.js'});
 const XRToothPractice=context.window.KlinikXRToothPractice;
 assert.equal(typeof XRToothPractice,'function');
 const meshes=[],scene={
  box(p,s,color,opts={}){return {p,s,color,...opts,hidden:false};},
  label(text,p,s,opts={}){return {text,p,s,...opts,hidden:false};},
  sphere(p,s,color,opts={}){return {p,s,color,...opts,hidden:false};},
  add(kind,p,s,color,opts={}){const m={kind,p,s,color,...opts,hidden:false};meshes.push(m);return m;}
 };
 const app={};
 const prep=new XRToothPractice(scene,app);
 assert.equal(meshes.length,5);
 assert.equal(prep.meshes.length,5);
 assert.deepEqual(Array.from(prep.meshes,m=>m.xrMaterial),['enamel','dentin','pulp','cementum','caries']);
 const [enamel,dentin,pulp,cementum,caries]=prep.meshes;
 for(const m of meshes){
  assert(Number.isFinite(m.finish)&&m.finish>=0&&m.finish<.60,'bounded highlight control');
  assert.equal(m.hidden,true);
  assert.deepEqual(Array.from(m.p),[.28,1.42,-1.03]);
  assert.deepEqual(Array.from(m.s),[.25,.25,.25]);
 }
 assert(enamel.finish>dentin.finish);
 assert(dentin.finish>cementum.finish&&cementum.finish>pulp.finish);
 assert(pulp.finish>caries.finish);
 assert.equal(new Set(meshes.map(m=>m.kind)).size,5);
});

test('Tissue finish uses existing material shader without extra passes or new geometry',()=>{
 assert(engine.includes('gl.uniform1f(L.uFinish,m.finish)'));
 assert(engine.includes('float shine=pow('));
 assert(source.includes('finish:TISSUE_FINISH[material]'));
 assert(!source.includes('new XRWebGLLayer('),'practice module must not spawn another XR render layer');
 assert.equal(source,fs.readFileSync(path.join(root,'public/xr-procedure.js'),'utf8'));
 const bundle=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
 assert(bundle.includes(source.replaceAll('</script>','<\\/script>')));
});
