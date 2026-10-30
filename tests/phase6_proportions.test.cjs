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
