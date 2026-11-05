#!/usr/bin/env node
/**
 * SR67 independent generated-project audit: exact Dundee source bytes,
 * correctly hashed original/derived sidecars, and an actually untextured GLB.
 * Run after build-app and BEFORE Godot imports. No assets are modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {readDundeeGLBJson,assertDundeeUntexturedDocument} from './dundee-untextured-material.mjs';

const args=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')&&a.includes('=')).map(x=>{
 const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)];
}));
const root=args['project-dir'],revision=args['expected-sha'];
if(!root || !/^[a-f0-9]{40}$/.test(revision||''))
 throw Error('Usage: --project-dir=PATH --expected-sha=40hex');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>crypto.createHash('sha1').update(Buffer.concat([
 Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
const rows=[
 {fdi:'36',caseId:'endo',filename:'mandibular_first_molar',
  blob:'73e9f3029d770c6b4052ebbaba708283de4c47fd',tangent:false},
 {fdi:'26',caseId:'crown',filename:'maxillary_first_molar',
  blob:'0948d093089c5921281185a103b323c513365502',tangent:true}
];
for(const row of rows){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source','tooth-fdi'+row.fdi+'-manifest.json'),'utf8'));
 assert.equal(manifest.sourceGitSHA,revision);
 assert.equal(manifest.caseId,row.caseId);
 assert.equal(manifest.fdi,row.fdi);
 assert.equal(manifest.originalGitBlobSha,row.blob);
 assert.equal(manifest.licenseSPDX,'CC-BY-4.0');
 assert.equal(manifest.surfaceOnly,true);
 assert.equal(manifest.internalTissuesProvided,false);
 assert.equal(manifest.clinicalAccuracyValidated,false);
 assert.equal(manifest.texturePreserved,false);
 const original=fs.readFileSync(path.join(root,'assets','dundee',row.filename+'.glb.source'));
 const converted=fs.readFileSync(path.join(root,'assets','dundee',row.filename+'-godot.glb'));
 const convertedSidecar=fs.readFileSync(path.join(root,'assets','dundee',row.filename+'-godot.glb.source'));
 assert.equal(blob(original),row.blob,'unmodified source Git blob');
 assert.equal(hash(original),manifest.originalSha256,'unmodified original SHA256');
 assert.equal(hash(converted),manifest.convertedSha256,'derived material-aware SHA256');
 assert.deepEqual(convertedSidecar,converted,'runtime GLB/converted raw sidecar parity');
 const origDoc=readDundeeGLBJson(original);
 const doc=readDundeeGLBJson(converted);
 assertDundeeUntexturedDocument(doc);
 assert.deepEqual(doc.nodes,origDoc.nodes,'source node transforms unchanged');
 assert.deepEqual(doc.scenes,origDoc.scenes,'source scene graph unchanged');
 assert.equal(doc.meshes.length,origDoc.meshes.length,'source mesh count unchanged');
 assert.equal(doc.meshes[0].primitives[0].material,origDoc.meshes[0].primitives[0].material,'material assignment preserved');
 const primitive=doc.meshes[0].primitives[0];
 const attributes=Object.keys(primitive.attributes).sort();
 const expected=['COLOR_0','NORMAL','POSITION','TEXCOORD_0',...(row.tangent?['TANGENT']:[])].sort();
 assert.deepEqual(attributes,expected,'source geometry attribute semantics preserved');
 assert.ok(!primitive.extensions?.KHR_draco_mesh_compression,'Draco-only source extension removed');
 assert.ok(doc.accessors[primitive.attributes.POSITION].count>100,'decoded source geometry unexpectedly empty');
 console.log('SR67_DUNDEE_'+row.fdi+'_UNTEXTURED_DERIVED_SHA_PASS original_sha256='+manifest.originalSha256+
  ' converted_sha256='+manifest.convertedSha256+
  ' material_texture_refs=0 license=CC-BY-4.0 geometry=node-scene-attributes-preserved');
}
console.log('SR67_DUNDEE_BOTH_GLB_UNTEXTURED_PROVENANCE_PASS');
