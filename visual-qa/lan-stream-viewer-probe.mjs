/**
 * Read-only LAN streaming receiver feasibility probe.
 * Does not request immersive session, open networking, or render application.
 * API presence is NOT latency, stereo parallax, or Quest acceptance.
 */
export async function probeLANStreamViewer(g=globalThis){
 const n=g.navigator||{};
 const o={schemaVersion:1,type:'FEASIBILITY ONLY — NO STREAMING',
 secureContext:g.isSecureContext===true,protocol:g.location?.protocol||'unknown',
 xr:{present:!!n.xr,immersiveVR:null,mediaBinding:typeof g.XRMediaBinding==='function',
  glBinding:typeof g.XRWebGLBinding==='function',xrWebGLLayer:typeof g.XRWebGLLayer==='function'},
 rtc:{peerConnection:typeof g.RTCPeerConnection==='function',receiveCodecs:[]},
 decoder:{fileCodecResults:[]},errors:[]};
 if(typeof n.xr?.isSessionSupported==='function'){
  try{o.xr.immersiveVR=!!(await n.xr.isSessionSupported('immersive-vr'))}
  catch(e){o.errors.push('WebXR support probe: '+String(e?.name||'unknown'))}
 }
 if(typeof g.RTCRtpReceiver?.getCapabilities==='function'){
  try{o.rtc.receiveCodecs=[...new Set((g.RTCRtpReceiver.getCapabilities('video')?.codecs||[])
   .map(v=>String(v.mimeType||'').toLowerCase()).filter(x=>/^video\/[a-z0-9.-]+$/.test(x)))].sort().slice(0,24)}
  catch(e){o.errors.push('WebRTC codec probe: '+String(e?.name||'unknown'))}
 }
 if(typeof n.mediaCapabilities?.decodingInfo==='function'){
  for(const [label,contentType] of [['H.264','video/mp4; codecs="avc1.42E01E"'],
   ['VP8','video/webm; codecs="vp8"']]){
   try{
    const v=await n.mediaCapabilities.decodingInfo({type:'file',video:{
     contentType,width:1280,height:720,bitrate:4000000,framerate:72}});
    o.decoder.fileCodecResults.push({label,supported:!!v.supported,
      smooth:!!v.smooth,powerEfficient:!!v.powerEfficient,mode:'file only—not WebRTC'})
   }catch(e){o.decoder.fileCodecResults.push({label,supported:false,
     error:String(e?.name||'unknown'),mode:'file only—not WebRTC'})}
  }
 }
 o.goNoGo={canBeginSecuredLANExperiment:o.secureContext&&o.xr.immersiveVR===true&&o.rtc.peerConnection,
  realStereo6DoF:false,serverGPU:false,streamingImplemented:false,physicalQuestVerified:false,
  secureLocalTransportVerified:false,hardwareDecodeForWebRTCVerified:false};
 return o;
}
