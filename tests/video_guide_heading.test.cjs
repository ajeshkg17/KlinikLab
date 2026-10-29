'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('video dialog names and updates its own heading without changing volume heading',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../video-guide.js'),'utf8');
 const nodes=new Map(),created=[];
 const make=id=>({id,hidden:true,textContent:'',innerHTML:'',focus(){},addEventListener(){}});
 const volume=make('vl-title');volume.textContent='Volume simulator';nodes.set(volume.id,volume);
 let dialogLabel;
 const document={readyState:'complete',head:{appendChild(){}},
  createElement:()=>{const n=make('');created.push(n);return n;},getElementById:id=>nodes.get(id)||null,
  querySelector:()=>({insertBefore(){},appendChild(){}}),querySelectorAll:()=>[],addEventListener(){},
  body:{classList:{add(){},remove(){}},insertAdjacentHTML(position,html){
   dialogLabel=html.match(/aria-labelledby="([^"]+)"/)[1];
   for(const [,id] of html.matchAll(/\bid="([^"]+)"/g)){
    assert(!nodes.has(id),'duplicate DOM id: '+id);nodes.set(id,make(id));
   }
  }}};
 const context={document,window:{kliniklab:{caseData:{archetype:'endo'}}}};
 vm.runInNewContext(source,context);
 assert.equal(dialogLabel,'vl-video-title');
 nodes.set('vl-play',make('vl-play')); // Created by draw() inside the media container.
 for(let i=0;i<2;i++){
  nodes.get('vl-close').onclick();
  created.find(n=>n.id==='vl-trigger').onclick();
  assert.match(nodes.get(dialogLabel).textContent,/Endodontische Behandlung/);
  assert.equal(volume.textContent,'Volume simulator');
 }
});
