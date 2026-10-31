import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
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
 assert(actual.includes('0f27a7e0e7179ef30a507e8bc0251749d6bbbad1'));
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
