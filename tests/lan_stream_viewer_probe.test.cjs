const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.join(__dirname,'../visual-qa/lan-stream-viewer-probe.mjs')).href;
test('read-only receiver probe detects APIs without starting WebXR, WebRTC, or cameras',async()=>{
 const {probeLANStreamViewer}=await import(url);
 let reqs=0,decodes=0;
 const env={isSecureContext:true,location:{protocol:'https:',hostname:'secret'},
  XRMediaBinding:function(){},XRWebGLBinding:function(){},XRWebGLLayer:function(){},
  RTCPeerConnection:function(){reqs++},
  RTCRtpReceiver:{getCapabilities(k){assert.equal(k,'video');return {codecs:[
   {mimeType:'video/H264'},{mimeType:'video/VP8'}]}}},
  navigator:{xr:{isSessionSupported:async x=>{assert.equal(x,'immersive-vr');return true},
   requestSession(){reqs++;throw Error('Must not request session')}},
   mediaCapabilities:{decodingInfo:async d=>{decodes++;assert.equal(d.type,'file');
    return {supported:true,smooth:true,powerEfficient:false}}}}};
 const out=await probeLANStreamViewer(env);
 assert.equal(reqs,0);assert.equal(decodes,2);
 assert.deepEqual(out.rtc.receiveCodecs,['video/h264','video/vp8']);
 assert.equal(out.xr.immersiveVR,true);
 assert.equal(out.goNoGo.canBeginSecuredLANExperiment,true);
 assert.equal(out.goNoGo.streamingImplemented,false);
 assert.equal(out.goNoGo.realStereo6DoF,false);
 assert.equal(out.goNoGo.secureLocalTransportVerified,false);
 assert(!JSON.stringify(out).includes('secret'));
});
test('unsecured private LAN URL and missing capabilities cannot pass feasibility',async()=>{
 const {probeLANStreamViewer}=await import(url);
 const out=await probeLANStreamViewer({isSecureContext:false,location:{protocol:'http:'},navigator:{}});
 assert.equal(out.goNoGo.canBeginSecuredLANExperiment,false);
 assert.equal(out.xr.immersiveVR,null);assert.equal(out.rtc.peerConnection,false);
});
test('denied API probes produce bounded negative evidence rather than streaming claims',async()=>{
 const {probeLANStreamViewer}=await import(url);
 const out=await probeLANStreamViewer({isSecureContext:true,
  RTCRtpReceiver:{getCapabilities(){throw {name:'NotAllowedError'}}},
  navigator:{xr:{isSessionSupported:async()=>{throw {name:'SecurityError'}}},
  mediaCapabilities:{decodingInfo:async()=>{throw {name:'NotSupportedError'}}}}});
 assert.equal(out.errors.length,2);assert.equal(out.xr.immersiveVR,null);
 assert(out.decoder.fileCodecResults.every(x=>x.supported===false));
 assert.equal(out.goNoGo.canBeginSecuredLANExperiment,false);
});
