import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const p=new URL('../visual-qa/asset-research/asset-candidates.json',import.meta.url);
const catalog=JSON.parse(readFileSync(p,'utf8'));
const candidates=catalog.candidates;
const byId=Object.fromEntries(candidates.map(x=>[x.id,x]));
test('research catalog has unique cited sources and no new unreviewed third-party mesh binaries',()=>{
 assert.equal(catalog.catalogVersion,3);
 assert.equal(catalog.cc0NativeBlenderPixelReview.assistantReviewed,true);
 assert.equal(catalog.cc0NativeBlenderPixelReview.clinicalAccuracyAccepted,false);
 assert.equal(catalog.independentlyReviewedBlenderPreviews,false);
 assert.equal(catalog.previewAccessLimitation.visualConclusionsAreOwnerPCOnly,true);
 assert.equal(catalog.previewAccessLimitation.nihPreviewsProvidedInGitHubPR,false);
 assert.deepEqual(catalog.assetBinariesAddedInThisPR,[]);
 const ids=candidates.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert(candidates.length>=18);
 for(const c of candidates){
  assert.match(c.url,/^https:\/\//);
  const cc0Reviewed=new Set(['DENTAL-3DASSETS-CC0-PACK-54','DENTAL-3DASSETS-CC0-INSTRUMENT-TRAY']);
  if(cc0Reviewed.has(c.id)){
   assert.equal(c.githubAssetUploaded,true,c.id);
   assert.equal(c.publicBinaryUploadApproved,true,c.id);
   assert.match(c.sourceFileSHA256,/^[a-f0-9]{64}$/);
   assert.equal(c.blenderRendered,true);
   assert.match(c.visualReviewStatus,/PASS/);
  } else {
   assert.equal(c.githubAssetUploaded,false,c.id);
   assert.equal(c.publicBinaryUploadApproved,false,c.id);
   assert.equal(c.sourceFileSHA256,null,c.id);
  }
  assert.match(c.clinicalReviewStatus,/not.*review|not clinically|NOT_VALIDATED|Research-only/i,c.id);
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
  assert.equal(byId[id].publicBinaryUploadApproved,true);
  assert.equal(byId[id].clinicalReviewStatus.startsWith('NOT_VALIDATED'),true);
 }
 assert.match(byId['3DENTES-CBCT-PERSONAL-NC'].assetLicense,/CC BY-NC 4\.0/);
 assert.match(byId['ZENODO-REYMUS-DENTAL-TRAUMA'].assetLicense,/formal license identifier BLANK/);
});

test('exact reviewed original CC0 visual model binaries are actually in repo and hash to approved source bytes',()=>{
 const assets=catalog.binaryAssetsCurrentlyInRepo;
 assert.equal(assets.length,2);
 assert.equal(catalog.cc0NativeBlenderPixelReview.githubRunId,41292878372);
 assert.equal(catalog.cc0NativeBlenderPixelReview.priorOverexposedRun.status,'VISUAL_REJECTED_OVEREXPOSED');
 for(const a of assets){
  assert.equal(a.license,'CC0-1.0');
  assert.equal(a.clinicalReviewStatus,'NOT_VALIDATED');
  assert.match(a.sourceSHA256,/^[a-f0-9]{64}$/);
  const u=new URL('../'+a.path,import.meta.url);
  assert.equal(existsSync(u),true,a.path);
  assert.equal(statSync(u).size,a.bytes);
  assert.equal(createHash('sha256').update(readFileSync(u)).digest('hex'),a.sourceSHA256);
 }
 assert.match(byId['DENTAL-3DASSETS-CC0-PACK-54'].assetScopeClarification,/Only assembled whole-clinic starter/);
 assert.equal(byId['STS-3D-TOOTH-HF-ROI-FDI-RESEARCH'].publicBinaryUploadApproved,false);
 assert.match(byId['STS-3D-TOOTH-HF-ROI-FDI-RESEARCH'].assetLicense,/original Zenodo.*blank/);
});
