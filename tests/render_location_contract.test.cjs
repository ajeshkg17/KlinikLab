const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('current Node service is a file/AI server, not a hidden LAN GPU renderer',()=>{
 const src=read('server/server.mjs');
 assert(src.includes("from 'node:http'"));
 assert(src.includes("'/api/health'")&&src.includes("'/api/ai'"));
 assert(src.includes(".listen(PORT,'127.0.0.1'"));
 assert(!/createGPUDevice|navigator\\.gpu|createWebGL|new XRWebGLLayer|RTCPeerConnection|VideoEncoder|WebSocketServer/.test(src));
});
test('current scene GPU shaders and per-eye WebXR raster run in client engine.js',()=>{
 const s=read('engine.js');
 for(const item of ["canvas.getContext('webgl2'","gl.createShader","gl.drawArrays(gl.TRIANGLES",
 "navigator.xr.requestSession('immersive-vr'","new XRWebGLLayer(session,gl",
 'session.requestAnimationFrame(this.xrLoop.bind(this))',
 'gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer)',
 'this.draw(view.transform.inverse.matrix,view.projectionMatrix)'])
 assert(s.includes(item),'Missing client-renderer evidence: '+item);
 assert.equal(read('public/engine.js'),s,'client scene source mirror changed');
});
test('owner-PC IWER evidence is captured from its browser WebGL framebuffer, never Node GPU',()=>{
 const s=read('test-support/webxr-test/smoke.mjs');
 for(const item of ['window.__xrTestDevice=new IWER.XRDevice','gl.readPixels(x,y,w,h','Meta IWER Quest 2 emulator, WebGL XR eye framebuffer'])
 assert(s.includes(item),item);
 const vol=read('volumetric-lab.js');
 assert(vol.includes('class VoxelMesher'));
 assert(vol.includes("canvas.getContext('webgl2'"));
});
test('new LAN server GPU rendering phases are documented as future work not current evidence',()=>{
 const doc=read('visual-qa/SERVER_RENDERING_ARCHITECTURE.md'),road=read('visual-qa/PHASE_ROADMAP.md');
 for(let i=0;i<=6;i++)assert(road.includes('**SR'+i+' —'),'Missing phase SR'+i);
 for(const piece of ['current','IWER','WebRTC','HTTPS','Quest 2','XRWebGLLayer','latency','6DoF','server-side']){
 assert(doc.toLowerCase().includes(piece.toLowerCase()),'Missing research boundary: '+piece);
 }
 assert(doc.includes('No server-side GPU frames'));
 assert(road.includes('NOT server-GPU evidence'));
});
