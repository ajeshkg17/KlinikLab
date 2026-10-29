import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const atlas=await readFile(path.join(ROOT,'dundee-atlas.js'),'utf8');
const server=await readFile(path.join(ROOT,'server/server.mjs'),'utf8');
const jobSchema=await readFile(path.join(ROOT,'visual-qa/worker-core.mjs'),'utf8');
const readme=await readFile(path.join(ROOT,'assets/dundee/README.md'),'utf8');
const models=await readdir(path.join(ROOT,'assets/dundee'));
test('Dundee atlas asset allowlist and attribution',()=>{
 assert.match(atlas,/University of Dundee, School of Dentistry/);
 assert.match(atlas,/creativecommons\.org\/licenses\/by\/4\.0/);
 assert.match(atlas,/KlinikDundeeAtlas/);
 assert.match(atlas,/SceneLoader\.ImportMeshAsync/);
 assert.match(atlas,/surface-only study/);
 assert.ok(readme.includes('mandible.glb') && readme.includes('**not** included'));
 assert.match(readme,/CC BY-NC/);
 assert.equal(models.filter(x=>x.endsWith('.glb')).length,16);
 assert.ok(!models.includes('mandible.glb'));
 for(const name of models.filter(x=>x.endsWith('.glb')))assert.ok(atlas.includes(name.slice(0,-4)));
 assert.match(server,/model\/gltf-binary/);
 assert.match(server,/dundee-atlas\.js/);
 assert.match(jobSchema,/atlasOpen/);
 assert.match(jobSchema,/atlas: '#dundee-atlas-dialog'/);
});
test('All 16 locally mirrored files are binary GLB with glTF 2 header',async()=>{
 for(const name of models.filter(x=>x.endsWith('.glb'))){
  const buf=await readFile(path.join(ROOT,'assets/dundee',name));
  assert.equal(buf.subarray(0,4).toString('ascii'),'glTF',name);
  assert.equal(buf.readUInt32LE(4),2,name);
  assert.equal(buf.readUInt32LE(8),buf.byteLength,name);
 }
});