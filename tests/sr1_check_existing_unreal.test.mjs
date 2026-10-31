import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p=fs.readFileSync(new URL('../visual-qa/sr1-check-existing-unreal.ps1',import.meta.url),'utf8');
test('Attach to existing UE 5.8 blank project rather than launch another editor',()=>{
 for(const token of ['UE58_RenderSmokeTest','Get-ChildItem -LiteralPath $projectRoot -File -Filter',
  "'*.uproject'",'Get-CimInstance Win32_Process','projectMatched',
  'Saved\\Logs','Saved\\Screenshots\\WindowsEditor','HighResShot 1920x1080']){
  assert(p.includes(token),token);
 }
 assert(!p.includes('Start-Process'));
});
test('Actual GPU NVENC preflight is source-pinned and no fallback is permitted',()=>{
 for(const token of ['sr1-dedicated-gpu-preflight.mjs','--expected-sha=',
 'h264_nvenc','actualEncodeSucceeded','NVIDIA','$GpuIndex',
 'EVIDENCE_COLLECTED_INDEPENDENT_GPU_AND_PIXEL_REVIEW_PENDING']){
  assert(p.includes(token),token);
 }
 assert(!p.includes('libx264'));assert(!p.includes('-nullrhi'));
});
test('Stale Unreal log/screenshot cannot pass process-to-project attribution',()=>{
 assert(p.includes('matchedProcessStartedUTC'));
 assert(p.includes('nativeLogFreshForProcess'));
 assert(p.includes('nativeScreenshotFreshForProcess'));
 assert(p.includes('LastWriteTimeUtc -lt $activeStart'));
 assert(p.includes('screenshot predates current project process'));
 assert(p.includes('log predates the matched UnrealEditor process'));
});
test('Native screenshot and GPU identity remain explicitly unreviewed',()=>{
 assert(p.includes('unreal-native-viewport.png'));
 assert(p.includes('unreal-native-latest.log'));
 assert(p.includes('screenshotSHA256'));
 assert(p.includes('unrealRenderVerifiedByIndependentReview=$false'));
 assert(p.includes('pixelStreaming2Verified=$false'));
 assert(p.includes('quest2StreamingVerified=$false'));
 assert(p.includes('Refusing to overwrite existing SR1 evidence directory'));
});
