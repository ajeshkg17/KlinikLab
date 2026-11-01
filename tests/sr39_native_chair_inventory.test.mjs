import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const load=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('SR39 source pack catalogues 54 GLBs and one exact SHA-pinned chair',()=>{
 const catalog=JSON.parse(load('visual-qa/asset-research/assets/dental-practice-cc0-v1/download-index.json'));
 assert.equal(catalog.length,54);
 const chair=catalog.find(x=>x.file==='Dental Chair (Dental Practice and Surgery).glb');
 assert.ok(chair);
 assert.equal(chair.sha256.toLowerCase(),'360ab5f97393f2cf0c8ba99e4d776d1a5d3e50d33889ec633f8eee03919bcfdd');
 assert.equal(chair.bytes,41804);
});
test('SR39 native build stages optional reviewed chair without weakening original two mandatory GLBs',()=>{
 const b=load('native-godot/build-app.mjs');
 const runtime=load('native-godot/cc0-clinic.gd');
 const smoke=load('native-godot/cc0-clinic-smoke.gd');
 assert.match(b,/const approvedFiles=\[/);
 assert.match(b,/optionalChair\.available=true/);
 assert.match(b,/Optional chair source bytes differ from catalogued SHA256/);
 assert.match(b,/cataloguedSourceGLBs:54,assets:caseAssets,optionalChair/);
 assert.match(runtime,/KL_SOURCE_CC0_REAL_OPERATORY_CHAIR/);
 assert.match(runtime,/KL_OPERATORY_CHAIR_ASSET_MISSING_FALLBACK/);
 assert.match(runtime,/optionalChairLoaded/);
 assert.match(smoke,/54 catalogued GLBs \/ 3 loaded/);
 assert.match(smoke,/Missing-chair fallback not visibly labelled/);
});
