import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
 stripDundeeMaterialTextures,assertDundeeUntexturedDocument,readDundeeGLBJson
} from '../native-godot/dundee-untextured-material.mjs';

const fixture=()=>({
 asset:{version:'2.0'},scenes:[{nodes:[0]}],
 nodes:[{name:'FDI26',translation:[0,1,2]}],
 meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,COLOR_0:2},material:0}]}],
 images:[{mimeType:'image/webp',bufferView:7}],
 textures:[{sampler:0,source:0},{sampler:0,source:0}],
 samplers:[{magFilter:9729}],
 extensionsUsed:['KHR_draco_mesh_compression','EXT_texture_webp',
  'KHR_materials_clearcoat','KHR_materials_specular','KHR_materials_transmission','KHR_texture_transform'],
 extensionsRequired:['KHR_draco_mesh_compression','EXT_texture_webp','KHR_materials_clearcoat'],
 materials:[{
  name:'Original surface',doubleSided:true,alphaMode:'OPAQUE',
  normalTexture:{index:1,scale:0.8},
  occlusionTexture:{index:0,strength:0.9},
  emissiveTexture:{index:1,texCoord:1},
  pbrMetallicRoughness:{
   baseColorTexture:{index:0,extensions:{KHR_texture_transform:{offset:[0.1,0.2]}}},
   metallicRoughnessTexture:{index:1},
   baseColorFactor:[0.8,0.8,0.8,1],metallicFactor:0.5,roughnessFactor:0.2,
   extensions:{EXPERIMENTAL_custom:{metallicRoughnessTexture:{index:1}}}
  },
  extensions:{
   KHR_materials_clearcoat:{clearcoatTexture:{index:1},clearcoatNormalTexture:{index:0}},
   KHR_materials_specular:{specularTexture:{index:1},specularColorTexture:{index:0}},
   KHR_materials_transmission:{transmissionTexture:{index:1}},
   KHR_materials_sheen:{sheenColorTexture:{index:0},sheenRoughnessTexture:{index:1}},
   KHR_materials_iridescence:{iridescenceTexture:{index:1},iridescenceThicknessTexture:{index:0}}
  }
 }]
});
const digest=x=>crypto.createHash('sha256').update(Buffer.from(JSON.stringify(x))).digest('hex');

test('SR67 regression: source fixture with normal/occlusion/emissive/PBR AND material-extension texture indices becomes genuinely untextured',()=>{
 const source=fixture(),original=structuredClone(source);
 const geometry=structuredClone(source.meshes),nodes=structuredClone(source.nodes),scenes=structuredClone(source.scenes);
 const originalHash=digest(source);
 const derived=stripDundeeMaterialTextures(structuredClone(source));
 assertDundeeUntexturedDocument(derived);
 assert.equal(digest(source),originalHash,'source document mutated');
 assert.deepEqual(source,original,'original source fixture mutated');
 assert.deepEqual(derived.meshes,geometry);
 assert.deepEqual(derived.nodes,nodes);
 assert.deepEqual(derived.scenes,scenes);
 for(const key of ['images','textures','samplers'])assert.ok(!Object.hasOwn(derived,key),key);
 const m=derived.materials[0];
 assert.equal(m.name,'Original surface');
 assert.equal(m.doubleSided,true);
 assert.equal(m.alphaMode,'OPAQUE');
 assert.deepEqual(m.pbrMetallicRoughness,{
  baseColorFactor:[0.94,0.88,0.76,1],metallicFactor:0,roughnessFactor:0.68
 });
 for(const key of ['normalTexture','occlusionTexture','emissiveTexture','extensions'])
  assert.ok(!Object.hasOwn(m,key),key);
 for(const field of ['extensionsUsed','extensionsRequired']){
  const names=derived[field]||[];
  assert.deepEqual(names,['KHR_draco_mesh_compression'],'retain independent mesh extension only');
 }
});

test('SR67 fail-closed assertion catches reintroduced dangling texture indices in EVERY standard slot',()=>{
 const clean=stripDundeeMaterialTextures(fixture());
 const slots=[
  ['normalTexture','material'],['occlusionTexture','material'],['emissiveTexture','material'],
  ['baseColorTexture','pbr'],['metallicRoughnessTexture','pbr'],
  ['clearcoatTexture','extension'],['specularColorTexture','extension']
 ];
 for(const [slot,kind] of slots){
  const contaminated=structuredClone(clean);
  const m=contaminated.materials[0];
  if(kind==='material')m[slot]={index:1};
  if(kind==='pbr')m.pbrMetallicRoughness[slot]={index:1};
  if(kind==='extension')m.extensions={KHR_materials_clearcoat:{[slot]:{index:1}}};
  assert.throws(()=>assertDundeeUntexturedDocument(contaminated),/retained/,'uncaught '+slot);
 }
 const contaminated=structuredClone(clean);
 contaminated.textures=[];
 assert.throws(()=>assertDundeeUntexturedDocument(contaminated),/retained textures/);
 const referenced=structuredClone(clean);
 referenced.extensionsRequired=['EXT_texture_webp'];
 assert.throws(()=>assertDundeeUntexturedDocument(referenced),/extension declaration dangling/);
});

test('SR67 converter uses shared fail-closed material contract and retains immutable source SHA gate',()=>{
 const converter=fs.readFileSync(new URL('../native-godot/decode-draco-tooth.mjs',import.meta.url),'utf8');
 assert.match(converter,/stripDundeeMaterialTextures\(doc\)/);
 assert.match(converter,/if\(blob!==expected\)throw Error/);
 assert.match(converter,/GetFaceFromMesh/);
 assert.match(converter,/GetAttributeFloatForAllPoints/);
 assert.match(converter,/texturePreserved:false/);
 const verifier=fs.readFileSync(new URL('../native-godot/verify-dundee-derived.mjs',import.meta.url),'utf8');
 assert.match(verifier,/assertDundeeUntexturedDocument\(doc\)/);
 assert.match(verifier,/assert\.deepEqual\(convertedSidecar,converted/);
 assert.match(verifier,/assert\.equal\(blob\(original\),row\.blob/);
});

test('SR67 GLB parser rejects malformed containers and parses simple padded JSON + BIN',()=>{
 const doc={asset:{version:'2.0'},materials:[{pbrMetallicRoughness:{baseColorFactor:[0.94,0.88,0.76,1],metallicFactor:0,roughnessFactor:0.68}}]};
 const json=Buffer.from(JSON.stringify(doc));
 const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const bin=Buffer.alloc(4);
 const glb=Buffer.alloc(12+8+padded.length+8+bin.length);
 glb.write('glTF',0,'ascii');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
 glb.writeUInt32LE(padded.length,12);glb.write('JSON',16,'ascii');padded.copy(glb,20);
 glb.writeUInt32LE(bin.length,20+padded.length);
 glb.write('BIN\0',24+padded.length,'ascii');
 assert.deepEqual(readDundeeGLBJson(glb),doc);
 assert.throws(()=>readDundeeGLBJson(Buffer.from('not a GLB')),/Invalid GLB/);
 const wrongLength=Buffer.from(glb);wrongLength.writeUInt32LE(1234,8);
 assert.throws(()=>readDundeeGLBJson(wrongLength),/Invalid GLB/);
});
