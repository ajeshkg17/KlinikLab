const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');

test('Phase 6 molars distinguish maxillary and mandibular occlusal cusp patterns',()=>{
  const crown=engine.slice(engine.indexOf('  crownData(style,upper,individual=0){'),engine.indexOf('  // Thin, scalloped gingival collars'));
  assert(crown.includes('const cusps=upper'),'occlusal relief must branch by jaw');
  const upper=crown.match(/\?\s*(\[\[-\.47,-\.43,.061\].*\])\s*\n\s*:\s*(\[\[-\.51,-\.44,.065\].*\]);/);
  assert(upper,'expected jaw-specific cusp control points');
  const maxillary=JSON.parse(upper[1]),mandibular=JSON.parse(upper[2]);
  assert.equal(maxillary.length,4);
  assert.equal(mandibular.length,5);
  for(const cusp of [...maxillary,...mandibular]){
    assert.equal(cusp.length,3);
    assert(cusp.every(Number.isFinite));
    assert(cusp[2]>0&&cusp[2]<.1);
  }
  assert(crown.includes('if(!upper)relief-=.008*peak'),'mandibular distal groove missing');
  assert(crown.includes('individual===8?.82:individual===7?.94:1'),'ordinal-dependent posterior relief missing');
});
test('Phase 6 source, public mirror and standalone output are consistent',()=>{
  assert.equal(engine,fs.readFileSync(path.join(root,'public/engine.js'),'utf8'));
  const standalone=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
  assert(standalone.includes(engine.replaceAll('</script>','<\\/script>')));
});
