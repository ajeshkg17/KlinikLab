import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

const root=new URL('../',import.meta.url);
const text=async(name)=>readFile(new URL(name,root),'utf8');

test('Babylon preview is included in desktop and public pages',async()=>{
  for(const file of ['index.html','public/index.html']){
    const html=await text(file);
    assert.match(html,/<script src="babylon-preview\.js"><\/script>/);
    assert.ok(html.indexOf('app.js')<html.indexOf('babylon-preview.js'));
  }
});

test('original renderer and XR remain authoritative; CDN is opt-in',async()=>{
  const code=await text('babylon-preview.js');
  assert.match(code,/button\.addEventListener\('click'/);
  assert.match(code,/await loadLibrary\(\)/);
  assert.match(code,/source\.xrSession/);
  assert.match(code,/pointer-events:none/);
  assert.match(code,/source\.camera\(\)/);
  assert.match(code,/class BabylonDesktopLayer/);
  assert.match(code,/mode='classic'/);
  assert.doesNotMatch(code,/navigator\.xr\.requestSession/);
});

test('geometry and labels remain available to the optional display layer',async()=>{
  for(const file of ['engine.js','public/engine.js']){
    const code=await text(file);
    assert.match(code,/count:cpu\.length\/8,cpu/);
    assert.match(code,/this\.labelCanvases=new Map\(\)/);
    assert.match(code,/this\.labelCanvases\?\.set\(tex,canvas\)/);
  }
});

test('isolated screenshot worker only permits the exact external Babylon script',async()=>{
  const {localRequestAllowed,validateJob}=await import('../visual-qa/worker-core.mjs');
  assert.equal(localRequestAllowed('https://cdn.babylonjs.com/babylon.js'),true);
  assert.equal(localRequestAllowed('https://cdn.babylonjs.com/other.js'),false);
  assert.equal(localRequestAllowed('https://assets.babylonjs.com/environments/environmentSpecular.env'),false);
  assert.equal(localRequestAllowed('https://assets.babylonjs.com/environments/other.env'),false);
  assert.equal(localRequestAllowed('https://evil.com/babylon.js'),false);
  assert.equal(localRequestAllowed('http://127.0.0.1:8787/index.html'),true);
  const job=JSON.parse(await text('visual-qa/jobs/current.json'));
  assert.equal(validateJob(job).jobId,job.jobId);
  assert.ok(job.scenes.some(scene=>scene.steps.some(step=>step.control==='renderer')));
});

test('local server allows preview script with narrow CSP exception',async()=>{
  const server=await text('server/server.mjs');
  assert.ok(server.includes("'/babylon-preview.js'"));
  assert.ok(server.includes("script-src 'self' https://cdn.babylonjs.com"));
});

test('desktop overlay reports no licensed teeth when disabled or outside 3D',async()=>{
  const code=await text('babylon-preview.js');
  assert.match(code,/if\(!in3D\)\s*\{[\s\S]*?KlinikRealMesh\?\.sync\(this\);[\s\S]*?return;/);
  assert.match(code,/disable\(\)\s*\{[\s\S]*?KlinikRealTeeth\.visibleInstances=0;/);
});
