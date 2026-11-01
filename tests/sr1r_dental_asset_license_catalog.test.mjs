import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const p=new URL('../visual-qa/asset-research/asset-candidates.json',import.meta.url);
const catalog=JSON.parse(readFileSync(p,'utf8'));
const candidates=catalog.candidates;
const byId=Object.fromEntries(candidates.map(x=>[x.id,x]));
test('research catalog has unique cited sources and no new unreviewed third-party mesh binaries',()=>{
 assert.equal(catalog.catalogVersion,2);
 assert.equal(catalog.independentlyReviewedBlenderPreviews,false);
 assert.equal(catalog.previewAccessLimitation.visualConclusionsAreOwnerPCOnly,true);
 assert.equal(catalog.previewAccessLimitation.nihPreviewsProvidedInGitHubPR,false);
 assert.deepEqual(catalog.assetBinariesAddedInThisPR,[]);
 const ids=candidates.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert(candidates.length>=16);
 for(const c of candidates){
  assert.match(c.url,/^https:\/\//);
  assert.equal(c.githubAssetUploaded,false,c.id);
  assert.equal(c.publicBinaryUploadApproved,false,c.id);
  assert.equal(c.sourceFileSHA256,null,c.id);
  assert.match(c.clinicalReviewStatus,/not.*review|not clinically/i,c.id);
 }
 for(const id of ['NIH3D-000902','NIH3D-003003']){
  assert.match(byId[id].assetLicense,/not exposed/i);
  assert.match(byId[id].blenderVisualInspection,/cannot view/i);
 }
});
test('existing Dundee permanent teeth have exactly 16 real committed blob IDs and their own CC BY rights',()=>{
 const d=catalog.currentUsableCollection[0];
 assert.equal(d.licenseSPDX,'CC-BY-4.0');
 assert.equal(d.immediateSourceCommit,'4f0ffb651998a4641ddf45c7632ea236cc164fcb');
 assert.equal(d.repoFiles.length,16);
 assert.equal(new Set(d.repoFiles.map(x=>x.file)).size,16);
 assert.deepEqual(d.leftPermanentFDI,[21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38]);
 for(const f of d.repoFiles){
  assert.match(f.githubBlobSHA1,/^[a-f0-9]{40}$/);
  assert(f.bytes>0);
  assert(existsSync(new URL('../assets/dundee/'+f.file,import.meta.url)),f.file);
 }
 assert.match(byId['DUNDEE-MANDIBLE-CC-BY-NC'].assetLicense,/BY-NC/);
 assert.match(byId['DUNDEE-PULP-CHAMBER-COLLECTION'].assetLicense,/UNCONFIRMED/);
});
test('prioritize CC BY jaw data and CC0 equipment, distinguishing source versions, unreviewed tissue & NC rights',()=>{
 for(const id of ['MENDELEY-97C3PF8H2H-V1','MENDELEY-XJSX7NFHJ8-V1','FIGSHARE-KANG-24591537-V1']){
  const c=byId[id];assert.equal(c.assetLicense,'CC BY 4.0');
  assert.match(c.sourceVersion,/v1/);
  assert(Array.isArray(c.blenderCleanupPlan));
  assert(c.blenderCleanupPlan.length>=3);
 }
 for(const id of ['DENTAL-3DASSETS-CC0-PACK-54','DENTAL-3DASSETS-CC0-INSTRUMENT-TRAY']){
  assert.equal(byId[id].assetLicense,'CC0 1.0 Universal');
  assert.equal(byId[id].publicBinaryUploadApproved,false);
 }
 assert.match(byId['3DENTES-CBCT-PERSONAL-NC'].assetLicense,/CC BY-NC 4\.0/);
 assert.match(byId['ZENODO-REYMUS-DENTAL-TRAUMA'].assetLicense,/formal license identifier BLANK/);
});
