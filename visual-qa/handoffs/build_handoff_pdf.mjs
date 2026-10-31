#!/usr/bin/env node
/* Deterministic, dependency-free ASCII text-searchable PDF generated from
 * the adjacent Markdown; preserves complete text and source SHA256.
 * Standard PDF 1.4, built-in Courier fonts, no external dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
export const HANDOFF_BASE='KLINIKLAB_DEVELOPMENT_SR1_HANDOFF_2026-10-31';
export const MD_PATH=path.join(dir,HANDOFF_BASE+'.md');
export const PDF_PATH=path.join(dir,HANDOFF_BASE+'.pdf');

function esc(s){return s.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)')}
function wrap(s,width){
 if(!s)return [''];
 const out=[];
 while(s.length>width){
  let n=s.lastIndexOf(' ',width);
  if(n<Math.floor(width*.40))n=width;
  out.push(s.slice(0,n));
  s=s.slice(n).replace(/^ +/,'');
 }
 out.push(s);
 return out;
}
function lineKind(raw){
 const fence=String.fromCharCode(96).repeat(3);
 if(raw.startsWith(fence))return {text:raw,kind:'codeFence'};
 const h=raw.match(/^(#{1,3})\s+(.*)$/);
 if(h)return {text:h[2],kind:h[1].length===1?'title':'heading'};
 if(!raw)return {text:'',kind:'blank'};
 const isCode=/^\s{2,}|^\|[^\n]*\|$|^\s*[-*]\s/.test(raw);
 return {text:raw.replace(/\*\*/g,'').replaceAll(String.fromCharCode(96),''),
         kind:isCode?'code':'body'};
}
export function buildHandoffPdf(md){
 if(typeof md!=='string'||md.length<1500)throw Error('Incomplete handoff Markdown');
 if(/[^\x09\x0A\x0D\x20-\x7E]/.test(md))throw Error('Non-ASCII source would lose glyphs');
 const hash=crypto.createHash('sha256').update(md,'utf8').digest('hex');
 const pages=[[]];
 const sizes={title:13,heading:10.5,body:8.4,code:8.05,codeFence:7.5,blank:8.4};
 const steps={title:18,heading:15,body:11.1,code:10.2,codeFence:9.8,blank:7};
 const fonts={title:'F2',heading:'F2',body:'F1',code:'F1',codeFence:'F1',blank:'F1'};
 let y=727;
 const newPage=()=>{pages.push([]);y=727};
 for(const line of md.replace(/\r\n/g,'\n').split('\n')){
  const v=lineKind(line),size=sizes[v.kind],step=steps[v.kind];
  const rows=wrap(v.text,Math.floor(510/(size*.60)));
  if((v.kind==='heading'||v.kind==='title')&&y<90)newPage();
  for(const text of rows){
   if(y-step<53)newPage();
   pages.at(-1).push({text,font:fonts[v.kind],size,y});
   y-=step;
  }
 }
 const n=pages.length,objects=[];
 const pageIds=pages.map((_,i)=>5+2*i), infoId=5+2*n;
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[2]='<< /Type /Pages /Kids ['+pageIds.map(k=>k+' 0 R').join(' ')+'] /Count '+n+' >>';
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
 objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>';
 pages.forEach((items,i)=>{
  const p=pageIds[i],c=p+1;
  const stream=[
   'BT /F2 9 Tf 48 764 Td (KLINIKLAB  |  SR1C GODOT LOCAL RENDER FIRST) Tj ET',
   '0.55 w 48 755 m 564 755 l S',
   ...items.map(x=>'BT /'+x.font+' '+x.size+' Tf 48 '+x.y.toFixed(2)+' Td ('+esc(x.text)+') Tj ET'),
   '0.4 w 48 47 m 564 47 l S',
   'BT /F1 7.8 Tf 48 33 Td (Source code SHA: f4d4d4151851a08342def08d9f2e461f5f5e7109) Tj ET',
   'BT /F1 7.8 Tf 473 33 Td (Page '+(i+1)+' of '+n+') Tj ET'
  ].join('\n')+'\n';
  objects[p]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+c+' 0 R >>';
  objects[c]='<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream';
 });
 objects[infoId]='<< /Title (KlinikLab durable SR1C Godot next-chat handoff) /Author (KlinikLab development) /Creator (KlinikLab deterministic Markdown handoff generator) /Subject (Paired with the same-base-name Markdown source at committed Git revision) >>';
 let pdf='%PDF-1.4\n% ASCII, searchable, deterministic\n';
 const offsets=[0];
 for(let i=1;i<=infoId;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n'}
 const xref=pdf.length;
 pdf+='xref\n0 '+(infoId+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<=infoId;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+(infoId+1)+' /Root 1 0 R /Info '+infoId+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 if(/[^\x00-\x7F]/.test(pdf))throw Error('PDF must remain ASCII for GitHub blob');
 return {pdf,originalHash:hash,pages:n};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=buildHandoffPdf(fs.readFileSync(MD_PATH,'utf8'));
 fs.writeFileSync(PDF_PATH,result.pdf,'ascii');
 console.log(JSON.stringify({markdown:MD_PATH,pdf:PDF_PATH,markdownSHA256:result.originalHash,pages:result.pages,bytes:result.pdf.length}));
}