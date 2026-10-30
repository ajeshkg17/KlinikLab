const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'engine.js'),'utf8');
test('Phase 1 controller geometry uses grip, while independent ray uses aim',()=>{
  assert.match(source,/const gp=source\.gripSpace,aim=source\.targetRaySpace/);
  assert.match(source,/frame\.getPose\(gp,this\.xrRef\)/);
  assert.match(source,/frame\.getPose\(aim,this\.xrRef\)/);
  assert.match(source,/M3\.mm\(this\.controllerMatrix\(grip\),local\)/);
  assert.match(source,/this\.rotateByQuat\(\[0,0,-1\],t\.orientation\)/);
});
test('Phase 1 respects handedness and standard gamepad indices',()=>{
  assert.match(source,/\['left','right'\]/);
  for(const [name,index] of [['trigger',0],['grip',1],['thumbstick',3],['primary',4],['secondary',5]])
    assert.match(source,new RegExp(name+':pressed\\('+index+'\\)'));
  assert.match(source,/source\.handedness==='left'\?0:source\.handedness==='right'\?1/);
});
test('Phase 1 clears disconnected or untracked controllers',()=>{
  assert.match(source,/c\.gripValid=!!grip;c\.aimValid=!!rayPose/);
  assert.match(source,/m\.hidden=!grip/);
  assert.match(source,/if\(!rayPose\)\{c\.ray\.hidden=true/);
  assert.match(source,/if\(!used\.has\(i\)\)/);
  assert.match(source,/clearControllers\(\)\{/);
});
test('Phase 1 mirrors and deterministic standalone are synchronized',()=>{
  assert.equal(fs.readFileSync(path.join(root,'public/engine.js'),'utf8'),source);
  const standalone=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
  assert(standalone.includes(source.replaceAll('</script>','<\\/script>')));
});
