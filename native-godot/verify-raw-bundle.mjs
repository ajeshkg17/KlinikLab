#!/usr/bin/env node
/**
 * SR16: enforce ORIGINAL raw OBJ/MTL and CC0 source/dequantized GLB bytes in
 * portable Windows release, separate from Godot's imported/remapped PCK assets.
 * Deliberately no remote download, no runtime environment contamination.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args=Object.fromEntries(process.argv.slice(2).map(v=>{
 const pos=v.indexOf('=');
 if(!v.startsWith('--')||pos<3)throw Error('Expected --key=value');
 return [v.slice(2,pos),v.slice(pos+1)];
}));
const root=path.resolve(args['release-dir']||'');
const sha=args['expected-sha'];
if(!args['release-dir']||!/^[a-f0-9]{40}$/.test(sha||''))
 throw Error('Required --release-dir and --expected-sha=exact40hex');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=(p)=>fs.readFileSync(path.join(root,p));
const asJson=p=>JSON.parse(read(p).toString('utf8'));
const validateFile=(rel,expected)=>{
 if(rel.includes('..')||path.isAbsolute(rel)||!/^[-_./a-zA-Z0-9]+$/.test(rel)||
    !/^[a-f0-9]{64}$/.test(expected||''))throw Error('Unsafe/non-hex raw asset contract '+rel);
 const abs=path.join(root,rel);
 if(!fs.statSync(abs).isFile()||hash(abs)!==expected)
  throw Error('Verified Windows original raw sidecar SHA mismatch '+rel);
 return fs.statSync(abs).size;
};
const manifest=asJson('native-build-manifest.json');
if(manifest.originalSourceGitSHA!==sha||
   manifest.nativeCc0WholeClinicStaticEnvironment!==true||
   manifest.nativeCases!==6)
 throw Error('Wrong source SHA/approved clinic or six cases in native Windows release');
if(!fs.statSync(path.join(root,'KlinikLab.exe')).isFile())
 throw Error('Portable native executable missing');
const sidecar='verified-raw-source/';
const sourceSha=read(sidecar+'source/expected-sha.txt').toString('utf8').trim();
if(sourceSha!==sha)throw Error('Sidecar source revision mismatch');
const original=asJson(sidecar+'source/kliniklab-export-manifest.json');
const cc0=asJson(sidecar+'assets/cc0/3dassets-dental/clinic-manifest.json');
if(original.sourceGitSHA!==sha||cc0.sourceGitSHA!==sha||
   cc0.licenseSPDX!=='CC0-1.0'||cc0.clinicalAccuracyValidated!==false||
   cc0.sourcePackReconciledBySHA256!==true||
   !Array.isArray(cc0.assets)||cc0.assets.length!==2)
 throw Error('Source-derived raw sidecar provenance/license mismatch');
for(const file of ['fdi16-before.obj','fdi16-after-cut.obj','kliniklab-fdi16.mtl'])
 validateFile(sidecar+'source/'+file,original.originals?.[file]);
const tooth=asJson(sidecar+'source/tooth-fdi36-manifest.json');
if(tooth.sourceGitSHA!==sha||tooth.caseId!=='endo'||tooth.fdi!=='36'||
   tooth.originalGitBlobSha!=='73e9f3029d770c6b4052ebbaba708283de4c47fd'||
   tooth.licenseSPDX!=='CC-BY-4.0'||tooth.surfaceOnly!==true||
   tooth.internalTissuesProvided!==false||tooth.clinicalAccuracyValidated!==false)
 throw Error('FDI36 Dundee source/attribution/surface-only manifest mismatch');
const toothSidecar=sidecar+'assets/dundee/mandibular_first_molar.glb.source';
const toothBytes=validateFile(toothSidecar,tooth.originalSha256);
if(toothBytes<1000)throw Error('FDI36 original source sidecar is implausibly small');
const toothConvertedSidecar=sidecar+'assets/dundee/mandibular_first_molar-godot.glb.source';
const toothConvertedBytes=validateFile(toothConvertedSidecar,tooth.convertedSha256);
if(toothConvertedBytes<1000)throw Error('FDI36 converted source sidecar is implausibly small');
const roots=[];
for(const row of cc0.assets){
 if(!['whole-clinic-starter-v1.glb','instrument-tray-v1.glb'].includes(row.name)||
   !/^[\w-]+-godot\.glb$/.test(row.godotFile)||
   !row.godotFile.startsWith(row.name.slice(0,-4)))throw Error('Unexpected CC0 review/model identity');
 const originalPath=sidecar+'assets/cc0/3dassets-dental/'+row.originalFile;
 const derivedPath=sidecar+'assets/cc0/3dassets-dental/'+row.godotFile;
 const bytes=validateFile(originalPath,row.sha256);
 const derivedBytes=validateFile(derivedPath,row.godotSha256);
 if(bytes!==row.bytes||derivedBytes!==row.godotBytes)
  throw Error('Approved CC0 original/derived file byte-size drift '+row.name);
 roots.push(row.name+':original='+bytes+',godot='+derivedBytes);
}
const archivedReadme=read('README-FIRST.txt').toString('utf8');
if(!archivedReadme.includes('verified-raw-source'))
 throw Error('Windows portability instructions omit required verified source sidecar');
console.log('SR16_WINDOWS_EXPORTED_RAW_ASSETS_SHA_AND_PCK_PARITY_PASS source_sha='+sha+
 ' OBJ/MTL original=3 CC0 source+dequantized=4 Dundee FDI36 original=1 '+roots.join(' ; ')+
 ' clinical accuracy NOT validated; RTX/PC pixels NOT verified');
