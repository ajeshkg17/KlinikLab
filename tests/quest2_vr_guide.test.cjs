'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../xr-guide.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
const prep=fs.readFileSync(path.join(__dirname,'../xr-procedure.js'),'utf8');
function makeGuide(){
 const ctx={};vm.runInNewContext(code,ctx);
 const meshes=[],hits=new Map();let selected=null;
 const scene={
  xrRef:{},meshes,
  box(p,s,c,o={}){const m={p:p.slice(),s:s.slice(),key:o.key||null,hidden:false,kind:'box',label:null};meshes.push(m);if(m.key)hits.set(m.key,m);return m},
  label(str,p,s){const m={p:p.slice(),s:s.slice(),hidden:false,kind:'quad',label:str};meshes.push(m);return m},
  replaceLabel(m,str){m.label=str},
  rotateByQuat(){return [0,0,-1]},
  getRayHit(){return {key:selected}}
 };
 const guide=new ctx.KlinikXRGuide.XRControllerGuide(scene);
 const trigger=()=>guide.onSelectStart({inputSource:{targetRaySpace:{}}},{getPose:()=>({
  transform:{position:{x:0,y:1.5,z:0},orientation:{x:0,y:0,z:0,w:1}}
 })});
 return {ctx,scene,guide,hit:key=>{selected=key;return trigger()},hits};
}
test('five native XR teaching pages explain tracked trigger, grip and limitations',()=>{
 const {ctx}=makeGuide();
 assert.equal(ctx.KlinikXRGuide.pages.length,5);
 const content=ctx.KlinikXRGuide.pages.flatMap(p=>p.lines).join(' ');
 assert.match(content,/INDEX TRIGGER/);
 assert.match(content,/GRIP/);
 assert.match(content,/Release TRIGGER/);
 assert.match(content,/Quest system menu/);
 assert.match(content,/No real depth or force calibration/);
});
test('controller select routes to VR help, while help blocks teeth and drill selection',()=>{
 const {guide,ctx,hit,hits}=makeGuide(),s=ctx.KlinikXRGuide.state;
 assert.equal(s.active,false);
 assert(hits.has('guide:next')&&hits.has('guide:back')&&hits.has('guide:close')&&hits.has('guide:open'));
 assert(guide.meshes.every(m=>m.hidden));
 guide.onEnter();
 assert.equal(s.active,true);assert.equal(s.open,true);assert.equal(s.index,0);
 assert.equal(hit('tooth:16'),true);assert.equal(s.index,0); // blocked beneath tutorial
 assert.equal(hit('guide:next'),true);assert.equal(s.index,1);
 assert.equal(hit('guide:back'),true);assert.equal(s.index,0);
 assert.equal(guide.back(),false);
 assert.equal(hit('guide:close'),true);assert.equal(s.open,false);
 assert.equal(hit('tooth:16'),false); // ordinary tooth selection may resume
 assert.equal(hit('guide:open'),true);assert.equal(s.open,true);
 assert.equal(s.controllerSelects,5);
 guide.onExit();assert(!s.active&&!s.open);
 assert(guide.meshes.every(m=>m.hidden));
});
test('Quest grip reopens the tutorial without a joystick or button-index assumption',()=>{
 const {guide,ctx}=makeGuide(),state=ctx.KlinikXRGuide.state;
 guide.onEnter();guide.close();
 assert.equal(guide.onSqueezeStart(),true);
 assert(state.open);assert.equal(state.index,0);assert.equal(state.gripOpens,1);
 guide.onExit();assert.equal(guide.onSqueezeStart(),false);
});
test('XR-only comfort resizing preserves model and ray hit positions on exit',()=>{
 const start=engine.indexOf('  setXRComfort(active){'),end=engine.indexOf('  installEvents(){',start);
 assert(start>0&&end>start);
 const fn=vm.runInNewContext('({'+engine.slice(start,end)+'}).setXRComfort');
 const model={p:[.5,1.4,-1.5],s:[.9,.1,.8],model:null};
 const board={p:[-1.66,1.48,-2.2],s:[.88,2.35,.065],model:null};
 const hitModel={mesh:model,p:[.5,1.4,-1.5],radius:.25};
 const hitBoard={mesh:board,p:[-1.66,1.48,-2.2],radius:.39};
 const scene={vrCompactMeshes:[model],xrBoardMeshes:[board],pickables:[hitModel,hitBoard],
  xrComfort:{active:false},xrComfortScale:.78,xrComfortSnapshot:null};
 const original=JSON.stringify([model,board,hitModel.p,hitBoard.p,hitModel.radius,hitBoard.radius]);
 fn.call(scene,true);
 assert.equal(scene.xrComfort.active,true);
 assert.equal(scene.xrComfort.scale,.78);
 assert.equal(scene.xrComfort.lessonScale,.68);
 assert(Math.abs(model.s[0]-.702)<1e-9);
 assert(Math.abs(board.s[1]-1.598)<1e-9);
 assert.equal(hitModel.radius,.25*.78);
 assert.equal(hitBoard.radius,.39*.68);
 fn.call(scene,true); // idempotent
 fn.call(scene,false);
 assert.equal(scene.xrComfort.active,false);
 assert.equal(JSON.stringify([model,board,hitModel.p,hitBoard.p,hitModel.radius,hitBoard.radius]),original);
});
test('real WebXR event routing sends controller input to tutorial before cutting',()=>{
 assert.match(engine,/if\(this\.xrGuide\?\.onSelectStart\(e,frame\)\)return;if\(this\.xrPrep\?\.onSelectStart/);
 assert.match(engine,/session\.addEventListener\('squeezestart'/);
 assert.match(engine,/this\.xrGuide\?\.onEnter\(\)/);
 assert.match(engine,/this\.xrGuide\?\.onExit\(\)/);
 assert.match(prep,/if\(this\.scene\.xrGuide\?\.state\?\.open\)\{this\.triggers\.clear\(\)/);
});
test('script served before Quest preparation initializes and standalone bundler includes it',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const publicHtml=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../server/server.mjs'),'utf8');
 const build=fs.readFileSync(path.join(__dirname,'../build_standalone.py'),'utf8');
 assert.equal(html,publicHtml);
 assert.match(server,/['"]\/xr-guide\.js['"]/);
 assert(html.indexOf('<script src="xr-guide.js"></script>')>html.indexOf('<script src="xr-procedure.js"></script>'));
 assert.match(build,/['"]xr-guide\.js['"]/);
});

test('guide ray ignores closer tooth targets and no-pose selects are safe',()=>{
 const {guide,scene,ctx}=makeGuide();guide.onEnter();
 let filtered=false;scene.getRayHit=(o,d,allow)=>{filtered=!!allow&&allow({key:'guide:next'})&&!allow({key:'tooth:16'});return filtered?{key:'guide:next'}:{key:'tooth:16'}};
 const event={inputSource:{targetRaySpace:{}}},frame={getPose:()=>({transform:{position:{x:0,y:1.5,z:0},orientation:{x:0,y:0,z:0,w:1}}})};
 assert.equal(guide.onSelectStart(event,frame),true);assert(filtered);
 assert.equal(ctx.KlinikXRGuide.state.index,1);
 assert.equal(guide.onSelectStart(event,{getPose(){throw Error('tracking lost')}}),true);
 guide.close();assert.equal(guide.onSelectStart(event,{getPose:()=>null}),false);
 guide.onExit();
});
test('XR pose helper returns null for missing or throwing controller poses',()=>{
 const start=engine.indexOf('  getXRInputPose(frame,source){'),end=engine.indexOf('  pickXR(pose){',start);
 assert(start>0&&end>start);
 const fn=vm.runInNewContext('({'+engine.slice(start,end)+'}).getXRInputPose');
 const space={},scene={xrRef:{}};
 assert.equal(fn.call(scene,null,{targetRaySpace:space}),null);
 assert.equal(fn.call(scene,{getPose(){return null}},{targetRaySpace:space}),null);
 assert.equal(fn.call(scene,{getPose(){throw Error('tracking lost')}},{targetRaySpace:space}),null);
 assert.equal(fn.call(scene,{getPose(){return 123}},{targetRaySpace:space}),123);
});
test('XR session cleanup is idempotent and scoped to the active session',()=>{
 const start=engine.indexOf('  handleXREnd(session){'),end=engine.indexOf('  resumeDesktop(t){',start);
 assert(start>0&&end>start);
 let scheduled=0;
 const fn=vm.runInNewContext('({'+engine.slice(start,end)+'}).handleXREnd',{requestAnimationFrame:()=>{scheduled++}});
 const session={},calls=[];
 const scene={xrSession:session,xrRef:{},latestFrame:{},xrBoardMeshes:[{hidden:false}],
 xrGuide:{onExit(){calls.push('guide')}},xrPrep:{onExit(){calls.push('prep')}},
 setXRComfort(a){assert.equal(a,false);calls.push('comfort')},
 clearControllers(){calls.push('controllers')},resumeDesktop(){}};
 fn.call(scene,{});fn.call(scene,session);fn.call(scene,session);
 assert.deepEqual(calls,['guide','prep','comfort','controllers']);assert.equal(scheduled,1);
 assert.equal(scene.xrSession,null);assert.equal(scene.xrRef,null);assert.equal(scene.latestFrame,null);
 assert(scene.xrBoardMeshes[0].hidden);
});
test('opening VR help with grip clears held cutting input immediately',()=>{
 const {guide,scene}=makeGuide();let cleared=0;
 scene.xrPrep={triggers:{clear(){cleared++}},lastCut:{time:1},tip:{hidden:false}};
 guide.onEnter();guide.close();assert.equal(guide.onSqueezeStart(),true);
 assert.equal(cleared,2);assert.equal(scene.xrPrep.lastCut,null);
 assert(scene.xrPrep.tip.hidden);guide.onExit();
});
