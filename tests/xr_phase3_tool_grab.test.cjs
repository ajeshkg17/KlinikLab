const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
const start=source.indexOf('  toolGripPose(frame,source){'),end=source.indexOf('  getXRInputPose(frame,source){',start);
assert(start>=0&&end>start);
const M3={
 inverse:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
 mm:(a,b)=>b.slice(),
 trs:(p,r,s)=>[s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,...p,1]
};
const methods=vm.runInNewContext('({'+source.slice(start,end).replace(/\n  (?=[a-zA-Z][a-zA-Z0-9]*\()/g,',\n  ')+'})',{M3});
function fixture(){
 const make=(name,x)=>({name,owner:null,hover:null,meshes:[{p:[x,1,0],s:[.1,.1,.1],rot:[0,0,0],model:null,color:[.2,.3,.4]}]});
 const scene={xrSession:{},xrRef:{},xrTableTools:[make('mirror',0),make('probe',1)],rgb:()=>[0,1,0],
 controllerMatrix:p=>[1,0,0,0,0,1,0,0,0,0,1,0,p.transform.position.x,p.transform.position.y,p.transform.position.z,1],...methods};
 scene.initXRTools();
 const left={handedness:'left',gripSpace:{hand:'left'}},right={handedness:'right',gripSpace:{hand:'right'}};
 const frame={session:{inputSources:[left,right]},getPose(space){return {transform:{position:{x:space.hand==='left'?0:1,y:1,z:0},orientation:{x:0,y:0,z:0,w:1}}}}};
 return {scene,left,right,frame};
}
test('either grip picks distinct instruments without trigger input',()=>{
 const {scene,left,right,frame}=fixture();
 assert.equal(scene.onXRGripStart({inputSource:left},frame),true);
 assert.equal(scene.onXRGripStart({inputSource:right},frame),true);
 assert.equal(scene.xrTableTools[0].owner,'left');
 assert.equal(scene.xrTableTools[1].owner,'right');
 assert.equal(scene.onXRGripStart({inputSource:left},frame),true);
 assert.equal(scene.xrTableTools.filter(t=>t.owner).length,2);
 scene.updateXRTools(frame);
 assert.equal(scene.onXRGripEnd({inputSource:right}),true);
 assert.equal(scene.xrTableTools[1].owner,null);
});
test('hover is visual-only, lost grip tracking and disconnect return tools',()=>{
 const {scene,left,right,frame}=fixture();
 scene.updateXRTools(frame);
 assert.equal(scene.xrTableTools[0].hover,'left');
 assert.equal(scene.xrTableTools[0].owner,null);
 scene.onXRGripStart({inputSource:left},frame);
 frame.session.inputSources=[right];
 scene.updateXRTools(frame);
 assert.equal(scene.xrTableTools[0].owner,null); // disconnected owner returns immediately
 scene.resetXRTools();
 assert.equal(scene.xrTableTools[0].owner,null);
 assert.equal(scene.xrTableTools[0].meshes[0].model,null);
});
