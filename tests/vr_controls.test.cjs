'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function setup(scene){
 const button={textContent:'Enter VR',disabled:false,attributes:{},
  setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}};
 const messages=[];
 const start=source.indexOf(' async toggleVR(){'),end=source.indexOf(' async checkXR(){',start);
 assert(start>0&&end>start);
 const toggle=vm.runInNewContext('({'+source.slice(start,end)+'}).toggleVR',{$:()=>button});
 const app={scene,toast(text){messages.push(text);}};
 return {button,messages,app,toggle:()=>toggle.call(app)};
}
test('VR entry starts synchronously from click and blocks repeated pending clicks',async()=>{
 let resolve,calls=0;
 const pending=new Promise(r=>{resolve=r;});
 const t=setup({enterVR(){calls++;return pending;}});
 const first=t.toggle();assert.equal(calls,1);
 assert.equal(t.button.disabled,true);assert.equal(t.button.attributes['aria-busy'],'true');
 assert.equal(t.button.textContent,'Starting VR…');
 assert.equal(await t.toggle(),false);assert.equal(calls,1);
 resolve();assert.equal(await first,true);
 assert.deepEqual(t.messages,['VR session activated']);
 assert.equal(t.button.disabled,false);assert.equal(t.button.textContent,'Enter VR');
 assert.equal(t.button.attributes['aria-busy'],undefined);assert.equal(t.app.vrBusy,false);
});
test('VR exit reports ended rather than activated and prevents repeated end requests',async()=>{
 let resolve,calls=0;
 const t=setup({xrSession:{end(){calls++;return new Promise(r=>{resolve=r;});}}});
 const first=t.toggle();assert.equal(t.button.textContent,'Leaving VR…');
 assert.equal(await t.toggle(),false);assert.equal(calls,1);
 resolve();await first;assert.deepEqual(t.messages,['VR session ended']);
});
test('denied entry restores button state and allows retry',async()=>{
 let calls=0;
 const t=setup({enterVR(){if(++calls===1)throw Error('Permission denied');return Promise.resolve();}});
 assert.equal(await t.toggle(),false);assert.deepEqual(t.messages,['Permission denied']);
 assert.equal(t.button.disabled,false);assert.equal(t.app.vrBusy,false);
 assert.equal(await t.toggle(),true);assert.equal(calls,2);
});
test('failed exit offers recovery and restores the button',async()=>{
 const t=setup({xrSession:{end(){return Promise.reject(null);}}});
 assert.equal(await t.toggle(),false);assert.match(t.messages[0],/Could not leave VR/);
 assert.equal(t.button.disabled,false);assert.equal(t.app.vrBusy,false);
});
test('missing renderer or desktop fallback explains VR availability',async()=>{
 for(const scene of [null,{}]){
  const t=setup(scene);assert.equal(await t.toggle(),false);
  assert.match(t.messages[0],/WebGL renderer/);assert.equal(t.button.disabled,false);
 }
});

function capabilities(t,xr,secure=true){
 const start=source.indexOf(' async checkXR(){'),end=source.indexOf(' toast(s){',start);
 return vm.runInNewContext('({'+source.slice(start,end)+'}).checkXR',{
  $:()=>t.button,navigator:{xr},window:{isSecureContext:secure}
 }).bind(t.app);
}
test('capability checks respect renderer, security and browser prerequisites',async()=>{
 let probes=0;const xr={isSessionSupported:async()=>{probes++;return true;}};
 for(const [scene,secure,xrApi,message] of [[{},true,xr,/WebGL/],[{enterVR(){}},false,xr,/HTTPS/],[{enterVR(){}},true,{},/unavailable/]]){
  const t=setup(scene);await capabilities(t,xrApi,secure)();
  assert(t.button.disabled);assert.match(t.button.title,message);
 }
 assert.equal(probes,0);
});
test('late capability probe cannot enable the button during pending entry',async()=>{
 let support,enter;
 const t=setup({enterVR(){return new Promise(r=>{enter=r;});}});
 const check=capabilities(t,{isSessionSupported:()=>new Promise(r=>{support=r;})});
 const probe=check(),starting=t.toggle();
 support(true);await probe;assert(t.button.disabled);assert.equal(t.button.textContent,'Starting VR…');
 enter();await starting;assert.equal(t.button.disabled,false);
});
test('latest capability probe wins when results arrive out of order',async()=>{
 const resolves=[];const t=setup({enterVR(){}});
 const check=capabilities(t,{isSessionSupported:()=>new Promise(r=>resolves.push(r))});
 const old=check(),latest=check();resolves[1](false);await latest;
 resolves[0](true);await old;assert(t.button.disabled);assert.equal(t.app.xrCapabilitySupported,false);
});
test('late capability result cannot re-enable a replaced fallback renderer',async()=>{
 let resolve;const t=setup({enterVR(){}});
 const check=capabilities(t,{isSessionSupported:()=>new Promise(r=>{resolve=r;})});
 const pending=check();t.app.scene={};t.button.disabled=true;
 resolve(true);await pending;assert(t.button.disabled);assert.equal(t.app.xrCapabilitySupported,undefined);
});
test('active session exit stays available and failed support probes are retryable',async()=>{
 const t=setup({enterVR(){}});let fail=true;
 const check=capabilities(t,{isSessionSupported:async()=>{if(fail)throw Error('temporary');return true;}});
 await check();assert(t.button.disabled);assert.match(t.button.title,/Retry/);
 fail=false;await check();assert.equal(t.button.disabled,false);
 t.app.scene.xrSession={};t.button.disabled=true;await capabilities(t,{},false)();
 assert.equal(t.button.disabled,false);assert.match(t.button.title,/Leave/);
});
