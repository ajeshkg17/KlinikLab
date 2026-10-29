'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../fsp-kp-training.js'),'utf8');
function setup(withDOM=false){
 const window={kliniklab:{score:42},KlinikAnatomyPractice:{score:7}};
 const all={},created=[];
 function node(id=''){
  const obj={id,parentNode:null,nextSibling:null,hidden:false,innerHTML:'',textContent:'',value:'',className:'',style:{},attributes:{},listeners:{},focused:false,
   classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)}},
   addEventListener(name,cb){this.listeners[name]=cb},
   setAttribute(name,value){this.attributes[name]=value},
   focus(){this.focused=true},
   appendChild(child){child.parentNode=this;return child},
   insertBefore(child){child.parentNode=this;return child},
   querySelector(selector){return selector==='[data-fsp="close"]'?{focus(){}}:null}};
  created.push(obj);if(id)all[id]=obj;
  return obj;
 }
 let document;
 if(withDOM){
  const parent=node('nav'),anchor=node('journey-open'),head=node('head'),body=node('body');
  anchor.parentNode=parent;
  document={readyState:'complete',head,body,activeElement:{focus(){}},
   createElement(){return node()},
   getElementById(id){return created.find(x=>x.id===id)||null},
   addEventListener(name,fn){this.listeners[name]=fn},
   listeners:{}};
 }
 vm.runInNewContext(source,{window,document});
 return {api:window.KlinikFSPTraining,window,document,all};
}
test('two fictional cases each contain four complete workflows and fixed five-criterion rubrics',()=>{
 const {api}=setup();
 assert.deepEqual(Object.keys(api.cases).sort(),['endo','surgery']);
 assert.equal(api.phases.length,4);
 for(const [id,c] of Object.entries(api.cases)){
  assert.match(c.facts,/Fiktiver|fiktiv/);
  for(const p of api.phases){
   const t=api.taskFor(id,p.id);
   assert(t.prompt.length>60&&t.model.length>90);
   assert(t.b2&&t.c1);
   assert.equal(t.checks.length,5);
   assert.equal(api.score(id,p.id,t.model).score,10,
    'exemplar should cover stated rubric: '+id+'/'+p.id);
  }
 }
});
test('malformed and empty inputs return zero score without crashing or touching existing scores',()=>{
 const {api,window}=setup();
 for(const bad of ['', '    ', null, undefined, 22, {}, [], '\u00a0']){
  const r=api.score('endo','brief',bad);
  assert.equal(r.blank,true);assert.equal(r.score,0);assert.equal(r.max,10);
 }
 assert.equal(window.kliniklab.score,42);
 assert.equal(window.KlinikAnatomyPractice.score,7);
 assert.throws(()=>api.score('unknown','brief','x'),/Unknown/);
 assert.throws(()=>api.taskFor('endo','other'),/Unknown/);
});
test('rubric credits are deterministic, explain missed concepts and do not claim clinical accuracy',()=>{
 const {api}=setup();
 const sample='Zahn 36; Perkussion unauffällig.';
 const first=api.score('endo','kollegen',sample),second=api.score('endo','kollegen',sample);
 assert.equal(JSON.stringify(first),JSON.stringify(second));
 assert.equal(first.score,4);assert.equal(first.criteria.filter(x=>x.matched).length,2);
 assert(first.criteria.filter(x=>!x.matched).every(x=>x.tip.length>10));
 assert.match(first.method,/NOT|not|does not/);
 assert.equal(api.score('surgery','aufklaerung','Antibiotika sind immer notwendig').score,2);
});
test('no storage or remote requests, and mirrored script/server/standalone wiring are consistent',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const mirror=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 const jsMirror=fs.readFileSync(path.join(__dirname,'../public/fsp-kp-training.js'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../server/server.mjs'),'utf8');
 const builder=fs.readFileSync(path.join(__dirname,'../build_standalone.py'),'utf8');
 assert.equal(html,mirror);assert.equal(source,jsMirror);
 assert(html.includes('<script src="clinical-pathway.js"></script><script src="fsp-kp-training.js"></script>'));
 assert(server.includes("'/fsp-kp-training.js'"));
 assert(builder.includes("'fsp-kp-training.js'"));
 assert(!/\b(fetch|localStorage|sessionStorage|XMLHttpRequest|sendBeacon)\b/.test(source));
});
test('lightweight DOM mount opens and closes without altering other training modules',()=>{
 const {api,window,document}=setup(true);
 const trigger=document.getElementById('fsp-kp-open'),panel=document.getElementById('fsp-kp-overlay');
 assert(trigger&&panel);assert.equal(panel.hidden,true);
 trigger.listeners.click();
 assert.equal(api.status.open,true);assert.equal(panel.hidden,false);
 assert.match(panel.innerHTML,/Schleswig-Holstein FSP/);
 assert.equal(window.kliniklab.score,42);
 api.close();assert.equal(api.status.open,false);assert.equal(panel.hidden,true);
});
