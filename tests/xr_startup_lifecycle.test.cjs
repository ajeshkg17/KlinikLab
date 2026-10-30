'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
const start=engine.indexOf('  async enterVR(){'),end=engine.indexOf('  handleXREnd(session){',start);

for(const boundary of ['graphics','reference-space'])test(`ended XR session cannot become active after awaiting ${boundary}`,async()=>{
 let release,waiting;
 const reached=new Promise(resolve=>{waiting=resolve});
 const pending=new Promise(resolve=>{release=resolve});
 const listeners={};let scheduled=0,comfort=0;
 const session={addEventListener(name,fn){listeners[name]=fn},updateRenderState(){},
  async requestReferenceSpace(){if(boundary==='reference-space'){waiting();await pending;}return {};},
  requestAnimationFrame(){scheduled++;},async end(){listeners.end();}};
 const enter=vm.runInNewContext('({'+engine.slice(start,end)+'}).enterVR',{
  navigator:{xr:{requestSession:async()=>session}},isSecureContext:true,XRWebGLLayer:class {}});
 const scene={xrSession:null,xrStarting:false,
  gl:{async makeXRCompatible(){if(boundary==='graphics'){waiting();await pending;}}},
  handleXREnd(s){assert.equal(s,session);},setXRComfort(){comfort++;},
  focusDecor:[],xrBoardMeshes:[],xrLoop(){}};
 const result=enter.call(scene);await reached;
 listeners.end();release();
 await assert.rejects(result,/ended during startup/);
 assert.equal(scene.xrSession,null);assert.equal(scene.xrStarting,false);
 assert.equal(comfort,0);assert.equal(scheduled,0);
 // The failed startup must not prevent a fresh session from starting.
 const retry=await enter.call(scene);
 assert.equal(retry,session);assert.equal(scene.xrSession,session);
 assert.equal(comfort,1);assert.equal(scheduled,1);
});

const prep=fs.readFileSync(path.join(__dirname,'../xr-procedure.js'),'utf8');
const frameStart=prep.indexOf('  onXRFrame(frame,t){'),frameEnd=prep.indexOf('  cut(contact,source){',frameStart);
const onFrame=vm.runInNewContext('({'+prep.slice(frameStart,frameEnd)+'}).onXRFrame');
function practice(){
 const source={};let cuts=0;
 const scene={xrGuide:{state:{open:false}},getRayHit:()=>null};
 const lab={active:true,scene,triggers:new Set([source]),lastCut:null,tip:{hidden:false},
  syncCase(){},dirty:false,rayForFrame:()=>({o:[],d:[]}),traceSurface:()=>({world:[0,0,0]}),
  cut(){cuts++;}};
 return {source,lab,cuts:()=>cuts};
}
test('disconnect releases held cutting input; reconnect requires a new trigger press',()=>{
 const {source,lab,cuts}=practice();
 onFrame.call(lab,{session:{visibilityState:'visible',inputSources:[]}},1000);
 assert.equal(lab.triggers.size,0);
 onFrame.call(lab,{session:{visibilityState:'visible',inputSources:[source]}},2000);
 assert.equal(cuts(),0);assert.equal(lab.triggers.size,0);
 lab.triggers.add(source);
 onFrame.call(lab,{session:{visibilityState:'visible',inputSources:[source]}},3000);
 assert.equal(cuts(),1);
});
for(const visibilityState of ['hidden','visible-blurred'])test(`XR visibility ${visibilityState} stops cutting until a fresh press`,()=>{
 const {source,lab,cuts}=practice();lab.lastCut={time:1};
 onFrame.call(lab,{session:{visibilityState,inputSources:[source]}},1000);
 assert.equal(cuts(),0);assert.equal(lab.triggers.size,0);
 assert.equal(lab.tip.hidden,true);assert.equal(lab.lastCut,null);
 onFrame.call(lab,{session:{visibilityState:'visible',inputSources:[source]}},2000);
 assert.equal(cuts(),0);
});
test('trigger events while XR is obscured cannot perform the initial cut',()=>{
 const s=prep.indexOf('  onSelectStart(event,frame){'),e=prep.indexOf('  onSelectEnd(e){',s);
 const select=vm.runInNewContext('({'+prep.slice(s,e)+'}).onSelectStart');
 for(const visibilityState of ['hidden','visible-blurred']){
  const {source,lab,cuts}=practice();
  lab.rayForFrame=()=>{throw Error('obscured session must not trace or cut');};
  assert.equal(select.call(lab,{inputSource:source},{session:{visibilityState}}),true);
  assert.equal(lab.triggers.size,0);assert.equal(cuts(),0);assert(lab.tip.hidden);
 }
});
