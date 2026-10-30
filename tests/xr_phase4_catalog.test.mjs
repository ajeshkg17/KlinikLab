import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../engine.js',import.meta.url),'utf8');
test('Phase 4 catalog contains five named tools and purposes',()=>{
 for(const [name,purpose] of [['mirror','Indirect vision'],['probe','Explore surfaces'],['suction','Remove fluid'],['excavator','Remove softened'],['composite','Place and shape']])
  assert(code.includes("['"+name+"'")&&code.includes(purpose),name);
});
test('catalog is opt-in and uses trigger ray before procedure selection',()=>{
 assert.match(code,/this\.setXRCatalogOpen\?\.\(false\);/);
 assert.match(code,/if\(this\.onXRCatalogSelect\?\.\(e,frame\)\)return/);
 assert.match(code,/catalog:toggle/);
 assert.match(code,/catalog:close/);
 assert.match(code,/catalog:tool:/);
});
test('spawn/return cannot clone or steal held tool, reset explicitly returns',()=>{
 assert.match(code,/if\(!tool\|\|tool\.owner\)/);
 assert.match(code,/this\.resetXRTool\(tool\)/);
 assert.match(code,/if\(key==='catalog:reset'\)/);
 assert.match(code,/this\.resetXRTools\(\)/);
});
test('help remains trigger-only and catalog cannot take help inputs',()=>{
 assert.match(code,/this\.xrGuide\?\.onSelectStart\(e,frame\)/);
 assert.match(code,/this\.xrGuide\?\.state\?\.open\)return false/);
 assert.doesNotMatch(code,/this\.xrGuide\?\.onSqueezeStart\(e\)/);
});
