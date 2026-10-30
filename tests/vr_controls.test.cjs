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
