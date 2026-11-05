/**
 * SR67 Dundee surface conversion contract, independent of the Draco codec.
 *
 * The generated FDI36/FDI26 Godot GLBs intentionally have NO textures. The
 * source-original GLBs are not edited. A glTF material may refer to textures
 * through normal/occlusion/emissive and metallicRoughness slots as well as
 * baseColor, and KHR_materials_* extensions may contain further texture slots.
 * Removing textures/images/samplers without removing ALL those references
 * is invalid glTF and produces Godot's "texture index" import warning.
 */
const MATERIAL_TEXTURE_EXTENSIONS = new Set([
  'EXT_texture_webp', 'EXT_texture_avif', 'KHR_texture_basisu',
  'KHR_texture_transform', 'MSFT_texture_dds'
]);

const isTextureProperty=key=>/Texture$/.test(key);

export function assertDundeeUntexturedDocument(doc) {
 if(!doc || typeof doc!=='object' || !Array.isArray(doc.materials) || !doc.materials.length)
  throw Error('Untextured Dundee document missing materials');
 for(const key of ['images','textures','samplers'])
  if(Object.hasOwn(doc,key))throw Error('Untextured Dundee document retained '+key);
 for(const [i,material] of doc.materials.entries()){
  if(!material || typeof material!=='object' || Array.isArray(material))
   throw Error('Untextured Dundee material invalid '+i);
  if(Object.hasOwn(material,'extensions'))
   throw Error('Untextured Dundee material extensions retained '+i);
  for(const key of Object.keys(material))
   if(isTextureProperty(key))throw Error('Untextured Dundee material texture retained '+i+'/'+key);
  const pbr=material.pbrMetallicRoughness;
  if(!pbr || typeof pbr!=='object' || Array.isArray(pbr))
   throw Error('Untextured Dundee PBR missing '+i);
  for(const key of Object.keys(pbr))
   if(isTextureProperty(key) || key==='extensions')
    throw Error('Untextured Dundee PBR texture/extension retained '+i+'/'+key);
  if(JSON.stringify(pbr.baseColorFactor)!=='[0.94,0.88,0.76,1]' ||
      pbr.metallicFactor!==0 || pbr.roughnessFactor!==0.68)
   throw Error('Untextured Dundee neutral material factors drift '+i);
 }
 for(const array of ['extensionsUsed','extensionsRequired'])
  for(const name of doc[array]||[])
   if(name.startsWith('KHR_materials_')||MATERIAL_TEXTURE_EXTENSIONS.has(name))
    throw Error('Untextured Dundee extension declaration dangling '+name);
 return true;
}

export function stripDundeeMaterialTextures(doc) {
 if(!doc || typeof doc!=='object' || !Array.isArray(doc.materials) || !doc.materials.length)
  throw Error('Cannot create untextured Dundee GLB without actual materials');
 // Texture-bearing material extension blocks are discarded as a whole:
 // clearcoat, transmission, specular, sheen, etc. are not painted onto an
 // apparently original tooth. Geometry, vertex COLOR_0, UV and node
 // transforms are never modified here.
 for(const material of doc.materials){
  if(!material || typeof material!=='object' || Array.isArray(material))
   throw Error('Invalid Dundee material');
  for(const key of Object.keys(material)){
   if(isTextureProperty(key))delete material[key];
  }
  delete material.extensions;
  // Explicit whitelist: no lingering baseColorTexture,
  // metallicRoughnessTexture or PBR extension slot can be retained.
  material.pbrMetallicRoughness={
   baseColorFactor:[0.94,0.88,0.76,1],
   metallicFactor:0,
   roughnessFactor:0.68
  };
 }
 delete doc.images;
 delete doc.textures;
 delete doc.samplers;
 // The removed material/texture extensions cannot be listed as required or
 // used after their source references have been removed. Other mesh/node
 // extensions are preserved, so existing independent provenance still gates.
 for(const field of ['extensionsUsed','extensionsRequired']){
  if(!Array.isArray(doc[field]))continue;
  doc[field]=doc[field].filter(name=>
   !name.startsWith('KHR_materials_') && !MATERIAL_TEXTURE_EXTENSIONS.has(name));
  if(doc[field].length===0)delete doc[field];
 }
 assertDundeeUntexturedDocument(doc);
 return doc;
}

export function readDundeeGLBJson(bytes) {
 if(!Buffer.isBuffer(bytes) || bytes.length<28 ||
    bytes.toString('ascii',0,4)!=='glTF' ||
    bytes.readUInt32LE(4)!==2 || bytes.readUInt32LE(8)!==bytes.length ||
    bytes.toString('ascii',16,20)!=='JSON')
  throw Error('Invalid GLB v2 header/JSON chunk');
 const length=bytes.readUInt32LE(12);
 if(length<2 || 20+length+8>bytes.length || length%4!==0)
  throw Error('Invalid GLB JSON chunk length');
 const doc=JSON.parse(bytes.subarray(20,20+length).toString('utf8').trimEnd());
 if(bytes.toString('ascii',24+length,28+length)!=='BIN\0')
  throw Error('Derived Dundee GLB lacks BIN chunk');
 if(28+length+bytes.readUInt32LE(20+length)!==bytes.length)
  throw Error('Derived Dundee GLB BIN chunk size mismatch');
 return doc;
}
