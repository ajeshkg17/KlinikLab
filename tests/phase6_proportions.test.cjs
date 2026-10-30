const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'engine.js'),'utf8');
test('Phase 6 proportional scale applies only to anatomy and all 32 FDI pick targets',()=>{
 assert(source.includes('this.anatomyOverviewScale=.055'));
 assert(source.includes('this.anatomyPivot=[0,1.545,-1.78]'));
 const section=source.slice(source.indexOf('  rescaleAnatomy(factor){'),source.indexOf('  buildScene(){'));
 assert(section.includes('new Set(this.archMeshes.flat())'));
 assert(section.includes('this.pickables.filter(p=>members.has(p.mesh))'));
 assert(section.includes('pick.radius*=factor'));
 assert(section.includes('Object.values(this.teeth)'));
 assert(section.includes("m.kind.startsWith('gingiva')"));
 assert(!section.includes('this.xrTableTools'));
 assert(source.indexOf('this.rescaleAnatomy(this.anatomyOverviewScale)')<source.indexOf("this.box([.09,.97,-.69]"));
});
test('Phase 6 teaching magnification is opt-in and reversible',()=>{
 const part=source.slice(source.indexOf('  setTeachingMagnification(on){'),source.indexOf('  buildScene(){'));
 assert(part.includes('on?8:1'));
 assert(part.includes('next/this.anatomyDisplayMagnification'));
 assert(part.includes('this.rescaleAnatomy(relative)'));
 const smoke=fs.readFileSync(path.join(root,'test-support/webxr-test/smoke.mjs'),'utf8');
 assert(smoke.includes("setTeachingMagnification(true)"));
 assert(smoke.includes("setTeachingMagnification(false)"));
 assert(smoke.indexOf('setTeachingMagnification(true)')<smoke.indexOf("captureXR('05-mirror-release-return.png'"));
});
test('Phase 6 sources and generated standalone stay identical',()=>{
 assert.equal(fs.readFileSync(path.join(root,'public/engine.js'),'utf8'),source);
 const standalone=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
 assert(standalone.includes(source.replaceAll('</script>','<\\/script>')));
});

test('Phase 6 numeric transform preserves FDI targets, instrument homes and reversibility',()=>{
 const vm=require('node:vm');
 const fragment=source.slice(source.indexOf('  rescaleAnatomy(factor){'),source.indexOf('  buildScene(){'));
 const methods=vm.runInNewContext('(new (class AnatomyTransform {'+fragment+'}))');
 const crown={kind:'crown_1_0_1',p:[.5,1.759,-1.26],s:[.09,1,.074],model:null};
 const gum={kind:'gingiva0',p:[0,0,0],s:[1,1,1],model:null};
 const pick={mesh:crown,key:'tooth:11',p:[.5,1.679,-1.26],radius:.13};
 const tool={name:'mirror',home:[{p:[-.31,1.08,-.68]}]};
 const scene={archMeshes:[[gum,crown],[]],pickables:[pick],teeth:{11:{pos:[...crown.p]}},
   xrTableTools:[tool],anatomyPivot:[0,1.545,-1.78],anatomyDisplayMagnification:1,
   rescaleAnatomy:methods.rescaleAnatomy,setTeachingMagnification:methods.setTeachingMagnification};
 const orig={p:[...crown.p],s:[...crown.s],pick:[...pick.p],radius:pick.radius,
   gum:[...gum.p],tool:[...tool.home[0].p]};
 scene.rescaleAnatomy(.055);
 const width=2*crown.s[0];
 assert(Math.abs(width-.0099)<1e-9,'central-incisor width near 9.9 mm');
 assert(Math.abs(crown.p[0]-.0275)<1e-9,'arch positions scaled around centre');
 assert(Math.abs(pick.p[0]-.0275)<1e-9,'FDI pick volume follows the same transform');
 assert.equal(pick.key,'tooth:11');
 assert.deepEqual(tool.home[0].p,orig.tool,'XR tool untouched');
 scene.setTeachingMagnification(true);
 assert(Math.abs(crown.s[0]-.09*.055*8)<1e-9);
 scene.setTeachingMagnification(false);
 assert(Math.abs(crown.s[0]-.09*.055)<1e-9);
 scene.rescaleAnatomy(1/.055);
 for(let k=0;k<3;k++){
   assert(Math.abs(crown.p[k]-orig.p[k])<1e-9);
   assert(Math.abs(crown.s[k]-orig.s[k])<1e-9);
   assert(Math.abs(pick.p[k]-orig.pick[k])<1e-9);
   assert(Math.abs(gum.p[k]-orig.gum[k])<1e-9);
 }
 assert(Math.abs(pick.radius-orig.radius)<1e-9);
});

test('Phase 6 contours and crownward papilla orientation remain distinct by jaw',()=>{
 const gum=source.slice(source.indexOf('  gingivaData(positions,y,'),source.indexOf('  makeTexture(canvas)'));
 assert(gum.includes('const crownward=y>1.5?-1:1'));
 assert(gum.includes('const taper=.84+.16*interdental'));
 assert(gum.includes('papilla=crownward*.012*interdental'));
 const crown=source.slice(source.indexOf('  crownData(style,upper,individual=0){'),source.indexOf('  // Thin, scalloped gingival collars'));
 assert(crown.includes('(upper?.058:.060)*peak(x,z,0,-.43'));
 assert(crown.includes('(upper?.047:.029)*peak(x,z,0,.43'));
 assert(source.includes('upper?1:i<=2?.68:.95'),'lower incisor narrowing missing');
});

test('Phase 6 examination renders an isolated anatomy pass with framebuffer pixel evidence',()=>{
 assert(source.includes('const visible=this.anatomyDisplayMagnification>1?this.archMeshes.flat():this.meshes'));
 const smoke=fs.readFileSync(path.join(root,'test-support/webxr-test/smoke.mjs'),'utf8');
 assert(smoke.includes('eyeAnatomyPixels:sides.map(v=>v.anatomyPixels)'));
 assert(smoke.includes('x.inFrustum===x.count'));
 assert(smoke.includes('b.left>.10&&b.right<.90'));
 assert(smoke.includes('b.centerX>.34&&b.centerX<.66'));
});
