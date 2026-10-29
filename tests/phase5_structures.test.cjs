'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dental-structures.js'),'utf8');
function api(){const ctx={};vm.runInNewContext(source,ctx);return ctx.KlinikStructureExplorer}
test('all 32 FDI teeth map to the correct jaw and morphological class',()=>{
 const m=api(),seen=new Set();
 for(let q=1;q<=4;q++)for(let t=1;t<=8;t++){
  const id=String(q)+t,d=m.descriptor(id);
  assert(d);assert.equal(d.id,id);assert.equal(d.arch,q<=2?'Maxilla / Oberkiefer':'Mandible / Unterkiefer');
  assert.equal(d.side,q===1||q===4?'right / rechts':'left / links');
  assert.equal(d.kind,t<=2?'incisor':t===3?'canine':t<=5?'premolar':'molar');
  seen.add(d.id);
 }
 assert.equal(seen.size,32);
 for(const invalid of ['10','29','50','00','13x','',null,undefined])assert.equal(m.descriptor(invalid),null);
});
test('every morphological cross-section has five explicit tissue layers and no external assets',()=>{
 const m=api();
 for(const kind of ['incisor','canine','premolar','molar']){
  const svg=m.diagram(kind);
  assert.match(svg,/<svg viewBox="0 0 260 324"/);
  assert.match(svg,/role="img"/);
  for(const layer of ['enamel','dentin','pulp','cementum','ligament'])
   assert(svg.includes('data-structure-layer="'+layer+'"'));
  assert(!/<script|<image|\shref=|<foreignObject|javascript:/i.test(svg));
 }
 assert.throws(()=>m.diagram('custom'),/Unsupported/);
});
test('educational layer descriptions explicitly disclaim geometric/clinical precision',()=>{
 const descriptions=Object.values(api().layers).map(v=>v.description).join(' ');
 assert.match(descriptions,/not represent true enamel thickness/);
 assert.match(descriptions,/not an endodontic map/);
 assert.match(descriptions,/exaggerated for visibility/);
});
test('explorer panel responds to FDI changes, layer and focus toggles without Babylon',()=>{
 const items=[];
 function node(tag='div'){
  return {tagName:tag,id:'',hidden:false,children:[],style:{},attributes:{},listeners:{},dataset:{},
   setAttribute(k,v){this.attributes[k]=String(v)},
   getAttribute(k){return k==='data-layer'?this.dataset.layer:this.attributes[k]},
   addEventListener(k,fn){this.listeners[k]=fn},
   appendChild(c){this.children.push(c);items.push(c)},
   append(...c){for(const e of c)this.appendChild(e)},
   querySelector(sel){return this.querySelectorAll(sel)[0]||null},
   querySelectorAll(sel){
    const walk=n=>[n,...(n.children||[]).flatMap(walk)];
    return walk(this).filter(n=>sel.startsWith('#')?n.id===sel.slice(1):
      sel==='[data-layer]'?Boolean(n.dataset.layer):false);
   }};
 }
 const stage=node('div'),head=node('div');
 const document={readyState:'complete',getElementById:id=>(id==='stage'?stage:items.find(n=>n.id===id)||null),
  querySelector:s=>s==='#stage-controls .float-title'?head:null,createElement:node};
 let task=null;
 const window={kliniklab:{selectedTooth:'26'},
   setInterval:fn=>{task=fn;return 10},clearInterval:()=>{task=null}};
 vm.runInNewContext(source,{window,document});
 const a=window.KlinikStructureExplorer,open=document.getElementById('structure-toggle'),
  panel=document.getElementById('structure-panel');
 assert(open&&panel);assert.equal(panel.hidden,true);
 open.listeners.click();assert.equal(a.status.open,true);assert.equal(a.status.selectedFDI,'26');
 assert.equal(a.status.kind,'molar');
 assert.match(document.getElementById('structure-tooth-name').textContent,/FDI 26/);
 assert.equal(typeof task,'function');
 a.setLayer('pulp');assert.equal(a.status.layer,'pulp');
 const pressed=panel.querySelectorAll('[data-layer]').find(x=>x.dataset.layer==='pulp');
 assert.equal(pressed.attributes['aria-pressed'],'true');
 const focus=document.getElementById('structure-focus');
 focus.listeners.click();assert.equal(a.status.focusSelected,true);
 window.kliniklab.selectedTooth='11';task();
 assert.equal(a.status.selectedFDI,'11');assert.equal(a.status.kind,'incisor');
 assert.equal(a.setLayer('unknown'),false);
 document.getElementById('structure-close').listeners.click();
 assert.equal(a.status.open,false);assert.equal(a.status.focusSelected,false);
 assert.equal(task,null);assert.equal(panel.hidden,true);
});
test('focus is limited to the desktop display materials, and local server exposes the module',()=>{
 const preview=fs.readFileSync(path.join(__dirname,'../babylon-preview.js'),'utf8');
 const real=fs.readFileSync(path.join(__dirname,'../real-dental-scene.js'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../server/server.mjs'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const publicHTML=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 assert.match(preview,/KlinikStructureExplorer/);assert.match(real,/KlinikStructureExplorer/);
 assert.match(preview,/focusSelected/);assert.match(real,/focusSelected/);
 assert.match(server,/['"]\/dental-structures\.js['"]/);
 assert.equal(html,publicHTML);
 const scripts=['dental-appearance.js','dental-structures.js','real-dental-scene.js','babylon-preview.js'];
 let before=-1;for(const s of scripts){
  const i=html.indexOf('<script src="'+s+'"></script>');
  assert(i>before,'Script missing/wrong order: '+s);before=i;
 }
});
