import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const review=JSON.parse(readFileSync(new URL('../assets/cc0/3dassets-dental/source-manifest.json',import.meta.url)));
const src=readFileSync(new URL('../visual-qa/asset-research/publish_reviewed_cc0_originals.py',import.meta.url),'utf8');
test('only legally distributable and independently visually assessed CC0 source GLBs get copied',()=>{
 assert.equal(review.licenseSPDX,'CC0-1.0');
 assert.equal(review.review.githubRunId,41292878372);
 assert.equal(review.review.originalPreviewSourceCodeSha,'e99cea92c7903894c4364d69577c0be4c1c87692');
 assert.equal(review.review.clinicalAccepted,false);
 assert.equal(review.review.anatomyFDIValidated,false);
 assert.deepEqual(review.files.map(x=>x.destFilename),[
  'instrument-tray-v1.glb','whole-clinic-starter-v1.glb']);
 assert.deepEqual(review.files.map(x=>x.sha256),[
  '63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036',
  '9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a']);
 for(const x of review.files){
  assert.equal(x.licenseAccepted,true);
  assert(x.visualStatus.startsWith('ACCEPT_'));
  assert.equal(x.clinicalStatus,'NOT_VALIDATED');
  assert.equal(x.fdiSuitability,'NOT_APPLICABLE');
  assert(/^(https:\/\/cdn\.3dassets\.dev\/assets\/)(34383|34423)\/v1\/model\.glb$/.test(x.sourceUrl));
  assert(x.originalPreviewSha256.length===2);
  for(const sha of x.originalPreviewSha256)assert.match(sha,/^[a-f0-9]{64}$/);
 }
 for(const x of ['CC0-1.0','REVIEWED_CC0_STATIC_VISUAL_PROTOTYPES_ONLY',
 'Refusing to replace','sha256','with target.open("xb")','visualStatus',
 'clinicalStatus','NOT_VALIDATED','originalPreviewSourceCodeSha']){
  assert(src.includes(x),x);
 }
 assert(!src.includes("clinicalAccepted': True"));
});
