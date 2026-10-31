import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildClinicalSlice,createClinicalExport,loadProductionSolid,MATERIALS} from '../visual-qa/sr1-local-kliniklab-export.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'volumetric-lab.js'),'utf8');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const head=()=>spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();

test('Uses the exact production FDI16 upper-right molar restoration model, not a synthetic alternative',()=>{
 const x=loadProductionSolid(source);
 const s=new x.ToothSolid('molar','16');
 assert.equal(s.toothClass(),'molar');
 assert.equal(s.isUpper(),true);
 assert.equal(s.isLeft(),false);
 assert.equal(x.CASES.molar.procedure,'restoration');
 assert.deepEqual(Object.keys(MATERIALS),['enamel','dentin','pulp','cementum','caries']);
});
test('Source-derived uncut/cut meshes have real distinct triangles, face indices and anatomical material groups',()=>{
 const result=buildClinicalSlice(source);
 for(const state of [result.before,result.after]){
  assert(state.obj.triangles>1000);
  assert(state.obj.content.startsWith('# KlinikLab original production ToothSolid'));
  assert(state.obj.content.includes('mtllib kliniklab-fdi16.mtl'));
  assert(state.obj.counts.enamel>100);
  assert(state.obj.counts.cementum>0);
  assert.equal((state.obj.content.match(/^f \d+ \d+ \d+$/gm)||[]).length,state.obj.triangles);
  assert.equal((state.obj.content.match(/^v /gm)||[]).length,state.obj.triangles*3);
 }
 assert.notEqual(digest(result.before.obj.content),digest(result.after.obj.content));
 assert(result.after.cut);
 assert.equal(result.after.cut.radius,.22);
 assert(result.mtl.includes('newmtl KL_enamel'));
});
test('Source-pinned local exporter writes immutable per-run originals and refuses overwrite or mismatched SHA',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'kliniklab-sr1b-export-test-'));
 const out=path.join(parent,'unique-export');
 try{
  assert.throws(()=>createClinicalExport({outputDir:out,expectedSha:'0'.repeat(40)}),/Repo HEAD differs/);
  const result=createClinicalExport({outputDir:out,expectedSha:head()});
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'kliniklab-export-manifest.json'),'utf8'));
  assert.equal(manifest.sourceGitSHA,head());
  assert.equal(manifest.productionSourceSHA256,digest(source));
  assert.deepEqual(manifest.importedThirdPartyAssets,[]);
  assert.equal(manifest.scaleIsClinicallyCalibrated,false);
  assert.equal(manifest.gpuRenderVerified,false);
  assert.equal(manifest.nativeScreenshotReviewed,false);
  assert.equal(manifest.fdi,'16');
  for(const [name,sha] of Object.entries(manifest.originals)){
   assert.equal(digest(fs.readFileSync(path.join(out,name))),sha);
  }
  assert.throws(()=>createClinicalExport({outputDir:out,expectedSha:head()}),/Refusing to modify existing/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
