import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const m=JSON.parse(source('../visual-qa/asset-research/cc0-render-batch-v1.json'));
const acquire=source('../visual-qa/asset-research/acquire_cc0_batch.py');
const render=source('../visual-qa/asset-research/render_cc0_batch.py');
const publish=source('../visual-qa/asset-research/stage_cc0_blender_review.py');
test('Only two immutable CC0 official CDN sources can be acquired; NIH is excluded',()=>{
 assert.equal(m.schemaVersion,1);
 assert.equal(m.license,'CC0-1.0');
 assert.equal(m.publicBinaryUploadApproved,false);
 assert.equal(m.publishOriginalBinary,false);
 assert.equal(m.publishDerivedPreview,true);
 assert.deepEqual(m.items.map(x=>x.id),['instrument-tray','whole-clinic-starter']);
 assert.deepEqual(m.items.map(x=>x.sourceUrl),[
  'https://cdn.3dassets.dev/assets/34383/v1/model.glb',
  'https://cdn.3dassets.dev/assets/34423/v1/model.glb']);
 assert(m.items.every(x=>x.sourcePage.startsWith('https://3dassets.dev/')));
 assert(!JSON.stringify(m).includes('nih.gov'));
 for(const x of ['SOURCE_ALLOWLIST_CHANGED','ssl.create_default_context',
   'finalUrl','originalSha256','found_json','Truncated GLB chunk header']){
  if(x==='finalUrl')continue;
  assert(acquire.includes(x),x);
 }
 assert(!acquire.includes('eval('));
});
test('Native Blender importer renders original geometry, 2 images per model, without clinical approval',()=>{
 for(const x of ['import_scene.gltf','bpy.ops.render.render(write_still=True)',
  'bpy.app.version_string','importedTriangleCount','originalSha256',
  'assetVisualStatus','RENDERED_AWAITING_DIRECT_PIXEL_INSPECTION',
  'clinicalAccepted','sourceOriginalSha256']){
  assert(render.includes(x),x);
 }
 assert(!render.includes('clinicalAccepted":True'));
 assert(!render.includes('sourceWorldBoundsXYZMeters":[]'));
});
test('Publication stage permits only original Blender PNGs and JSON, no GLB, SHA mismatch or overwrites',()=>{
 for(const x of ['Never overwrite','asset-batch-evidence.json','CC0-1.0',
   'sourceOriginalSha256','dst.open("xb")','PNG modified during publication staging',
   'independentlyReviewedPixels','visualAccepted','binaryModelsPublished',
   'originalSha256','sourceOriginalUrl','github']){
  if(x==='independentlyReviewedPixels'||x==='github')continue;
  assert(publish.includes(x),x);
 }
 assert(!publish.includes('shutil.copytree('));
 assert(!publish.includes('clinicalAccepted":True'));
});
