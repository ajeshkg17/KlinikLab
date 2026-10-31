import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('../visual-qa/',import.meta.url);
const load=p=>readFile(new URL(p,base),'utf8');
test('UE 5.8 GPU probe project is not a fake VR/PixelStreaming implementation',async()=>{
 const file=JSON.parse(await load('ue5_8-gpu-probe/KlinikLab_SR1_GPUProbe.uproject'));
 assert.equal(file.EngineAssociation,'5.8');
 assert.equal(file.FileVersion,3);
 assert.deepEqual(file.Modules,[]);
 assert.deepEqual(file.Plugins,[]);
 assert(/NOT Pixel Streaming/.test(file.Description));
 const config=await load('ue5_8-gpu-probe/Config/DefaultEngine.ini');
 assert(config.includes('DefaultGraphicsRHI=DefaultGraphicsRHI_DX12'));
 assert(!config.includes('DefaultGraphicsRHI_DX11'));
 assert(config.includes('Template_Default'));
});
test('PowerShell workstation procedure refuses fallback and does not claim GPU success',async()=>{
 const ps=await load('sr1-unreal-render-check.ps1');
 for(const contract of [
 'UnrealEditor.exe','Engine\\Build\\Build.version','FeaturePacks','Templates',
 'sr1-dedicated-gpu-preflight.mjs','--expected-sha=','--gpu-index=',
 '-d3d12','Get-FileHash','Saved\\Logs','Saved\\Screenshots\\Windows',
 'gpuRendererActuallyRunning','actualUERenderVerified','physicalQuest2Verified'
 ].filter(x=>x!=='gpuRendererActuallyRunning'))
  assert(ps.includes(contract),'Missing workstation-only evidence gate '+contract);
 assert(ps.includes("$args=@(('\"' + $project + '\"'),'-log','-d3d12','-NoSplash')"));
 assert(!/\$args\s*=\s*@\([^\n]*['\"]-nullrhi['\"]/i.test(ps),'native render command must never select null RHI');
 assert(ps.includes("actualUERenderVerified=$false"));
 assert(ps.includes("physicalQuest2Verified=$false"));
 assert(ps.includes("pixelStreaming2Verified=$false"));
 assert(ps.includes("UE_GPU_RHI_AND_SCREENSHOT_FOUND_INDEPENDENT_REVIEW_PENDING"));
 assert(!ps.includes("actualUERenderVerified=$true"));
});
test('Correctly documents local installation present but project/render not verified',async()=>{
 const doc=await load('SR1_UE5_8_WORKSTATION_GPU_CHECK.md');
 assert(doc.includes('513,464 bytes'));
 assert(doc.includes('no editor process')===false||doc.includes('No editor process'));
 assert(doc.includes('NOT Pixel Streaming'));
 assert(doc.includes('HighResShot 1920x1080'));
 assert(doc.includes('REAL')||doc.includes('real'));
});
