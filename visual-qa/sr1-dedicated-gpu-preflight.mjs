/**
 * SR1 dedicated-NVIDIA-GPU + hardware H.264 NVENC gate for a UE5 PS2 VR spike.
 * This does not run Unreal, stream video, or certify physical Quest performance.
 * No CPU, integrated-GPU, software-encoder or reduced-quality fallback.
 */
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const SHA=/^[0-9a-f]{40}$/;
function run(cmd,args,options={}){
 const p=spawnSync(cmd,args,{encoding:'utf8',shell:false,timeout:30000,
  maxBuffer:1024*1024,...options});
 return {ok:!p.error&&p.status===0,status:p.status,
  stdout:String(p.stdout||''),stderr:String(p.stderr||''),error:p.error?.code||null};
}
export function parseGPUList(stdout){
 return stdout.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
  const parts=line.split(',').map(x=>x.trim());
  if(parts.length!==4)throw Error('Unexpected nvidia-smi CSV fields');
  const [i,name,memory,driver]=parts;
  const index=Number(i),vramMiB=Number(memory);
  if(!Number.isInteger(index)||index<0||!name||
    !Number.isFinite(vramMiB)||vramMiB<=0||!driver)
   throw Error('Malformed nvidia-smi GPU identity');
  return {index,name,vramMiB,driver};
 });
}
export async function collectDedicatedGPUPreflight({invoke=run,requestedGPU=null,expectedSha=null}={}){
 const out={
  schemaVersion:1,kind:'UE5 Pixel Streaming 2 VR / dedicated GPU preflight ONLY',
  passed:false,gpu:null,encoder:null,sourceCommit:null,
  gpuRendererActuallyRunning:false,unrealPrototypeCreated:false,
  quest2Connected:false,lanStreamVerified:false,qualityValidated:false,
  lowQualityFallbackAvailable:false,softwareEncoderFallbackAvailable:false,
  failures:[],limitations:[
   'This confirms a GPU device and a sample H.264 hardware encode only.',
   'It cannot certify Unreal Pixel Streaming 2 codec/session support, VR correctness or actual hardware stream speed.',
   'No CPU or integrated-GPU render path and no software video encoder fallback are permitted.',
   'Full-resolution photorealistic render/encode budgets require measuring the real Unreal process on this workstation.'
  ]
 };
 const git=invoke('git',['rev-parse','HEAD']);
 if(!git.ok||!SHA.test(git.stdout.trim()))out.failures.push('Exact local Git revision unavailable');
 else{
  out.sourceCommit=git.stdout.trim();
  if(expectedSha&&expectedSha!==out.sourceCommit)
   out.failures.push('Checked-out commit does not equal the requested exact source SHA');
 }
 const smi=invoke('nvidia-smi',['--query-gpu=index,name,memory.total,driver_version',
  '--format=csv,noheader,nounits']);
 let cards=[];
 if(!smi.ok)out.failures.push('nvidia-smi failed: no verifiable NVIDIA discrete GPU/driver');
 else{
  try{cards=parseGPUList(smi.stdout)}catch(e){out.failures.push(String(e.message))}
 }
 if(cards.length===0)out.failures.push('No usable enumerated NVIDIA discrete GPU');
 let gpu;
 if(requestedGPU===null){
  if(cards.length===1)gpu=cards[0];
  else if(cards.length>1)out.failures.push('Multiple GPUs detected: --gpu-index required to avoid choosing the wrong device');
 }else{
  gpu=cards.find(x=>x.index===requestedGPU);
  if(!gpu)out.failures.push('Requested GPU index unavailable');
 }
 if(gpu){
  out.gpu={...gpu,vendor:'NVIDIA',dedicatedHardwareRequired:true};
  const ff=invoke('ffmpeg',['-hide_banner','-nostdin','-loglevel','error',
   '-f','lavfi','-i','color=c=black:s=640x360:r=30',
   '-frames:v','12','-an','-pix_fmt','yuv420p',
   '-c:v','h264_nvenc','-gpu',String(gpu.index),'-preset','p4',
   '-f','null','-']);
  out.encoder={name:'h264_nvenc',deviceIndex:gpu.index,
   actualEncodeSucceeded:ff.ok,testFrames:12,
   testResolution:'640x360 / hardware smoke only, NOT stream quality'};
  if(!ff.ok)out.failures.push('Real H.264 NVENC encode failed: hardware encoder is required (no libx264/CPU fallback)');
 }
 out.passed=out.failures.length===0&&!!out.gpu&&
  out.encoder?.actualEncodeSucceeded===true&&!!out.sourceCommit;
 return out;
}
function parseArgs(argv){
 const result={requestedGPU:null,expectedSha:null,output:null};
 for(const arg of argv){
  if(arg.startsWith('--gpu-index=')){
   const v=Number(arg.slice(12));if(!Number.isInteger(v)||v<0)throw Error('Invalid GPU index');result.requestedGPU=v;
  }else if(arg.startsWith('--expected-sha=')){
   result.expectedSha=arg.slice(15);
   if(!SHA.test(result.expectedSha))throw Error('Expected SHA must be full 40-character hex');
  }else if(arg.startsWith('--output=')){
   result.output=arg.slice(9);
   if(!result.output||result.output==='-')throw Error('Output filename required');
  }else throw Error('Unknown argument: '+arg);
 }
 return result;
}
async function main(){
 const opts=parseArgs(process.argv.slice(2));
 const evidence=await collectDedicatedGPUPreflight(opts);
 const json=JSON.stringify(evidence,null,2)+'\n';
 if(opts.output){
  await mkdir(path.dirname(opts.output),{recursive:true});
  await writeFile(opts.output,json,{flag:'wx'}); // never replace old evidence
 }
 process.stdout.write(json);
 if(!evidence.passed)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 main().catch(e=>{process.stderr.write('SR1 preflight failed: '+e.message+'\n');process.exitCode=2});
