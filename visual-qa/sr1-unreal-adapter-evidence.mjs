/**
 * Read-only interpretation of one original native Unreal Editor log.
 * Source evidence only; neither GPU execution nor Pixel Streaming is certified.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

function gpuName(value){
 return String(value || '').trim().replace(/\s*\((?:VendorId|DeviceId|0x)[^)]*\).*$/i,'')
  .replace(/\s+/g,' ').toLowerCase();
}
function records(log,regex){
 return String(log).split(/\r?\n/).flatMap(line=>{
  const match=line.match(regex);
  return match?[{line,match}]:[];
 });
}
const rhiChoice=/\bLogD3D12RHI:\s*(?:(?:Display|Log|Warning):\s*)?Chosen D3D12 Adapter Id\s*=\s*(\d+)\b/i;
const csvGPU=/\bLogCsvProfiler:\s*.*?\bgpu\s*=\s*"([^"]+)"/i;
const indexedRHI=/\bLogD3D12RHI:\s*(?:(?:Display|Log):\s*)?(?:Found|Enumerated|Selected|Using)\s+D3D12\s+adapter\s+(\d+)\s*:\s*(.+)$/i;
const namedRHI=/\bLogRHI:\s*(?:(?:Display|Log):\s*)?RHI Adapter Name\s*:\s*(.+)$/i;

/**
 * Require a chosen D3D12 id and matching CSV GPU identity *from the same log*,
 * with an independently selected NVIDIA GPU identity from the passed preflight.
 * Without indexed enumeration this is evidence of reported GPU identity, not
 * proof that the numeric D3D12 adapter id maps to that device.
 */
export function assessAdapterEvidence(log,{expectedGpuName}={}){
 const choice=records(log,rhiChoice),csv=records(log,csvGPU),
  enumerated=records(log,indexedRHI),named=records(log,namedRHI);
 const ids=[...new Set(choice.map(x=>Number(x.match[1])))];
 const csvNames=[...new Set(csv.map(x=>gpuName(x.match[1])))];
 const expected=gpuName(expectedGpuName);
 const result={
  evidenceFound:false,classification:'INSUFFICIENT_EVIDENCE',
  chosenAdapterId:ids.length===1?ids[0]:null,
  reportedGPU:csvNames.length===1?csv[0].match[1].trim():null,
  adapterIndexMappedToGPU:false,
  expectedPreflightGPU:expectedGpuName || null,
  evidenceLines:[...new Set([...choice,...csv,...enumerated,...named].map(x=>x.line))].slice(0,30),
  blockers:[],warnings:[]
 };
 const block=msg=>result.blockers.push(msg);
 if(!expected)block('A passed preflight GPU name is required for correlation');
 if(ids.length!==1)block(ids.length===0?'No chosen D3D12 adapter id in native log':'Conflicting chosen D3D12 adapter ids');
 if(csvNames.length!==1)block(csvNames.length===0?'No LogCsvProfiler gpu metadata in native log':'Conflicting CSV GPU identities in native log');
 if(csvNames.length===1&&expected&&csvNames[0]!==expected)block('Unreal CSV GPU does not match NVIDIA/NVENC preflight GPU');
 if(named.some(x=>gpuName(x.match[1])!==expected))
  block('Named active LogRHI adapter conflicts with preflight GPU');
 if(ids.length===1&&enumerated.length){
  const selected=enumerated.filter(x=>Number(x.match[1])===ids[0]);
  if(selected.length===0)block('D3D12 enumerated adapters do not map the chosen id');
  else if(selected.some(x=>gpuName(x.match[2])!==expected))
   block('Chosen D3D12 indexed adapter name conflicts with preflight GPU');
  else result.adapterIndexMappedToGPU=true;
 }
 if(result.blockers.length===0){
  result.evidenceFound=true;
  result.classification=result.adapterIndexMappedToGPU?
   'D3D12_INDEX_MAPPED_TO_MATCHING_NVIDIA_GPU':
   'D3D12_CHOICE_PLUS_CSV_GPU_MATCH_UNMAPPED';
  if(!result.adapterIndexMappedToGPU)
   result.warnings.push('The chosen adapter id has no explicit name mapping; the log reports GPU identity but does not independently map index to device');
  result.warnings.push('Source log lines and NVENC preflight are not measured per-process GPU engine utilization or a streamed frame');
 }
 return result;
}
function main(argv){
 const args=Object.fromEntries(argv.map(a=>{
  const i=a.indexOf('=');
  if(!a.startsWith('--')||i<3)throw Error('Expected --log= and --expected-gpu=');
  return [a.slice(2,i),a.slice(i+1)];
 }));
 if(!args.log||!args['expected-gpu'])throw Error('Both --log and --expected-gpu are required');
 const report=assessAdapterEvidence(fs.readFileSync(args.log,'utf8'),
  {expectedGpuName:args['expected-gpu']});
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{main(process.argv.slice(2))}catch(e){process.stderr.write('SR1 native GPU evidence parser: '+e.message+'\n');process.exitCode=2}
}
