#!/usr/bin/env node
/**
 * Source-derived fictional radiography for the offline Godot teaching app.
 * Samples the same procedural ToothSolid attenuation and bounded case table
 * as desktop-suite.js. All projections are SYNTHETIC and uncalibrated.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {loadProductionSolid} from '../visual-qa/sr1-local-kliniklab-export.mjs';

const opts=Object.fromEntries(process.argv.slice(2).map(arg=>{
 const i=arg.indexOf('=');
 if(!arg.startsWith('--')||i<3)throw Error('Expected --key=value');
 return [arg.slice(2,i),arg.slice(i+1)];
}));
const sourceDir=opts['source-dir'],output=opts.output,sha=opts['expected-sha'];
if(!sourceDir||!output||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Require --source-dir --output --expected-sha');
const root=fs.realpathSync(sourceDir);
if(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sha)
 throw Error('Radiography source Git HEAD mismatch');
if(fs.existsSync(output))throw Error('Refusing radiography output overwrite');
const js=fs.readFileSync(path.join(root,'desktop-suite.js'),'utf8');
const vol=fs.readFileSync(path.join(root,'volumetric-lab.js'),'utf8');
const start=js.indexOf('const info=['),end=js.indexOf('];\nlet modelFactory',start);
if(start<0||end<start||end-start>6000||js.indexOf('const info=[',start+1)>=0)
 throw Error('Bounded browser radiography case table changed');
const info=vm.runInNewContext(js.slice(start,end+2)+'\ninfo',Object.create(null),{timeout:1200});
const IDs=['molar','endo','anterior','crown','surgery','perio'];
const FDIs=['16','36','11','26','48','46'];
const KINDS=['caries','apex','trauma','normal','impaction','bone'];
if(!Array.isArray(info)||info.length!==6)throw Error('Original browser radiography catalog incomplete');
const {ToothSolid}=loadProductionSolid(vol);
const W=360,H=240;
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const crcTable=Uint32Array.from({length:256},(_,n)=>{
 let c=n;for(let k=0;k<8;k++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;
});
function chunk(type,body){
 const tag=Buffer.from(type,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4);
 length.writeUInt32BE(body.length);
 let x=0xffffffff;for(const b of Buffer.concat([tag,body]))x=crcTable[(x^b)&255]^(x>>>8);
 crc.writeUInt32BE((x^0xffffffff)>>>0);
 return Buffer.concat([length,tag,body,crc]);
}
function pngFromRGB(pixels){
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);
 ihdr.writeUInt8(8,8);ihdr.writeUInt8(2,9); // 8 bit RGB
 const stride=W*3,scan=Buffer.alloc(H*(stride+1));
 for(let y=0;y<H;y++)pixels.copy(scan,y*(stride+1)+1,y*stride,(y+1)*stride);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
  chunk('IDAT',zlib.deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const manifest={schemaVersion:1,kind:'SOURCE_SYNTHETIC_RADIOGRAPHY_EDUCATIONAL_PROJECTION_NOT_PATIENT_DATA',
 sourceGitSHA:sha,sourceDesktopSuiteSHA256:sha256(js),sourceToothSolidSHA256:sha256(vol),
 imageSize:[W,H],model:'SAMPLED_TOOTHSOLID_WITH_BROWSER_DESKTOP_SUITE_CASE_FINDING',
 clinicalAccuracyValidated:false,patientImage:false,cases:{}};
fs.mkdirSync(output,{recursive:true});
for(let c=0;c<6;c++){
 const row=info[c];
 if(!Array.isArray(row)||row.length!==5||row[0]!==IDs[c]||row[1]!==FDIs[c]||row[4]!==KINDS[c]||
    row.slice(2,4).some(s=>typeof s!=='string'||s.length<15||s.length>500))
  throw Error('Original radiography case identity/finding mismatch index '+c);
 const [id,fdi,title,reference,kind]=row;
 const solid=new ToothSolid(id,fdi);
 if(solid.fdi!==fdi)throw Error('FDI source anatomy identity mismatch');
 const rgb=Buffer.alloc(W*H*3);
 let lowest=255,highest=0,sum=0;
 for(let yPix=0;yPix<H;yPix++)for(let xPix=0;xPix<W;xPix++){
  const x=(xPix/W-.5)*6.0,y=1.45-yPix/H*3.45;
  let tau=0;
  for(const dx of [-2.05,0,2.05]){
   const xx=x-dx;
   if(Math.abs(xx)>1.3)continue;
   for(let k=0;k<10;k++){
    const z=-1.0+(k+.5)*.20;
    if(solid.outer(xx,y,z)>0)continue;
    const t=solid.tissue(xx,y,z);
    tau+=t==='enamel'?.150:t==='dentin'?.079:t==='pulp'?.025:t==='caries'?.023:.071;
   }
  }
  let density=32+190*(1-Math.exp(-tau));
  const noise=(Math.sin(xPix*12.9898+yPix*78.233)*43758.5453)%1;
  density+=Math.abs(noise)*11-5;
  if(kind==='caries')density-=115*Math.max(0,1-Math.hypot((x-.80)/.36,(y-.62)/.39));
  if(kind==='apex'&&Math.hypot(x/.34,(y+1.30)/.33)<1)density-=65;
  if(kind==='bone'&&y<-.12&&y>-.4)density-=38;
  if(kind==='impaction'&&x>1.55&&Math.abs(y)<.4)density-=40;
  if(kind==='trauma'&&Math.abs(x)<.57&&Math.abs(y-.57)<.028)density-=52;
  const lum=Math.round(clamp(clamp((density-105)*1.15+105,0,255)*1.10,0,255));
  lowest=Math.min(lowest,lum);highest=Math.max(highest,lum);sum+=lum;
  const o=(yPix*W+xPix)*3;
  rgb[o]=Math.round(lum*.83);rgb[o+1]=Math.round(lum*.96);rgb[o+2]=lum;
 }
 if(highest-lowest<70)throw Error('Flat/blank source synthetic image FDI'+fdi);
 const file='fdi'+fdi+'-synthetic.png';
 const bytes=pngFromRGB(rgb);
 fs.writeFileSync(path.join(output,file),bytes,{flag:'wx'});
 manifest.cases[id]={id,fdi,title,reference,kind,file,sha256:sha256(bytes),
  minLuminance:lowest,maxLuminance:highest,meanLuminance:Number((sum/(W*H)).toFixed(3))};
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log('SR10_NATIVE_SYNTHETIC_RADIOGRAPHY_SOURCE_EXPORTED 6 case projections sha='+sha);
