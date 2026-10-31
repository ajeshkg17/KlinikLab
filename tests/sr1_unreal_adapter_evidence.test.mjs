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
