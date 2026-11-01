#!/usr/bin/env node
/**
 * Deterministic conversion of the source-verified Dundee FDI36 Draco GLB
 * into a stock-Godot-compatible uncompressed GLB. Original bytes stay intact.
 * Geometry and node transforms are preserved; embedded WebP texture is
 * deliberately replaced by a neutral dental surface material.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{
 const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)];
}));
const input=args.input,output=args.output,decoderJs=args['decoder-js'],decoderWasm=args['decoder-wasm'];
const expected=args['expected-blob-sha'];
if(!input||!output||!decoderJs||!decoderWasm||!['73e9f3029d770c6b4052ebbaba708283de4c47fd','0948d093089c5921281185a103b323c513365502'].includes(expected))
 throw Error('Require exact source-verified FDI36 GLB, Draco decoder JS/WASM, and expected Git blob SHA');
const original=fs.readFileSync(input);
const blob=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+original.length+'\0'),original])).digest('hex');
if(blob!==expected)throw Error('FDI36 original Git blob SHA mismatch');
if(original.toString('ascii',0,4)!=='glTF'||original.readUInt32LE(4)!==2||original.readUInt32LE(8)!==original.length)
 throw Error('Invalid original GLB v2 container');
let offset=12,doc=null,bin=null;
while(offset<original.length){
 const length=original.readUInt32LE(offset),type=original.toString('ascii',offset+4,offset+8);
 if(length<1||offset+8+length>original.length)throw Error('Invalid GLB chunk boundary');
 if(type==='JSON')doc=JSON.parse(original.subarray(offset+8,offset+8+length).toString('utf8').trim());
 else if(type==='BIN\0')bin=original.subarray(offset+8,offset+8+length);
 else throw Error('Unexpected GLB chunk type '+type);
 offset+=8+length;
}
if(!doc||!bin||!doc.extensionsRequired?.includes('KHR_draco_mesh_compression'))
 throw Error('Expected source GLB with required Draco mesh compression');
const primitive=doc.meshes?.[0]?.primitives?.[0];
const draco=primitive?.extensions?.KHR_draco_mesh_compression;
if(!draco||Object.keys(primitive.attributes||{}).sort().join(',')!=='COLOR_0,NORMAL,POSITION,TEXCOORD_0')
 throw Error('Unexpected source FDI36 primitive layout');
const compressedView=doc.bufferViews?.[draco.bufferView];
if(!compressedView||compressedView.buffer!==0)throw Error('Draco buffer view missing');
const compressed=bin.subarray(compressedView.byteOffset||0,(compressedView.byteOffset||0)+compressedView.byteLength);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kliniklab-draco-'));
let moduleApi,decoder,decoderBuffer,mesh,stage='decoder initialization';
try{
 const cjs=path.join(tmp,'decoder.cjs');
 fs.copyFileSync(decoderJs,cjs);
 const require=createRequire(import.meta.url);
 const factory=require(cjs);
 moduleApi=await factory({wasmBinary:fs.readFileSync(decoderWasm)});
 decoder=new moduleApi.Decoder();
 decoderBuffer=new moduleApi.DecoderBuffer();
 stage='DecoderBuffer.Init';
 decoderBuffer.Init(new Int8Array(compressed.buffer,compressed.byteOffset,compressed.byteLength),compressed.byteLength);
 stage='GetEncodedGeometryType';
 if(decoder.GetEncodedGeometryType(decoderBuffer)!==moduleApi.TRIANGULAR_MESH)
  throw Error('FDI36 source payload is not a Draco triangle mesh');
 mesh=new moduleApi.Mesh();
 stage='DecodeBufferToMesh';
 const status=decoder.DecodeBufferToMesh(decoderBuffer,mesh);
 if(!status.ok()||mesh.num_faces()<100||mesh.num_points()<100)
  throw Error('Draco decode failed or returned implausible geometry');
 const count=mesh.num_points(),faces=mesh.num_faces(),parts=[bin],addViews=[];
 let total=bin.length;
 const align=()=>{const n=(4-total%4)%4;if(n){parts.push(Buffer.alloc(n));total+=n;}};
 const append=(bytes,target)=>{
  align();const view=doc.bufferViews.length;
  doc.bufferViews.push({buffer:0,byteOffset:total,byteLength:bytes.length,target});
  parts.push(bytes);total+=bytes.length;return view;
 };
 const accessor=(view,componentType,type,num,min,max)=>{
  const index=doc.accessors.length;
  const a={bufferView:view,componentType,count:num,type};
  if(min)a.min=min;if(max)a.max=max;
  doc.accessors.push(a);return index;
 };
 const typeNames={1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'};
 const enumNames={POSITION:moduleApi.POSITION,NORMAL:moduleApi.NORMAL,
  TEXCOORD_0:moduleApi.TEX_COORD,COLOR_0:moduleApi.COLOR};
 const attrs={};
 for(const semantic of Object.keys(primitive.attributes)){
  stage='attribute '+semantic;
  const attrId=draco.attributes[semantic];
  const attribute=decoder.GetAttribute(mesh,attrId);
  if(!attribute)throw Error('Missing decoded source attribute '+semantic);
  const components=attribute.num_components();
  if(!typeNames[components]||enumNames[semantic]===undefined)throw Error('Unsupported FDI36 attribute '+semantic);
  const values=new moduleApi.DracoFloat32Array();
  stage='GetAttributeFloatForAllPoints '+semantic;
  if(!decoder.GetAttributeFloatForAllPoints(mesh,attribute,values))
   throw Error('Could not extract FDI36 '+semantic);
  const bytes=Buffer.alloc(count*components*4),lo=Array(components).fill(Infinity),hi=Array(components).fill(-Infinity);
  for(let p=0;p<count;p++)for(let c=0;c<components;c++){
   const v=values.GetValue(p*components+c);
   if(!Number.isFinite(v))throw Error('Nonfinite FDI36 vertex attribute');
   bytes.writeFloatLE(v,(p*components+c)*4);lo[c]=Math.min(lo[c],v);hi[c]=Math.max(hi[c],v);
  }
  const view=append(bytes,34962);
  attrs[semantic]=accessor(view,5126,typeNames[components],count,
   semantic==='POSITION'?lo:null,semantic==='POSITION'?hi:null);
  moduleApi.destroy(values);
 }
 const indexBytes=Buffer.alloc(faces*3*4),face=new moduleApi.DracoInt32Array();
 let cursor=0;
 stage='GetFaceFromMesh';
 for(let f=0;f<faces;f++){
  decoder.GetFaceFromMesh(mesh,f,face);
  for(let k=0;k<3;k++){
   const value=face.GetValue(k);
   if(value<0||value>=count)throw Error('Invalid FDI36 triangle index');
   indexBytes.writeUInt32LE(value,cursor);cursor+=4;
  }
 }
 const indexView=append(indexBytes,34963);
 const indexAccessor=accessor(indexView,5125,'SCALAR',faces*3);
 primitive.attributes=attrs;primitive.indices=indexAccessor;
 delete primitive.extensions.KHR_draco_mesh_compression;
 if(Object.keys(primitive.extensions).length===0)delete primitive.extensions;
 for(const ext of ['KHR_draco_mesh_compression','EXT_texture_webp','KHR_materials_specular']){
  doc.extensionsUsed=(doc.extensionsUsed||[]).filter(x=>x!==ext);
  doc.extensionsRequired=(doc.extensionsRequired||[]).filter(x=>x!==ext);
 }
 if(!doc.extensionsUsed.length)delete doc.extensionsUsed;
 if(!doc.extensionsRequired.length)delete doc.extensionsRequired;
 // Preserve source mesh topology and vertex colours; replace WebP-only texture
 // dependency with a neutral, clearly documented surface reference material.
 delete doc.images;delete doc.textures;delete doc.samplers;
 for(const material of doc.materials||[]){
  const pbr=material.pbrMetallicRoughness||{};
  delete pbr.baseColorTexture;
  pbr.baseColorFactor=[0.94,0.88,0.76,1.0];
  pbr.metallicFactor=0.0;pbr.roughnessFactor=0.68;
  material.pbrMetallicRoughness=pbr;
  delete material.extensions;
 }
 doc.buffers[0].byteLength=total;
 align();
 const body=Buffer.concat(parts,total);
 const json=Buffer.from(JSON.stringify(doc),'utf8'),jsonPad=(4-json.length%4)%4;
 const jsonChunk=Buffer.concat([json,Buffer.alloc(jsonPad,0x20)]);
 const out=Buffer.alloc(12+8+jsonChunk.length+8+body.length);
 out.write('glTF',0,'ascii');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(jsonChunk.length,12);out.write('JSON',16,'ascii');jsonChunk.copy(out,20);
 const bi=20+jsonChunk.length;out.writeUInt32LE(body.length,bi);out.write('BIN\0',bi+4,'ascii');body.copy(out,bi+8);
 fs.writeFileSync(output,out,{flag:'wx'});
 const convertedSha=crypto.createHash('sha256').update(out).digest('hex');
 process.stdout.write(JSON.stringify({sourceGitBlobSha:blob,convertedSha256:convertedSha,
  vertices:count,triangles:faces,attributes:Object.keys(attrs),texturePreserved:false})+'\n');
}catch(error){
 throw new Error('FDI36 Draco conversion stage '+stage+': '+String(error?.message||error));
}finally{
 if(mesh)moduleApi.destroy(mesh);
 if(decoderBuffer)moduleApi.destroy(decoderBuffer);
 if(decoder)moduleApi.destroy(decoder);
 if(moduleApi)moduleApi=null;
 fs.rmSync(tmp,{recursive:true,force:true});
}
