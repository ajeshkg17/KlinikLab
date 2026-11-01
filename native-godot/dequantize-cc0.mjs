#!/usr/bin/env node
/**
 * SR13 deterministic CC0 GLB dequantization for stock Godot 4.7.2.
 * Original source GLB remains untouched and separately SHA256-verified.
 * Convert ONLY mesh vertex accessors carrying KHR_mesh_quantization.
 * No network or third-party dependency; preserve glTF node transforms.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

export const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const COMPONENTS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const TYPES={5120:[1,'readInt8',127,-128],5121:[1,'readUInt8',255,0],
 5122:[2,'readInt16LE',32767,-32768],5123:[2,'readUInt16LE',65535,0],
 5125:[4,'readUInt32LE',4294967295,0],5126:[4,'readFloatLE',1,-1]};
function assert(ok,message){if(!ok)throw Error('CC0_GLTF_DEQUANTIZE_BLOCKED '+message);}
export function convert(original,expectedHash){
 assert(hash(original)===expectedHash,'original reviewed SHA mismatch');
 assert(original.length>32&&original.toString('ascii',0,4)==='glTF'&&
   original.readUInt32LE(4)===2&&original.readUInt32LE(8)===original.length,'GLB v2 header');
 let i=12,doc=null,oldBin=null;
 while(i<original.length){
  const n=original.readUInt32LE(i),type=original.toString('ascii',i+4,i+8);
  assert(n>0&&i+8+n<=original.length,'GLB chunk boundary');
  if(type==='JSON')doc=JSON.parse(original.subarray(i+8,i+8+n).toString('utf8').trim());
  else if(type==='BIN\0')oldBin=original.subarray(i+8,i+8+n);
  else assert(false,'unrecognized GLB chunk type '+type);
  i+=8+n;
 }
 assert(doc&&oldBin&&doc.buffers?.length===1&&!doc.buffers[0].uri,'single embedded original buffer');
 assert(doc.extensionsRequired?.includes('KHR_mesh_quantization')&&
  doc.extensionsRequired.every(x=>x==='KHR_mesh_quantization')&&
  doc.extensionsUsed?.every(x=>x==='KHR_mesh_quantization'),
  'only reviewed KHR_mesh_quantization extension may be removed');
 assert(Array.isArray(doc.accessors)&&Array.isArray(doc.meshes)&&Array.isArray(doc.bufferViews),'expected glTF structure');
 const attrs=new Set();
 for(const mesh of doc.meshes)for(const primitive of mesh.primitives||[])
  for(const index of Object.values(primitive.attributes||{}))attrs.add(index);
 let binParts=[oldBin],totalBytes=oldBin.length;
 const dataViews=[];
 let converted=0;
 for(const index of [...attrs].sort((a,b)=>a-b)){
  const a=doc.accessors[index];
  assert(a&&!a.sparse&&TYPES[a.componentType]&&COMPONENTS[a.type],
    'unsupported/sparse mesh accessor '+index);
  if(a.componentType===5126)continue;
  const n=COMPONENTS[a.type],t=TYPES[a.componentType];
  const view=doc.bufferViews[a.bufferView];
  assert(view&&Number.isInteger(a.count)&&a.count>0&&a.count<10000000,'invalid accessor/view '+index);
  const stride=view.byteStride||t[0]*n,offset=(view.byteOffset||0)+(a.byteOffset||0);
  assert(stride>=t[0]*n&&offset>=0&&offset+(a.count-1)*stride+t[0]*n<=oldBin.length,
    'mesh source byte bounds '+index);
  const values=Buffer.alloc(a.count*n*4),lo=Array(n).fill(Infinity),hi=Array(n).fill(-Infinity);
  for(let j=0;j<a.count;j++)for(let k=0;k<n;k++){
   const raw=oldBin[t[1]](offset+j*stride+k*t[0]);
   const value=a.normalized?Math.max(-1,raw/t[2]):raw;
   assert(Number.isFinite(value),'source mesh data nonfinite');
   values.writeFloatLE(value,(j*n+k)*4);
   lo[k]=Math.min(lo[k],value);hi[k]=Math.max(hi[k],value);
  }
  const align=(4-totalBytes%4)%4;
  if(align){binParts.push(Buffer.alloc(align));totalBytes+=align;}
  const newView=doc.bufferViews.length;
  doc.bufferViews.push({buffer:0,byteOffset:totalBytes,byteLength:values.length});
  binParts.push(values);totalBytes+=values.length;
  a.bufferView=newView;a.byteOffset=0;a.componentType=5126;delete a.normalized;
  a.min=lo;a.max=hi;
  converted++;
 }
 assert(converted>0,'no quantized mesh attributes found');
 doc.extensionsRequired=doc.extensionsRequired.filter(x=>x!=='KHR_mesh_quantization');
 doc.extensionsUsed=doc.extensionsUsed.filter(x=>x!=='KHR_mesh_quantization');
 if(!doc.extensionsRequired.length)delete doc.extensionsRequired;
 if(!doc.extensionsUsed.length)delete doc.extensionsUsed;
 const extra=(4-totalBytes%4)%4;
 if(extra){binParts.push(Buffer.alloc(extra));totalBytes+=extra;}
 doc.buffers[0].byteLength=totalBytes;
 const encoded=Buffer.from(JSON.stringify(doc),'utf8'),jsonPadding=(4-encoded.length%4)%4;
 const json=Buffer.concat([encoded,Buffer.alloc(jsonPadding,32)]);
 const body=Buffer.concat(binParts,totalBytes);
 const out=Buffer.alloc(12+8+json.length+8+body.length);
 out.write('glTF',0,'ascii');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(json.length,12);out.write('JSON',16,'ascii');json.copy(out,20);
 const bi=20+json.length;out.writeUInt32LE(body.length,bi);out.write('BIN\0',bi+4,'ascii');body.copy(out,bi+8);
 return {bytes:out,originalSha256:hash(original),convertedSha256:hash(out),
  convertedAccessors:converted,meshCount:doc.meshes.length,nodeCount:doc.nodes?.length||0,
  gltfExtensionsRequired:doc.extensionsRequired||[]};
}
const opts=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{
 const n=x.indexOf('=');return [x.slice(2,n),x.slice(n+1)];
}));
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const original=fs.readFileSync(opts.input),result=convert(original,opts.sha256);
 fs.writeFileSync(opts.output,result.bytes,{flag:'wx'});
 process.stdout.write(JSON.stringify({originalSha256:result.originalSha256,convertedSha256:result.convertedSha256,
  convertedAccessors:result.convertedAccessors,meshCount:result.meshCount,nodeCount:result.nodeCount})+'\n');
}
