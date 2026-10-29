'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app-tutorial.js'),'utf8');
function setup({mobile=false,offscreenNavigation=false}={}){
 const nodes=[],listeners={};
 function node(tag='div'){
  return {tagName:tag.toUpperCase(),id:'',children:[],hidden:false,disabled:false,
    style:{},attributes:{},listeners:{},textContent:'',scrolls:0,
    getBoundingClientRect(){return this.rect||{left:10,top:15,right:160,bottom:52,width:150,height:37}},
    scrollIntoView(){this.scrolls++},
    setAttribute(k,v){this.attributes[k]=String(v)},
    addEventListener(name,fn){this.listeners[name]=fn},
    focus(){document.activeElement=this},
    appendChild(child){this.children.push(child);nodes.push(child)},
    append(...children){for(const child of children)this.appendChild(child)},
    querySelector(q){
     if(q==='#kl-tour-bar span')return this.children.find(x=>x.id==='kl-tour-bar')?.children[0]||null;
     return this.querySelectorAll(q)[0]||null;
    },
    querySelectorAll(q){
     const all=e=>[e,...e.children.flatMap(all)];
     return all(this).filter(x=>q.startsWith('#')?x.id===q.slice(1):false);
    }
  };
 }
 const body=node('body'),head=node('head'),help=node('button');help.id='help';
 const anchors=new Map([['#help',help]]);
 for(const selector of ['#training-nav','#open-nav','#scene','#stage-controls .stage-controls',
    '#chart','#case-quick','#tray','#structure-toggle','#focus','.right','#jump-exercise','#vr'])
  anchors.set(selector,node('div'));
 if(offscreenNavigation)
  anchors.get('#training-nav').rect={left:-450,top:80,right:-10,bottom:600,width:440,height:520};
 const document={readyState:'complete',body,head,activeElement:help,
  getElementById:id=>nodes.find(x=>x.id===id)||[help,body,head].find(x=>x.id===id)||null,
  querySelector:q=>anchors.get(q)||nodes.find(x=>x.id===q.slice(1))||null,
  createElement:node,
  addEventListener(k,fn){listeners[k]=fn}};
 const window={innerWidth:mobile?390:1280,innerHeight:mobile?780:800,
  setTimeout(fn){fn()},addEventListener(k,fn){listeners[k]=fn}};
 const context={window,document};
 vm.runInNewContext(source,context);
 return {tour:window.KlinikTutorial,document,window,help,anchors,listeners};
}
test('10 documented steps cover existing app stations and do not invoke clinical actions',()=>{
 const {tour}=setup();
 assert.equal(tour.steps.length,10);
 assert.deepEqual(Array.from(tour.steps,x=>x.id),[
  'welcome','stations','scene','views','fdi','tools','anatomy','practice','clinical','vr']);
 assert(tour.steps.every(s=>s.title.length>5&&s.body.length>35&&s.tip.length>15));
 assert(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|\.click\(|enterVR\(|selectStation\(/.test(source));
});
test('guide opens with first step; next/back/progress and finish work',()=>{
 const {tour,help,document}=setup();
 const panel=document.getElementById('kl-tour-panel'),ring=document.getElementById('kl-tour-ring');
 assert(panel.hidden&&ring.hidden);
 assert.equal(tour.open(),true);assert.equal(tour.status.currentId,'welcome');
 assert.equal(help.attributes['aria-expanded'],'true');assert.equal(panel.hidden,false);
 assert.equal(panel.attributes.role,'dialog');
 assert.equal(panel.attributes['aria-modal'],'false');
 assert.equal(document.getElementById('kl-tour-counter').textContent,'GUIDED TOUR · 1 / 10');
 assert.equal(tour.back(),false);
 assert.equal(tour.next(),true);assert.equal(tour.status.currentId,'stations');
 assert.equal(tour.back(),true);assert.equal(tour.status.index,0);
 assert.equal(tour.go(9),true);
 assert.equal(document.getElementById('kl-tour-next').textContent,'Finish');
 assert.equal(tour.next(),true);
 assert.equal(tour.status.open,false);
 assert.equal(panel.hidden,true);assert.equal(ring.hidden,true);
 assert.equal(help.attributes['aria-expanded'],'false');
 assert.equal(document.activeElement,help);
});
test('Escape closes, ArrowRight/ArrowLeft traverse, invalid navigation is rejected',()=>{
 const {tour,listeners}=setup();
 tour.open();
 const keyboard=(key,tag='DIV')=>listeners.keydown({key,target:{tagName:tag},preventDefault(){}});
 keyboard('ArrowRight');assert.equal(tour.status.index,1);
 keyboard('ArrowLeft');assert.equal(tour.status.index,0);
 assert.equal(tour.go(-1),false);assert.equal(tour.go(10),false);
 keyboard('ArrowRight','INPUT');assert.equal(tour.status.index,0);
 keyboard('Escape');assert.equal(tour.status.open,false);
 assert.equal(tour.next(),false);
});
test('mobile offscreen station navigation safely falls back to Cases button',()=>{
 const {tour,anchors,document}=setup({mobile:true,offscreenNavigation:true});
 tour.open();tour.next();
 assert.equal(tour.status.currentId,'stations');
 assert(anchors.get('#open-nav').scrolls>0);
 assert.equal(document.getElementById('kl-tour-ring').hidden,false);
});
test('re-opening tour resets to the welcome step without touching app controls',()=>{
 const {tour,anchors,help}=setup();
 tour.open();tour.go(8);tour.close();tour.open();
 assert.equal(tour.status.index,0);
 assert.equal(tour.status.open,true);
 for(const x of anchors.values())assert.equal(Object.keys(x.listeners).length,0);
 assert.equal(help.attributes['aria-expanded'],'true');
});
test('same modules are mirrored, served safely, and bundled after app',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const pub=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../server/server.mjs'),'utf8');
 assert.equal(html,pub);
 assert.match(app,/KlinikTutorial\?\.open/);
 assert.match(server,/['"]\/app-tutorial\.js['"]/);
 assert.match(html,/<button class="btn tiny" id="help"[^>]*>[\s\S]*?Tutorial<\/button>/);
 assert(html.indexOf('<script src="app-tutorial.js"></script>')>
   html.indexOf('<script src="dundee-atlas.js"></script>'));
 assert(!/alert\('Choose a clinical case on the left/.test(app));
});
