import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildHandoffPdf,MD_PATH,PDF_PATH} from '../visual-qa/handoffs/build_handoff_pdf.mjs';

test('Durable next-chat Markdown and actual committed PDF are byte-reproducible mirrors',()=>{
 const md=fs.readFileSync(MD_PATH,'utf8');
 const bytes=fs.readFileSync(PDF_PATH);
 const result=buildHandoffPdf(md);
 assert.deepEqual(bytes,Buffer.from(result.pdf,'ascii'),
  'PDF must be built from exact CURRENT Markdown, not an earlier snapshot');
 assert(bytes.subarray(0,8).toString('ascii').startsWith('%PDF-1.'));
 assert(bytes.toString('ascii').trimEnd().endsWith('%%EOF'));
 assert(result.pages>=3);
 const actual=bytes.toString('ascii');
 assert(actual.includes('xref\n'));
 assert(actual.includes('/Count '+result.pages));
 assert.equal((actual.match(/\/Type \/Page \/Parent/g)||[]).length,result.pages);
 const mdSHA=crypto.createHash('sha256').update(md).digest('hex');
 assert.equal(mdSHA,result.originalHash);
 assert(actual.includes('f4d4d4151851a08342def08d9f2e461f5f5e7109'));
 assert(md.startsWith('# CURRENT 31 OCT 2026 HANDOFF OVERRIDE: GODOT SR1C'));
 assert(md.includes('14,856') && md.includes('14,936'));
 assert(md.includes('SR1C GODOT LOCAL NATIVE RENDER UNVERIFIED / NOT ACCEPTED'));
 assert(md.includes('separate Linux execution container'));
 assert(md.includes('sr1c-build-godot-local.ps1'));
 assert(md.includes('Quest/streaming/server video are LATER'));
 assert(md.includes('C:\\klab-sr1b-clinical-57801f1c-20261031-174525'));
 assert(md.includes('source=10320, native=6721'));
 assert(md.includes('diagnostic viewport'));
 assert(md.includes('nativeProceduralReloadedSections'));
 assert(md.includes('Quest'));
 assert(md.includes('GPU Engine'));
});
test('Generated PDF text commands stay inside printable page boundaries',()=>{
 const body=fs.readFileSync(PDF_PATH,'ascii');
 const rx=/BT \/(F[12]) ([\d.]+) Tf 48 ([\d.]+) Td \((.*?)\) Tj ET/g;
 let count=0;
 for(const m of body.matchAll(rx)){
  const size=Number(m[2]),y=Number(m[3]),raw=m[4];
  const text=raw.replace(/\\([()\\])/g,'$1');
  assert(y>=29&&y<=766,'Text baseline must be on the page: '+y);
  assert(text.length*size*.6<=516.01,'Line overflows printable right edge: '+text.slice(0,60));
  count++;
 }
 assert(count>180,'Handoff PDF has too little displayed text');
});

test('Committed handoff PDF parses, extracts real content, and renders through Poppler when available',t=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'kliniklab-sr1b-handoff-pdf-'));
 try{
  const pdfinfo=spawnSync('pdfinfo',[PDF_PATH],{encoding:'utf8',timeout:20000});
  if(pdfinfo.error?.code==='ENOENT'){t.skip('Poppler pdfinfo unavailable');return}
  assert.equal(pdfinfo.status,0,pdfinfo.stderr);
  const count=buildHandoffPdf(fs.readFileSync(MD_PATH,'utf8')).pages;
  assert.match(pdfinfo.stdout,new RegExp('Pages:\\s+'+count+'\\b'));
  assert.match(pdfinfo.stdout,/Page size:\s+612 x 792 pts/);
  const extract=spawnSync('pdftotext',['-layout',PDF_PATH,'-'],{encoding:'utf8',timeout:20000});
  assert.equal(extract.status,0,extract.stderr);
  for(const value of [
   'SR1C GODOT LOCAL RENDER FIRST',
   'f4d4d4151851a08342def08d9f2e461f5f5e7109',
   'Godot 4.7.2',
   'SR1C GODOT LOCAL NATIVE RENDER UNVERIFIED',
   '10,320',
   '6,724',
   '6,721',
   '14,856',
   '14,936',
   'ProceduralMeshComponent',
   'Quest',
   'NOT ACCEPTED'
  ])assert(extract.stdout.includes(value),'PDF extracted text missing '+value);
  const png=path.join(out,'page1');
  const render=spawnSync('pdftoppm',['-f','1','-l','1','-png','-singlefile','-r','110',PDF_PATH,png],{encoding:'utf8',timeout:30000});
  assert.equal(render.status,0,render.stderr);
  const data=fs.readFileSync(png+'.png');
  assert(data.length>10000);
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 } finally { fs.rmSync(out,{recursive:true,force:true}); }
});
