import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGPUList,collectDedicatedGPUPreflight} from '../visual-qa/sr1-dedicated-gpu-preflight.mjs';
const SHA='a'.repeat(40);
const setup=(patch={})=>({invoke:(cmd,args)=>{
 if(cmd==='git')return {ok:true,stdout:SHA};
 if(cmd==='nvidia-smi')return {ok:true,stdout:'0, NVIDIA GeForce RTX 5060, 8192, 580.12\n'};
 if(cmd==='ffmpeg')return {ok:true,stdout:''};
 throw Error('unexpected command '+cmd);
},expectedSha:SHA,...patch});
test('Source-pinned discrete NVIDIA GPU and a real H264 NVENC process are required',async()=>{
 const calls=[];
 const opts=setup();
 const f=opts.invoke;
 opts.invoke=(cmd,args)=>{calls.push({cmd,args});return f(cmd,args)};
 const r=await collectDedicatedGPUPreflight(opts);
 assert.equal(r.passed,true);
 assert.equal(r.gpu.vramMiB,8192);
 assert.equal(r.encoder.actualEncodeSucceeded,true);
 assert.equal(r.gpuRendererActuallyRunning,false);
 assert.equal(r.unrealPrototypeCreated,false);
 assert.equal(r.quest2Connected,false);
 assert.equal(r.lanStreamVerified,false);
 assert.equal(r.lowQualityFallbackAvailable,false);
 assert.equal(r.softwareEncoderFallbackAvailable,false);
 const ff=calls.find(x=>x.cmd==='ffmpeg');
 assert(ff.args.includes('h264_nvenc'));
 assert(ff.args.includes('-gpu'));
 assert(!ff.args.includes('libx264'));
});
test('No GPU, invalid GPU identity, or software-only encoder fails closed',async()=>{
 const base=setup();
 for(const output of ['','not a CSV','0, unknown, 0, 580.12']){
  const r=await collectDedicatedGPUPreflight({
   ...base,invoke:(cmd,args)=>cmd==='nvidia-smi'?{ok:true,stdout:output}:base.invoke(cmd,args)
  });assert.equal(r.passed,false);
 }
 const noEncoder=await collectDedicatedGPUPreflight({...base,
  invoke:(cmd,args)=>cmd==='ffmpeg'?{ok:false,status:1,error:'ENOENT'}:base.invoke(cmd,args)});
 assert.equal(noEncoder.passed,false);
 assert(noEncoder.failures.some(x=>x.includes('hardware encoder is required')));
 assert.equal(noEncoder.encoder.actualEncodeSucceeded,false);
});
test('Multi-GPU workstations require explicit GPU selection',async()=>{
 const base=setup();
 const f=(cmd,args)=>cmd==='nvidia-smi'?{ok:true,
  stdout:'0, NVIDIA RTX A5000, 24564, 580\n1, NVIDIA RTX 5060, 8192, 580\n'}:base.invoke(cmd,args);
 assert.equal((await collectDedicatedGPUPreflight({...base,invoke:f})).passed,false);
 const good=await collectDedicatedGPUPreflight({...base,invoke:f,requestedGPU:1});
 assert.equal(good.passed,true);
 assert.equal(good.encoder.deviceIndex,1);
});
test('Exact source mismatch cannot produce a passing preflight',async()=>{
 const r=await collectDedicatedGPUPreflight({...setup(),expectedSha:'b'.repeat(40)});
 assert.equal(r.passed,false);
 assert(r.failures.some(x=>x.includes('exact source SHA')));
});
test('GPU report parser requires valid GPU index, VRAM and driver',()=>{
 assert.deepEqual(parseGPUList('0, NVIDIA RTX 5060, 8192, 580\n')[0],
  {index:0,name:'NVIDIA RTX 5060',vramMiB:8192,driver:'580'});
 for(const bad of ['0, NVIDIA, 0, 580','-1, NVIDIA, 8192, 580','0, NVIDIA, nan, 580','0, NVIDIA, 8192'])
  assert.throws(()=>parseGPUList(bad));
});
