import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../engine.js',import.meta.url),'utf8');
const guide=fs.readFileSync(new URL('../xr-guide.js',import.meta.url),'utf8');
test('five distinct tray tools share a central near-field workspace',()=>{
 const chunk=engine.slice(engine.indexOf('// XR-reachable tray'),engine.indexOf('// Other procedure items displayed'));
 for(const name of ['mirror','probe','suction','excavator','composite'])assert(chunk.includes("['"+name+"'"),name);
 for(const x of ['-.31','-.11','.09','.29','.49'])assert(chunk.includes(x),'missing tool x '+x);
 assert.match(chunk,/\[\.09,1\.02,-\.69\]/);
 assert.match(chunk,/this\.xrTableTools\.push/);
 assert.match(engine,/this\.updateXRTools\(frame\)/);
});
test('help is default-closed and only a selectable ? launcher opens it',()=>{
 assert.match(guide,/scene\.label\('\?'/);
 assert.match(guide,/onEnter\(\)\{state\.active=true;state\.open=false/);
 assert.match(guide,/onSqueezeStart\(\)\{return false\}/);
 assert.match(guide,/if\(key==='guide:open'\)/);
 assert.match(guide,/if\(key==='guide:close'\)this\.close\(\)/);
 assert.doesNotMatch(engine,/this\.xrGuide\?\.onSqueezeStart\(e\)/);
});
test('XR evidence samples stereo eye framebuffers and fresh frame ID',()=>{
 const source=fs.readFileSync(new URL('../test-support/webxr-test/smoke.mjs',import.meta.url),'utf8');
 assert.match(source,/gl\.readPixels/);
 assert.match(source,/this\.__xrEyeParts\.length>=2/);
 assert.match(source,/scene\.xrVisualDiagnostics\?\.frames/);
 assert.match(source,/hiddenCenters/);
 assert.match(source,/07-help-opened-by-question-mark\.png/);
 assert.match(source,/08-help-closed-after-close\.png/);
});
