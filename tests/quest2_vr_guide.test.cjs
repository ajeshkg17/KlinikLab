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
 const meshes=[],hits=new Map(),pickables=[];let selected=null;
 const scene={
  xrRef:{},meshes,pickables,
  box(p,s,c,o={}){const m={p:p.slice(),s:s.slice(),key:o.key||null,hidden:false,kind:'box',label:null};meshes.push(m);if(m.key){hits.set(m.key,m);pickables.push({key:m.key,p:m.p.slice(),mesh:m,radius:.3})}return m},
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
 const start=engine.indexOf('  handleXREnd(session){'),end=engine.indexOf('  resumeDesktop(){',start);
 assert(start>0&&end>start);
 let scheduled=0;
 const fn=vm.runInNewContext('({'+engine.slice(start,end)+'}).handleXREnd');
 const session={},calls=[];
 const scene={xrSession:session,xrRef:{},latestFrame:{},xrBoardMeshes:[{hidden:false}],
 xrGuide:{onExit(){calls.push('guide')}},xrPrep:{onExit(){calls.push('prep')}},
 setXRComfort(a){assert.equal(a,false);calls.push('comfort')},
 clearControllers(){calls.push('controllers')},scheduleDesktopFrame(){scheduled++},resumeDesktop(){}};
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

test('headset-relative guide placement follows initial seated/standing eye and restores all hit targets',()=>{
 const {guide,scene,ctx}=makeGuide(),state=ctx.KlinikXRGuide.state;
 const origins=guide.meshes.map(m=>m.p.slice());
 const hits=scene.pickables.map(h=>h.p.slice());
 const panel=guide.meshes[0];
 assert.equal(guide.placeForViewer({transform:{position:{x:0,y:1.6,z:0}}}),false);
 guide.onEnter();
 assert.equal(guide.placeForViewer({transform:{position:{x:0,y:NaN,z:0}}}),false);
 assert.equal(guide.placeForViewer({transform:{position:{x:.25,y:1.18,z:-.3}}}),true);
 assert.equal(panel.p[0],ctx.KlinikXRGuide.spec.panel.p[0]+.25);
 assert(Math.abs(panel.p[1]-(1.18-.04))<1e-9);
 assert.equal(panel.p[2],ctx.KlinikXRGuide.spec.panel.p[2]-.3);
 assert.equal(guide.placeForViewer({transform:{position:{x:1,y:1.8,z:1}}}),false);
 const target=scene.pickables.find(h=>h.key==='guide:next');
 const originalTarget=hits[scene.pickables.indexOf(target)];
 assert(Math.abs(target.p[1]-(originalTarget[1]+1.18-.04-1.56))<1e-9);
 assert.equal(state.open,true);
 guide.onExit();
 assert.deepEqual(guide.meshes.map(m=>m.p),origins);
 assert.deepEqual(scene.pickables.map(h=>h.p),hits);
 guide.onEnter();
 assert.equal(guide.placeForViewer({transform:{position:{x:0,y:1.65,z:0}}}),true);
 assert(Math.abs(panel.p[1]-1.61)<1e-9);
 guide.onExit();
});
test('VR entry refuses insecure context and duplicate pending requests without losing activation',async()=>{
 const start=engine.indexOf('  async enterVR(){'),end=engine.indexOf('  handleXREnd(session){',start);
 assert(start>0&&end>start);
 let requested=0;
 const insecure=vm.runInNewContext('({'+engine.slice(start,end)+'}).enterVR',{
  navigator:{xr:{requestSession(){requested++;throw Error('should not request')}}},isSecureContext:false
 });
 await assert.rejects(insecure.call({xrSession:null}),/requires HTTPS/);
 assert.equal(requested,0);
 let deny;
 const pending=new Promise((resolve,reject)=>{deny=reject});
 const enter=vm.runInNewContext('({'+engine.slice(start,end)+'}).enterVR',{
  navigator:{xr:{requestSession(){requested++;return pending}}},isSecureContext:true
 });
 const scene={xrSession:null,xrStarting:false};
 const first=enter.call(scene);
 await assert.rejects(enter.call(scene),/already starting/);
 assert.equal(requested,1);
 deny(Object.assign(Error('user denied'),{name:'NotAllowedError'}));
 await assert.rejects(first,/permission was denied/);
 assert.equal(scene.xrStarting,false);
});
test('engine anchors guide after a valid XR viewer pose, not before tracking',()=>{
 assert(engine.includes('this.xrGuide?.placeForViewer(pose)'));
 assert(engine.includes('if(!pose){this.clearControllers()'));
});

test('guide rotates toward initial viewer yaw while upright and restores rotations',()=>{
 const {guide,scene}=makeGuide();
 // 90-degree headset yaw means the user faces -X instead of -Z.
 scene.rotateByQuat=(v,q)=>[-2*q.y*q.w,0,-1+2*q.y*q.y];
 const q={x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2};
 const origin=guide.meshes.map(m=>({p:m.p.slice(),rot:m.rot?.slice()||null}));
 const hitOrigins=scene.pickables.map(h=>h.p.slice());
 guide.onEnter();
 assert.equal(guide.placeForViewer({transform:{position:{x:.5,y:1.6,z:.25},orientation:q}}),true);
 const panel=guide.meshes[0];
 assert(Math.abs(panel.p[0]-(.5-1.18))<1e-9);
 assert(Math.abs(panel.p[2]-(.25-.08))<1e-9);
 assert(Math.abs(panel.p[1]-1.56)<1e-9);
 assert(Math.abs(panel.rot[1]-Math.PI/2)<1e-9);
 assert.equal(guide.placeForViewer({transform:{position:{x:1,y:1.6,z:.25},orientation:q}}),false);
 const next=scene.pickables.find(h=>h.key==='guide:next');
 const nextMesh=guide.meshes.find(m=>m.key==='guide:next');
 assert(Math.abs(next.p[0]-nextMesh.p[0])<1e-9);
 assert(Math.abs(next.p[2]-nextMesh.p[2])<1e-9);
 guide.onExit();
 for(let i=0;i<origin.length;i++){
   assert.deepEqual(guide.meshes[i].p,origin[i].p);
   assert.deepEqual(guide.meshes[i].rot||null,origin[i].rot);
 }
 assert.deepEqual(scene.pickables.map(h=>h.p),hitOrigins);
});

test('rotated guide rectangle accepts front ray, rejects side rays, and keeps flat board picking',()=>{
 const start=engine.indexOf('  getRayHit(o,d,allow=null){'),end=engine.indexOf('  // Restore desktop transforms',start);
 assert(start>=0&&end>start);
 const fn=vm.runInNewContext('({'+engine.slice(start,end)+'}).getRayHit',{
   M3:{add:(a,b)=>a.map((v,i)=>v+b[i]),mul:(a,n)=>a.map(v=>v*n),raySphere:()=>null}
 });
 const button={key:'guide:next',p:[-1.2,1.25,-.3],
   mesh:{hidden:false,s:[.29,.116,.056],rot:[0,Math.PI/2,0]}};
 const scene={pickables:[button]};
 const front=fn.call(scene,[-.6,1.25,-.3],[-1,0,0]);
 assert.equal(front?.key,'guide:next');
 assert(Math.abs(front.distance-(.6-.028))<1e-9);
 assert.equal(fn.call(scene,[-.6,1.25,.5],[-1,0,0]),null);
 assert.equal(fn.call(scene,[-.6,1.55,-.3],[-1,0,0]),null);
 const board={key:'module:1',p:[0,1,-2],mesh:{hidden:false,s:[.8,.15,.05],rot:[0,0,0]}};
 scene.pickables=[board];
 assert.equal(fn.call(scene,[0,1,0],[0,0,-1])?.key,'module:1');
});

test('grip reopening recenters the guide at latest tracked pose, without drift',()=>{
 const {guide,scene}=makeGuide();
 scene.rotateByQuat=(v,q)=>[-2*q.y*q.w,0,-1+2*q.y*q.y];
 const identity={x:0,y:0,z:0,w:1};
 const quarter={x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2};
 guide.onEnter();
 assert(guide.placeForViewer({transform:{position:{x:0,y:1.6,z:0},orientation:identity}}));
 guide.close();
 // The next valid frame still updates the last pose even though the panel stays fixed.
 assert.equal(guide.placeForViewer({transform:{position:{x:1,y:1.2,z:2},orientation:quarter}}),false);
 assert(guide.onSqueezeStart());
 assert(Math.abs(guide.meshes[0].p[0]-(1-1.18))<1e-9);
 assert(Math.abs(guide.meshes[0].p[2]-(2-.08))<1e-9);
 assert(Math.abs(guide.meshes[0].rot[1]-Math.PI/2)<1e-9);
 guide.close();
 assert(guide.onSqueezeStart());
 assert(Math.abs(guide.meshes[0].p[0]-(1-1.18))<1e-9); // no accumulated transform
 guide.onExit();
 assert.equal(guide.lastViewerPose,null);
 assert.equal(guide.anchored,false);
});

test('grip recenters an already-open guide without losing the active tutorial page',()=>{
 const {guide,scene,ctx}=makeGuide(),state=ctx.KlinikXRGuide.state;
 scene.rotateByQuat=(v,q)=>[-2*q.y*q.w,0,-1+2*q.y*q.y];
 const pose=(x,y,z,q)=>({transform:{position:{x,y,z},orientation:q}});
 const q0={x:0,y:0,z:0,w:1},q1={x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2};
 guide.onEnter();
 assert(guide.placeForViewer(pose(0,1.6,0,q0)));
 guide.next();assert.equal(state.index,1);
 guide.placeForViewer(pose(1,1.6,2,q1)); // tracking continues while open
 assert(guide.onSqueezeStart());
 assert.equal(state.index,1);
 assert.equal(state.open,true);
 assert(Math.abs(guide.meshes[0].p[0]-(1-1.18))<1e-9);
 assert(Math.abs(guide.meshes[0].p[2]-(2-.08))<1e-9);
 assert(Math.abs(guide.meshes[0].rot[1]-Math.PI/2)<1e-9);
 guide.onExit();
});

test('XR frame maps independent aim/grip poses by handedness and clears missing tracking',()=>{
 const begin=engine.indexOf('  xrFrame(t,frame){');
 const end=engine.lastIndexOf('\n  }\n}');
 const updateStart=engine.indexOf('  updateXRController(slot,source,frame){');
 const updateEnd=engine.indexOf('\n  replaceLabel(',updateStart);
 assert(begin>0&&end>begin&&updateStart>0&&updateEnd>updateStart);
 const M3={
  add:(a,b)=>a.map((v,i)=>v+b[i]),
  mul:(a,k)=>a.map(v=>v*k),
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  unit:a=>a.map(v=>v/(Math.hypot(...a)||1)),
  trs:(p,rot,scale)=>[scale[0],0,0,0,0,scale[1],0,0,0,0,scale[2],0,...p,1],
  mm:(a,b)=>b.map((v,i)=>i===12?a[12]+v:i===13?a[13]+v:i===14?a[14]+v:v)
 };
 const methods=vm.runInNewContext('({'+engine.slice(updateStart,updateEnd)+','+engine.slice(begin,end+4)+'})',{M3});
 const left={handedness:'left',gripSpace:{hand:'left',kind:'grip'},targetRaySpace:{hand:'left',kind:'aim'},gamepad:{buttons:[]},profiles:['oculus-touch']};
 const right={handedness:'right',gripSpace:{hand:'right',kind:'grip'},targetRaySpace:{hand:'right',kind:'aim'},gamepad:{buttons:[]},profiles:['oculus-touch']};
 const baseLayer={framebuffer:{},getViewport:()=>({x:0,y:0,width:100,height:100})};
 const gl={FRAMEBUFFER:1,DEPTH_TEST:2,COLOR_BUFFER_BIT:4,DEPTH_BUFFER_BIT:8,
  bindFramebuffer(){},enable(){},clear(){},viewport(){}};
 let cutFrameCalls=0,placed=0,cleared=0;
 const controllers=side=>({side,parts:Array.from({length:6},()=>({hidden:true,model:null})),ray:{hidden:true,model:null}});
 const scene={gl,xrRef:{},xrControllers:[controllers(-1),controllers(1)],
  updateXRController:methods.updateXRController,
  controllerMatrix:pose=>[1,0,0,0,0,1,0,0,0,0,1,0,pose.transform.position.x,pose.transform.position.y,pose.transform.position.z,1],
  rotateByQuat:()=>[0,0,-1],rgb:color=>color,
  clearControllers(){cleared++;for(const c of this.xrControllers){c.active=false;c.gripValid=false;c.aimValid=false;for(const m of c.parts){m.hidden=true;m.model=null;}c.ray.hidden=true;c.ray.model=null;}},
  xrGuide:{placeForViewer(){placed++}},
  xrPrep:{triggers:{clear(){}},tip:{hidden:false},onXRFrame(){cutFrameCalls++}},
  draw(){}};
 const view={transform:{inverse:{matrix:[]}},projectionMatrix:[]};
 const viewerPose={views:[view]};
 const frame=(sources,pose=viewerPose)=>({
  session:{inputSources:sources,renderState:{baseLayer}},
  getViewerPose(){return pose},
  getPose(space){const src=space.hand==='left'?left:right;if(src.missing)return null;return {transform:{position:{
   x:(src===left?-1:1)+(space.kind==='aim'?.20:0),y:1.5,z:-.25},orientation:{x:0,y:0,z:0,w:1}}};}
 });
 methods.xrFrame.call(scene,0,frame([right,left]));
 assert.equal(scene.xrControllers[0].parts[0].model[12],-1);
 assert.equal(scene.xrControllers[1].parts[0].model[12],1);
 assert(scene.xrControllers.every(c=>c.ray.model?.length===16));
 assert(scene.xrControllers.every(c=>c.gripValid&&c.aimValid));
 methods.xrFrame.call(scene,1,frame([left,right]));
 assert.equal(scene.xrControllers[0].parts[0].model[12],-1);
 assert.equal(scene.xrControllers[1].parts[0].model[12],1);
 right.missing=true;
 methods.xrFrame.call(scene,2,frame([right,left]));
 assert.equal(scene.xrControllers[1].parts[0].hidden,true);
 assert.equal(scene.xrControllers[1].ray.model,null);
 assert.equal(scene.xrControllers[0].parts[0].model[12],-1);
 methods.xrFrame.call(scene,3,frame([left,right],null));
 assert(scene.xrControllers.every(c=>c.parts.every(m=>m.hidden)));
 assert.equal(cleared,1);
 assert(scene.xrPrep.tip.hidden);
 assert.equal(cutFrameCalls,3);
 assert.equal(placed,3);
});
