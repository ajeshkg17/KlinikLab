const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const start=source.indexOf('    // Phase 8 eye-frustum correction:');
const end=source.indexOf('    this.setXRCatalogOpen?.(false);',start);
assert(start>0&&end>start,'catalog transform exists');
const run=vm.runInNewContext('(function(cat){'+source.slice(start,end)+'})');

test('Phase8 revised catalog fits a central world-space stereo-safe footprint after XR comfort',()=>{
 const raw=[
  {key:null,p:[-.60,1.47,-1.03],s:[.92,1.30,.045],kind:'background'},
  {key:'catalog:tool:mirror',p:[-.60,1.71,-.985],s:[.81,.105,.04],kind:'row'},
  {key:'catalog:tool:composite',p:[-.60,1.23,-.985],s:[.81,.105,.04],kind:'row'},
  {key:null,p:[-.60,1.075,-.99],s:[.79,.145,1],kind:'purpose'},
  ...[['spawn',-.90],['reset',-.59],['close',-.29]].flatMap(([key,x])=>[
   {key:'catalog:'+key,p:[x,.87,-.985],s:[.27,.115,.05],kind:'button'},
   {key:null,p:[x,.875,-.95],s:[.25,.075,1],kind:'label'}
  ])
 ];
 const hitables=raw.filter(m=>m.key).map(m=>({mesh:m,p:m.p.slice()}));
 const cat={panels:raw};
 const scene={pickables:hitables};
 run.call(scene,cat);
 // The exact production comfort pivot/factor and the same width/height
 // changes applied to every object; this is geometry only, not pixel acceptance.
 for(const m of raw){
  m.p=m.p.map((v,i)=>[0,1.02,-1.83][i]+(v-[0,1.02,-1.83][i])*.78);
  m.s=m.s.map(v=>v*.78);
 }
 const panel=raw[0],inside=(mesh,axis)=>Math.abs(mesh.p[axis]-panel.p[axis])+mesh.s[axis]/2<=panel.s[axis]/2+1e-6;
 for(const m of raw.slice(1)){
  assert(inside(m,0),m.kind+' extends beyond panel horizontally');
  assert(inside(m,1),m.kind+' extends beyond panel vertically');
 }
 for(const button of raw.filter(m=>m.kind==='button')){
  assert(button.p[1]>1.27,'button stays above tray height / old gate');
  assert(button.p[2]>-.78,'button remains forward of tray');
 }
 const xMin=panel.p[0]-panel.s[0]/2,xMax=panel.p[0]+panel.s[0]/2;
 const yMin=panel.p[1]-panel.s[1]/2,yMax=panel.p[1]+panel.s[1]/2;
 assert(xMin>-.24&&xMax<.40,'central binocular horizontal footprint');
 assert(yMin>1.28&&yMax<2.0,'top no longer above stereo eye margins');
 for(const hit of hitables){
  // In actual runtime, setXRComfort scales these hits separately too.
  const index=raw.indexOf(hit.mesh);assert(index>=0);
  const projected=hit.p.map((v,i)=>[0,1.02,-1.83][i]+(v-[0,1.02,-1.83][i])*.78);
  for(let i=0;i<3;i++)assert(Math.abs(projected[i]-raw[index].p[i])<1e-10);
 }
});
test('Actual XR stereo visibility assertion and public/standalone source mirrors remain intact',()=>{
 const smoke=fs.readFileSync(path.join(root,'test-support/webxr-test/smoke.mjs'),'utf8');
 assert(smoke.includes('c.inFrustum&&c.x>-.87&&c.x<.87&&c.y>-.88&&c.y<.88'));
 assert(smoke.includes("captureXR('phase8-panel-catalog-open.png'"));
 assert.equal(source,fs.readFileSync(path.join(root,'public/engine.js'),'utf8'));
 assert(fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8').includes(source.replaceAll('</script>','<\\/script>')));
});
