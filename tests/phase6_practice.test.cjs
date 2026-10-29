'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dental-practice.js'),'utf8');
function descriptor(value){
 const id=String(value||'');
 if(!/^[1-4][1-8]$/.test(id))return null;
 const q=+id[0],n=+id[1];
 return {id,quadrant:q,ordinal:n,
  kind:n<=2?'incisor':n===3?'canine':n<=5?'premolar':'molar'};
}
function setup({withDOM=false}={}){
 const panels={};
 function node(tag='div'){
  const el={tagName:tag,id:'',hidden:false,style:{},attributes:{},dataset:{},listeners:{},
   children:[],scrollTop:0,textContent:'',
   appendChild(child){this.children.push(child)},
   append(...children){for(const child of children)this.appendChild(child)},
   setAttribute(k,v){this.attributes[k]=String(v)},
   addEventListener(k,fn){this.listeners[k]=fn},
   querySelector(sel){return this.querySelectorAll(sel)[0]||null},
   querySelectorAll(sel){
    const walk=el=>[el,...(el.children||[]).flatMap(walk)];
    return walk(this).filter(el=>sel.startsWith('#')?el.id===sel.slice(1):false);
   }};
  return el;
 }
 const stage=node(),structure=node();
 const window={KlinikStructureExplorer:{descriptor,status:{selectedFDI:'26'}},
  kliniklab:{selectedTooth:'26'}};
 const document=withDOM?{readyState:'complete',
  getElementById(id){if(id==='stage')return stage;if(id==='structure-panel')return structure;
   const find=(root)=>root.querySelector('#'+id);return find(stage)||find(structure)},
  createElement:node}:undefined;
 if(withDOM)window.document=document;
 vm.runInNewContext(source,{window,document});
 return {quiz:window.KlinikAnatomyPractice,stage,structure,document};
}
test('all permanent FDI teeth generate 10 valid local questions with four unique options',()=>{
 const {quiz}=setup();
 for(let q=1;q<=4;q++)for(let n=1;n<=8;n++){
  const id=''+q+n,bank=quiz.buildQuestions(id);
  assert.equal(bank.length,10);
  assert.equal(new Set(bank.map(x=>x.id)).size,10);
  for(const item of bank){
   assert.equal(item.options.length,4);
   assert.equal(new Set(item.options).size,4);
   assert(item.options.includes(item.correct));
   assert(item.explanation.length>=20);
  }
  assert.equal(bank.find(x=>x.id==='fdi-arch').correct,q<=2?'Upper jaw / Oberkiefer':'Lower jaw / Unterkiefer');
  assert.equal(bank.find(x=>x.id==='fdi-side').correct,[1,4].includes(q)?'Right / Rechts':'Left / Links');
  assert.equal(bank.find(x=>x.id==='fdi-quadrant').correct,
    ['Upper right permanent','Upper left permanent','Lower left permanent','Lower right permanent'][q-1]);
 }
});
test('invalid FDI input is refused and never silently replaced by a different tooth',()=>{
 const {quiz}=setup();
 for(const id of ['10','29','00','50','abc','',null]){
  assert.throws(()=>quiz.buildQuestions(id),/Select a permanent FDI/);
 }
});
test('session rejects skipping, double-answering and invalid responses',()=>{
 const {quiz}=setup();
 assert.equal(quiz.next(),false);
 quiz.start('26');
 assert.equal(quiz.status.total,10);
 assert.equal(quiz.status.score,0);
 assert.equal(quiz.next(),false);
 assert.equal(quiz.answer(-1),null);
 assert.equal(quiz.answer(4),null);
 assert.equal(quiz.answer(0.5),null);
 const index=quiz.currentQuestion.options.indexOf(quiz.currentQuestion.correct);
 assert.equal(quiz.answer(index),true);
 assert.equal(quiz.answer(index),null);
 assert.equal(quiz.status.score,1);
 assert.equal(quiz.next(),true);
 assert.equal(quiz.status.questionIndex,1);
 assert.equal(quiz.status.answered,false);
});
test('wrong answer shows correct response and score is never incremented',()=>{
 const {quiz}=setup();
 quiz.start('11');
 const first=quiz.currentQuestion,wrong=first.options.findIndex(x=>x!==first.correct);
 assert.equal(quiz.answer(wrong),false);
 assert.equal(quiz.status.lastCorrect,false);
 assert.equal(quiz.status.score,0);
 quiz.next();
 assert.equal(quiz.status.questionIndex,1);
});
test('complete ten questions, restart and close keep other simulator state untouched',()=>{
 const {quiz}=setup();
 const first=quiz.start('48');
 for(let i=0;i<10;i++){
  const q=quiz.currentQuestion,index=q.options.indexOf(q.correct);
  assert.equal(quiz.answer(index),true);
  assert.equal(quiz.next(),true);
 }
 assert(quiz.status.completed);
 assert.equal(quiz.status.score,10);
 assert.equal(quiz.answer(0),null);
 assert.equal(quiz.next(),false);
 quiz.start('48');
 assert.equal(quiz.status.completed,false);
 assert.equal(quiz.status.score,0);
 assert.equal(quiz.status.questionIndex,0);
 assert.equal(quiz.currentQuestion.id,first.id);
 quiz.close();
 assert.equal(quiz.status.open,false);
});
test('UI panel opens, scores, advances and restores the Phase 5 explorer',()=>{
 const {quiz,document,structure}=setup({withDOM:true});
 const trigger=structure.querySelector('#practice-toggle');
 assert(trigger);
 assert.equal(document.getElementById('practice-panel').hidden,true);
 trigger.listeners.click();
 const panel=document.getElementById('practice-panel');
 assert.equal(panel.hidden,false);
 assert.equal(structure.style.display,'none');
 assert.equal(quiz.status.selectedFDI,'26');
 assert.match(document.getElementById('practice-progress').textContent,/1 \/ 10/);
 const first=quiz.currentQuestion;
 const good=first.options.indexOf(first.correct);
 panel.querySelectorAll('#practice-options')[0].children[good].listeners.click();
 assert.equal(quiz.status.score,1);
 assert.equal(document.getElementById('practice-next').hidden,false);
 document.getElementById('practice-next').listeners.click();
 assert.equal(quiz.status.questionIndex,1);
 document.getElementById('practice-close').listeners.click();
 assert.equal(panel.hidden,true);
 assert.equal(structure.style.display,'');
});
test('module is local, server-allowed, and ordered immediately after structure explorer',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const mirror=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../server/server.mjs'),'utf8');
 assert.equal(html,mirror);
 const start=html.indexOf('<script src="dental-structures.js"></script>');
 const quiz=html.indexOf('<script src="dental-practice.js"></script>');
 const models=html.indexOf('<script src="real-dental-scene.js"></script>');
 assert(start>=0&&quiz>start&&models>quiz);
 assert.match(server,/['"]\/dental-practice\.js['"]/);
 assert(!/fetch\(|localStorage|sessionStorage|XMLHttpRequest|navigator\.sendBeacon/.test(source));
});
