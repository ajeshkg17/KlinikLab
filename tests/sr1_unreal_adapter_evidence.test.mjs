import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAdapterEvidence} from '../visual-qa/sr1-unreal-adapter-evidence.mjs';

const expectedGpuName='NVIDIA GeForce RTX 5060 Laptop GPU';
const chosen='[2026.10.31-15.58.02:101][  0]LogD3D12RHI: Display: Chosen D3D12 Adapter Id = 0';
const csv='[2026.10.31-15.58.02:101][  0]LogCsvProfiler: Display: Metadata set : gpu="NVIDIA GeForce RTX 5060 Laptop GPU"';
const check=(lines,gpu=expectedGpuName)=>assessAdapterEvidence(lines.join('\n'),{expectedGpuName:gpu});

test('UE 5.8.4 native log chosen D3D12 adapter plus CSV GPU matches preflight, without pretending index was mapped',()=>{
 const r=check([chosen,csv]);
 assert.equal(r.evidenceFound,true);
 assert.equal(r.classification,'D3D12_CHOICE_PLUS_CSV_GPU_MATCH_UNMAPPED');
 assert.equal(r.chosenAdapterId,0);
 assert.equal(r.reportedGPU,expectedGpuName);
 assert.equal(r.adapterIndexMappedToGPU,false);
 assert(r.warnings.some(w=>w.includes('does not independently map index')));
 assert.deepEqual(r.blockers,[]);
});
test('Explicit indexed D3D12 adapter identity confirms selected GPU only when it agrees',()=>{
 const r=check(['LogD3D12RHI: Display: Found D3D12 adapter 0: NVIDIA GeForce RTX 5060 Laptop GPU (VendorId: 10de)',
  chosen,csv,'LogRHI: Display: RHI Adapter Name: NVIDIA GeForce RTX 5060 Laptop GPU']);
 assert.equal(r.evidenceFound,true);
 assert.equal(r.adapterIndexMappedToGPU,true);
 assert.equal(r.classification,'D3D12_INDEX_MAPPED_TO_MATCHING_NVIDIA_GPU');
});
test('Reject selected D3D12 adapter indexed as Intel although CSV metadata reports NVIDIA',()=>{
 const r=check(['LogD3D12RHI: Display: Found D3D12 adapter 0: Intel Iris Xe Graphics',chosen,csv]);
 assert.equal(r.evidenceFound,false);
 assert(r.blockers.some(b=>b.includes('indexed adapter name conflicts')));
});
test('Reject incompatible named active RHI GPU',()=>{
 const r=check([chosen,csv,'LogRHI: Display: RHI Adapter Name: Intel UHD Graphics']);
 assert.equal(r.evidenceFound,false);
 assert(r.blockers.some(b=>b.includes('Named active')));
});
test('Reject log GPU mismatch with nvidia-smi and NVENC device',()=>{
 const r=check([chosen,csv],'NVIDIA GeForce RTX 4080 Laptop GPU');
 assert.equal(r.evidenceFound,false);
 assert(r.blockers.some(b=>b.includes('preflight GPU')));
});
test('Reject missing, ambiguous and conflicting GPU/adapter evidence',()=>{
 for(const lines of [
  [csv],
  [chosen],
  [chosen,csv,'LogD3D12RHI: Chosen D3D12 Adapter Id = 1'],
  [chosen,csv,'LogCsvProfiler: gpu="NVIDIA RTX A2000"'],
  [chosen,csv,'LogD3D12RHI: Found D3D12 adapter 1: NVIDIA GeForce RTX 5060 Laptop GPU'],
  ['LogD3D12RHI: Found D3D12 adapter 0: NVIDIA GeForce RTX 5060 Laptop GPU',csv]
 ])assert.equal(check(lines).evidenceFound,false,JSON.stringify(lines));
});
test('Ignore arbitrary NVIDIA text outside structured RHI/CSV entries',()=>{
 assert.equal(check([chosen,'LogOther: NVIDIA GeForce RTX 5060 Laptop GPU']).evidenceFound,false);
 assert.equal(check([csv,'LogOther: Chosen D3D12 Adapter Id = 0']).evidenceFound,false);
});

test('Exact UE 5.8.4 native RHI/CSV records establish same-index RTX 5060 mapping',()=>{
 const r=check([
  'LogD3D12RHI: Display: Found D3D12 adapter 0: NVIDIA GeForce RTX 5060 Laptop GPU',
  'LogD3D12RHI: Display: Chosen D3D12 Adapter Id = 0',
  'LogRHI: Display: RHI Adapter Name: NVIDIA GeForce RTX 5060 Laptop GPU',
  'LogCsvProfiler: Display: Metadata set : gpu="NVIDIA GeForce RTX 5060 Laptop GPU"'
 ]);
 assert.equal(r.evidenceFound,true,JSON.stringify(r));
 assert.equal(r.adapterIndexMappedToGPU,true);
 assert.equal(r.classification,'D3D12_INDEX_MAPPED_TO_MATCHING_NVIDIA_GPU');
 assert.equal(r.indexedAdapterChecks[0].result,'EXACT_MATCH');
 assert.equal(r.rhiNameChecks[0].result,'EXACT_MATCH');
});

test('Allow structured Unreal RHI hardware annotations but never change GPU model identity',()=>{
 const metadataDescriptions=[
  '(VendorId: 0x10DE, DeviceId: 0x2D00)',
  '(8GB VRAM)',
  '(DedicatedVideoMemory: 8151 MiB)',
  '[D3D12 feature level: 12_2]',
  ', VRAM=8151 MiB',
  '(VendorId: 0x10de) [D3D12 FeatureLevel 12_2]',
 ];
 for(const suffix of metadataDescriptions){
  const r=check([
   'LogD3D12RHI: Display: Found D3D12 adapter 0: '+expectedGpuName+' '+suffix,
   chosen,csv,'LogRHI: RHI Adapter Name: '+expectedGpuName+' '+suffix
  ]);
  assert.equal(r.evidenceFound,true,JSON.stringify({suffix,r}));
  assert.equal(r.adapterIndexMappedToGPU,true);
  assert.equal(r.indexedAdapterChecks[0].result,'MATCH_WITH_STRUCTURED_METADATA');
 }
});
test('Fail closed and expose raw indexed record when an unrecognized suffix exists',()=>{
 const raw=expectedGpuName+' (Other renderer: integrated)';
 const r=check(['LogD3D12RHI: Found D3D12 adapter 0: '+raw,chosen,csv]);
 assert.equal(r.evidenceFound,false);
 assert.equal(r.adapterIndexMappedToGPU,false);
 assert.equal(r.indexedAdapterChecks[0].raw,raw);
 assert.equal(r.indexedAdapterChecks[0].result,'UNRECOGNIZED_SUFFIX');
 assert(r.blockers.some(x=>x.includes('descriptor ambiguous')));
});
test('Additional GPU model words do not silently match',()=>{
 for(const wrong of [expectedGpuName+' Ti',expectedGpuName+' SUPER',
   'NVIDIA GeForce RTX 5060 Laptop GPU Plus']){
  const r=check(['LogD3D12RHI: Found D3D12 adapter 0: '+wrong,chosen,csv]);
  assert.equal(r.evidenceFound,false,wrong);
 }
});
test('One contradictory GPU entry for the chosen index cannot be hidden by a matching record',()=>{
 const r=check([
  'LogD3D12RHI: Found D3D12 adapter 0: NVIDIA GeForce RTX 5060 Laptop GPU (VendorId: 0x10DE)',
  'LogD3D12RHI: Found D3D12 adapter 0: Intel Arc Graphics',
  chosen,csv
 ]);
 assert.equal(r.evidenceFound,false);
 assert(r.blockers.some(x=>x.includes('indexed adapter name conflicts')));
 assert.equal(r.indexedAdapterChecks.length,2);
});
