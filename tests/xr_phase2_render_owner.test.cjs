const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
function extract(start,end,method){
 const a=source.indexOf('  '+start),b=source.indexOf('  '+end,a);
 assert(a>=0&&b>a,'method '+start);
 return vm.runInNewContext('({'+source.slice(a,b)+'}).'+method,{requestAnimationFrame:queue});
}
const callbacks=[];
function queue(fn){callbacks.push(fn);return callbacks.length;}
test('only one desktop RAF remains live through repeated XR exit and entry',()=>{
 callbacks.length=0;
 const schedule=extract('scheduleDesktopFrame(){','async enterVR(){','scheduleDesktopFrame');
 const scene={xrSession:null,desktopRafPending:false,draws:0,animation(){this.draws++}};
 scene.scheduleDesktopFrame=schedule;
 for(let i=0;i<15;i++)scene.scheduleDesktopFrame();
 assert.equal(callbacks.length,1,'duplicate desktop requests queued');
 scene.xrSession={};
 callbacks.shift()(10);
 assert.equal(scene.draws,0,'desktop render incorrectly ran under XR');
 assert.equal(callbacks.length,0);
 scene.xrSession=null;
 for(let i=0;i<15;i++)scene.scheduleDesktopFrame();
 assert.equal(callbacks.length,1);
 callbacks.shift()(20);
 assert.equal(scene.draws,1);
 assert.equal(callbacks.length,1,'exactly one successor desktop frame');
 scene.xrSession={};
 callbacks.shift()(30);
 assert.equal(scene.draws,1);
 assert.equal(callbacks.length,0);
});
test('XR scene measures submitted stereo render view matrices and fixed world',()=>{
 assert.match(source,/xrVisualDiagnostics=\{frames:0,eyes:\{\},world:\{\}/);
 assert.match(source,/track\(diag\.world,fixed\.model\|\|M3\.trs\(fixed\.p,fixed\.rot,fixed\.s\)\)/);
 assert.match(source,/track\(diag\.eyes\[index\].*view\.transform\.inverse\.matrix/);
 assert.match(source,/this\.draw\(view\.transform\.inverse\.matrix,view\.projectionMatrix\)/);
 assert.match(source,/this\.xrFrameCount\+\+/);
});
test('desktop owner is scheduled only by one guarded method on XR exit',()=>{
 const start=source.indexOf('  handleXREnd(session){'),end=source.indexOf('  resumeDesktop(){',start);
 const body=source.slice(start,end);
 assert.match(body,/this\.scheduleDesktopFrame\(\)/);
 assert.doesNotMatch(body,/requestAnimationFrame\(/);
 assert.match(source,/if\(this\.desktopRafPending\|\|this\.xrSession\)return/);
});
