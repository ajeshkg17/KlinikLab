/**
 * Read-only interpretation of one original native Unreal Editor log.
 * Source evidence only; neither GPU execution nor Pixel Streaming is certified.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

function gpuName(value){
 return String(value || '').normalize('NFKC').replace(/\u00a0/g,' ')
  .replace(/\s+/g,' ').trim().toLowerCase();
}
// Compare the entire model name, then parse *only* an allowlisted metadata tail.
// An unterminated final "(... Revision: 00a1" occurs in real UE5.8 logs.
// This is accepted only when every field is structured and the final field is
// a complete hexadecimal Revision value; arbitrary trailing model text fails.
const identifierFields=new Set(['vendorid','deviceid','subsysid','subsystemid','revision','luid','pci']);
const memoryFields=new Set(['memory','vram','dedicatedvideomemory','dedicatedmemory']);
const features=new Set(['d3d12featurelevel','featurelevel','feature','dxgifeaturelevel']);
function validMetadataField(field){
 const part=field.trim().toLowerCase();
 if(/^\d+(?:\.\d+)?\s*(?:gb|gib|mb|mib)\s+(?:vram|memory)$/.test(part))return true;
 if(/^(?:d3d12\s+)?feature\s*level\s+\d+_\d+$/.test(part))return true;
 const match=part.match(/^([a-z][a-z0-9 _-]*?)\s*[:=]\s*(.+)$/);
 if(!match)return false;
 const key=match[1].replace(/[\s_-]/g,''),value=match[2].trim();
 if(identifierFields.has(key))return /^(?:0x)?[0-9a-f]{1,16}$/.test(value);
 if(memoryFields.has(key))return /^\d+(?:\.\d+)?\s*(?:gb|gib|mb|mib)$/.test(value);
 if(features.has(key))return /^[0-9]+(?:_[0-9]+)?$/.test(value);
 if(key==='driver')return /^\d+(?:\.\d+){1,3}$/.test(value);
 return false;
}
function completeTerminalRevision(fields){
 const last=fields.at(-1)?.trim().toLowerCase()||'';
 return /^revision\s*[:=]\s*(?:0x)?[0-9a-f]{4}$/.test(last);
}
function parseGpuAnnotationTail(tail){
 let rest=tail, sawAnnotation=false, missingClosingRevision=false;
 const metadata=[];
 while(rest.trim()){
  const bracket=rest.match(/^\s*([([])([^()[\]]*)([)\]])?/);
  if(bracket){
   const open=bracket[1],close=bracket[3]||null;
   const fields=bracket[2].split(',').map(f=>f.trim());
   if(!fields.length||fields.some(f=>!validMetadataField(f)))return null;
   if(close && close!==(open==='('?')':']'))return null;
   if(!close){
    // Only the final parenthesized annotation may be missing ')'.
    // A complete terminal revision prevents arbitrary suffixes or
    // a partial truncated field from being mistaken for a GPU match.
    if(open!=='('||!completeTerminalRevision(fields))return null;
    missingClosingRevision=true;
   }
   metadata.push(...fields);
   sawAnnotation=true;
   rest=rest.slice(bracket[0].length);
   if(!close && rest.trim())return null;
   continue;
  }
  const delimited=rest.match(/^\s*[,;]\s*([^()[\];,]+)/);
  if(!delimited||!validMetadataField(delimited[1]))return null;
  metadata.push(delimited[1].trim());
  sawAnnotation=true;
  rest=rest.slice(delimited[0].length);
 }
 return sawAnnotation?{metadata,missingClosingRevision}:null;
}
function gpuDescriptorComparison(raw,expectedName){
 const description=String(raw||'').trim().replace(/^(?:Adapter\s+Name|Name)\s*:\s*/i,'');
 const expected=gpuName(expectedName),observed=gpuName(description);
 if(!expected)return {raw:description,normalizedGPU:observed,result:'MISSING_EXPECTED_GPU'};
 if(observed===expected)return {raw:description,normalizedGPU:observed,result:'EXACT_MATCH'};
 if(!observed.startsWith(expected))
  return {raw:description,normalizedGPU:observed,result:'DIFFERENT_GPU'};
 const tail=observed.slice(expected.length);
 const parsed=parseGpuAnnotationTail(tail);
 if(parsed)return {raw:description,normalizedGPU:expected,
  result:'MATCH_WITH_STRUCTURED_METADATA',...parsed};
 return {raw:description,normalizedGPU:observed,result:'UNRECOGNIZED_SUFFIX'};
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
const rhiInfoHeader=/\bLogRHI:\s*(?:(?:Display|Log):\s*)?RHI Adapter Info:\s*$/i;
const rhiInfoName=/\bLogRHI:\s*(?:(?:Display|Log):\s*)?Name:\s*(.+)$/i;
function collectNamedRHI(log){
 const lines=String(log).split(/\r?\n/),named=records(log,namedRHI),headers=[],incomplete=[];
 for(let i=0;i<lines.length;i++){
  if(!rhiInfoHeader.test(lines[i]))continue;
  headers.push(lines[i]);
  let found=false;
  // A short contiguous LogRHI block belongs to this header. Never accept a
  // free-standing "Name:" elsewhere or a later unrelated adapter's name.
  for(let j=i+1;j<Math.min(i+9,lines.length);j++){
   if(!/\bLogRHI:\s*/i.test(lines[j])||rhiInfoHeader.test(lines[j]))break;
   const match=lines[j].match(rhiInfoName);
   if(match){
    named.push({line:lines[j],match,infoHeaderLine:lines[i]});
    found=true;
    break;
   }
  }
  if(!found)incomplete.push(lines[i]);
 }
 return {named,headers,incomplete};
}

/**
 * Require a chosen D3D12 id and matching CSV GPU identity *from the same log*,
 * with an independently selected NVIDIA GPU identity from the passed preflight.
 * Without indexed enumeration this is evidence of reported GPU identity, not
 * proof that the numeric D3D12 adapter id maps to that device.
 */
export function assessAdapterEvidence(log,{expectedGpuName}={}){
 const rhiInfo=collectNamedRHI(log);
 const choice=records(log,rhiChoice),csv=records(log,csvGPU),
  enumerated=records(log,indexedRHI),named=rhiInfo.named;
 const ids=[...new Set(choice.map(x=>Number(x.match[1])))];
 const csvNames=[...new Set(csv.map(x=>gpuName(x.match[1])))];
 const expected=gpuName(expectedGpuName);
 const indexedAdapterChecks=enumerated.map(x=>({
  adapterId:Number(x.match[1]),
  ...gpuDescriptorComparison(x.match[2],expectedGpuName)
 }));
 const rhiNameChecks=named.map(x=>gpuDescriptorComparison(x.match[1],expectedGpuName));
 const result={
  evidenceFound:false,classification:'INSUFFICIENT_EVIDENCE',
  chosenAdapterId:ids.length===1?ids[0]:null,
  reportedGPU:csvNames.length===1?csv[0].match[1].trim():null,
  adapterIndexMappedToGPU:false,
  expectedPreflightGPU:expectedGpuName || null,
  indexedAdapterChecks,rhiNameChecks,
  rhiInfoHeaders:rhiInfo.headers,
  evidenceLines:[...new Set([...choice,...csv,...enumerated,...named].map(x=>x.line).concat(rhiInfo.headers))].slice(0,30),
  blockers:[],warnings:[]
 };
 const block=msg=>result.blockers.push(msg);
 if(!expected)block('A passed preflight GPU name is required for correlation');
 if(ids.length!==1)block(ids.length===0?'No chosen D3D12 adapter id in native log':'Conflicting chosen D3D12 adapter ids');
 if(csvNames.length!==1)block(csvNames.length===0?'No LogCsvProfiler gpu metadata in native log':'Conflicting CSV GPU identities in native log');
 if(csvNames.length===1&&expected&&csvNames[0]!==expected)block('Unreal CSV GPU does not match NVIDIA/NVENC preflight GPU');
 const matchingResult=x=>x.result==='EXACT_MATCH'||x.result==='MATCH_WITH_STRUCTURED_METADATA';
 if(rhiInfo.incomplete.length)block('RHI Adapter Info header has no adjacent LogRHI Name record');
 if(rhiNameChecks.some(x=>x.result==='DIFFERENT_GPU'))
  block('Named active LogRHI adapter conflicts with preflight GPU');
 if(rhiNameChecks.some(x=>!matchingResult(x)&&x.result!=='DIFFERENT_GPU'))
  block('Named LogRHI adapter has ambiguous/unrecognized descriptive suffix');
 if(ids.length===1&&indexedAdapterChecks.length){
  const selected=indexedAdapterChecks.filter(x=>x.adapterId===ids[0]);
  if(selected.length===0)block('D3D12 enumerated adapters do not map the chosen id');
  else{
   if(selected.some(x=>x.result==='DIFFERENT_GPU'))
    block('Chosen D3D12 indexed adapter name conflicts with preflight GPU');
   if(selected.some(x=>!matchingResult(x)&&x.result!=='DIFFERENT_GPU'))
    block('Chosen D3D12 indexed adapter descriptor ambiguous; inspect raw adapter name and suffix');
   if(selected.every(matchingResult))result.adapterIndexMappedToGPU=true;
  }
 }
 if(result.blockers.length===0){
  result.evidenceFound=true;
  result.classification=result.adapterIndexMappedToGPU?
   'D3D12_INDEX_MAPPED_TO_MATCHING_NVIDIA_GPU':
   'D3D12_CHOICE_PLUS_CSV_GPU_MATCH_UNMAPPED';
  if(!result.adapterIndexMappedToGPU)
   result.warnings.push('The chosen adapter id has no explicit name mapping; the log reports GPU identity but does not independently map index to device');
  if([...indexedAdapterChecks,...rhiNameChecks].some(x=>x.missingClosingRevision))
   result.warnings.push('Unreal indexed adapter metadata ends with complete terminal Revision hex but missing closing parenthesis; original line preserved');
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
