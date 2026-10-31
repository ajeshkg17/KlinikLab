import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
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

test('Accept GUID EngineAssociation only with validated installed UE 5.8 and running engine executable',()=>{
 for(const token of [
  'projectEngineAssociationKind',
  'GUID_PENDING_ENGINE_CORRELATION',
  "Get-ItemProperty -Path 'HKCU:",
  'engineExecutableMatched',
  'GetFullPath($procExe)',
  'projectEngineAssociationVerified',
  'Build.version',
  'projectProcessMatched'
 ])assert(p.includes(token),token);
 assert(!p.includes('EngineAssociation is $($p.EngineAssociation), not UE 5.8'));
});
test('Native GPU source assessment correlates D3D12 and CSV GPU with a passed preflight',()=>{
 for(const token of [
  'sr1-unreal-adapter-evidence.mjs',
  '--expected-gpu=',
  'selectedAdapterClassification',
  'chosenD3D12AdapterId',
  'unrealReportedGPU',
  'adapterIndexMappedToGPU',
  'dedicatedGPUPreflightPassed',
  'nativeLogFreshForProcess'
 ])assert(p.includes(token),token);
 assert(!p.includes("($selectedText -match '(?i)NVIDIA"));
});

test('Collector is exactly one script with no duplicated/trailing content',()=>{
 const marker='# Exit zero ONLY says files collected, not GPU validated or streamed.';
 assert(p.trimEnd().endsWith(marker));
 assert.equal(p.split(marker).length,2);
 assert.equal(p.split('# Existing UE5.8 project: non-invasive workstation evidence collection.').length,2);
 assert.equal((p.match(/\bparam\s*\(/g)||[]).length,1);
});
test('PowerShell syntax parses on runners where pwsh is installed',t=>{
 const script=fileURLToPath(new URL('../visual-qa/sr1-check-existing-unreal.ps1',import.meta.url));
 const quoted=script.replaceAll("'","''");
 const command="$tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseFile('"+
  quoted+"', [ref]$tokens, [ref]$errors) | Out-Null; if($errors.Count -gt 0){ "+
  "$errors | ForEach-Object { Write-Error $_.Message }; exit 2 }";
 const run=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],
  {encoding:'utf8',timeout:20000});
 if(run.error?.code==='ENOENT'){t.skip('PowerShell not installed on this runner');return}
 assert.equal(run.status,0,run.stderr||run.stdout||String(run.error));
});

test('Collector has exactly one coherent PowerShell entrypoint without trailing duplicated content',()=>{
 assert.equal((p.match(/^\s*param\(/gm)||[]).length,1);
 assert.equal((p.match(/# Match any real interactive/g)||[]).length,1);
 assert.equal((p.match(/# Exit zero ONLY says files collected/g)||[]).length,1);
 assert(p.trim().endsWith('# Exit zero ONLY says files collected, not GPU validated or streamed.'));
 assert(p.split('\n').length<350);
});
test('GUID/version checks require live engine provenance and source-pinned GPU evidence',()=>{
 assert(p.includes("$association -match '^5\\.8(?:\\.\\d+)?$'"));
 assert(p.includes("$isGuid=$association -match '^(?:\\{"));
 assert(p.includes('projectEngineAssociationRegistryPath'));
 assert(p.includes('UE 5.8 EngineAssociation could not be correlated'));
 assert(p.includes('projectEngineAssociationVerified=$report.projectProcessMatched'));
 assert(p.includes('nativeLogFreshForProcess -and $report.projectProcessMatched'));
});
