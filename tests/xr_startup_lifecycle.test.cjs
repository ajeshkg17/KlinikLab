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
