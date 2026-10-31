# SR1 dedicated-GPU Unreal 5.8 render smoke: workstation Windows only.
# This is NOT Pixel Streaming, a Quest session, or hardware validation by CI.
# Inspect -> examine installed engine/project; Launch -> real local UE process;
# Collect -> inspect actual UE log and native screenshot after operator captured it.
[CmdletBinding()]
param(
 [ValidateSet('Inspect','Launch','Collect')][string]$Mode='Inspect',
 [string]$EngineRoot='C:\Program Files\Epic Games\UE_5.8',
 [string]$ProjectPath='',
 [string]$EvidenceDir='',
 [string]$ExpectedSha='',
 [int]$GpuIndex=0,
 [ValidateRange(5,120)][int]$WatchSeconds=25
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if(-not $ProjectPath){
 $ProjectPath=Join-Path $PSScriptRoot 'ue5_8-gpu-probe\KlinikLab_SR1_GPUProbe.uproject'
}
if(-not $EvidenceDir){
 throw 'Specify a unique local -EvidenceDir under visual-qa/evidence-local (not version-controlled).'
}
$evidence=[IO.Path]::GetFullPath($EvidenceDir)
$project=[IO.Path]::GetFullPath($ProjectPath)
$editor=Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
$versionFile=Join-Path $EngineRoot 'Engine\Build\Build.version'
$report=[ordered]@{
 schemaVersion=1
 kind='SR1 Unreal Engine 5.8 workstation local GPU render smoke (NOT Pixel Streaming)'
 status='NOT_RUN'
 mode=$Mode
 exactSourceSHA=$null
 engineRoot=$EngineRoot
 installedUE58Detected=$false
 version=$null
 editorExecutablePresent=$false
 editorExecutableBytes=$null
 templatesDirectoryPresent=$false
 featurePacksDirectoryPresent=$false
 projectPath=$project
 projectExists=$false
 projectFileSha256=$null
 preflightPassed=$false
 dedicatedGPU=$null
 h264NVENCVerified=$false
 unrealLaunchAttempted=$false
 unrealProcessID=$null
 unrealLogPath=$null
 unrealLogSha256=$null
 nvidiaRHIInLog=$false
 screenshotPath=$null
 screenshotSha256=$null
 screenshotBytes=$null
 screenshotVisuallyReviewed=$false
 actualUERenderVerified=$false
 pixelStreaming2Verified=$false
 serverVideoStreamVerified=$false
 physicalQuest2Verified=$false
 limitations=@('Only the real workstation can execute Unreal and collect genuine GPU/render evidence.',
   'A dedicated GPU and NVENC smoke encode do not prove Unreal rendering on that GPU.',
   'Process startup, RHI log and PNG require an independent visual + process/GPU trace review.',
   'No CPU/integrated-GPU or software H.264 encoding fallback allowed.')
 errors=@()
}
function Save-Report {
 $target=Join-Path $evidence 'unreal-gpu-render-report.json'
 $report | ConvertTo-Json -Depth 12 | Set-Content -Path $target -Encoding utf8
 Write-Host ('SR1 GPU smoke status: '+$report.status)
 Write-Host ('Evidence report: '+$target)
}
if($Mode -eq 'Collect'){
 if(-not (Test-Path -LiteralPath $evidence -PathType Container)){
  throw 'Collect requires an existing unique evidence directory from Launch.'
 }
}else{
 if(Test-Path -LiteralPath $evidence){
  throw 'Refusing to overwrite existing SR1 evidence directory: '+$evidence
 }
 New-Item -ItemType Directory -Path $evidence -ErrorAction Stop | Out-Null
}
try{
 if($ExpectedSha -and $ExpectedSha -notmatch '^[a-f0-9]{40}$'){
  throw 'Expected SHA must be the exact 40-character Git revision.'
 }
 $git=Get-Command git -ErrorAction Stop
 $rev=(& git -C $repo rev-parse HEAD).Trim()
 if($LASTEXITCODE -ne 0 -or $rev -notmatch '^[a-f0-9]{40}$'){
  throw 'Cannot determine exact Git source SHA.'
 }
 $report.exactSourceSHA=$rev
 if($ExpectedSha -and $rev -ne $ExpectedSha){
  throw "Checked-out source SHA mismatch. Expected $ExpectedSha, got $rev"
 }
 if(-not (Test-Path -LiteralPath $editor -PathType Leaf)){
  $report.status='ENGINE_EXECUTABLE_MISSING'
  throw 'UnrealEditor.exe missing at: '+$editor
 }
 $report.editorExecutablePresent=$true
 $report.editorExecutableBytes=(Get-Item -LiteralPath $editor).Length
 $report.templatesDirectoryPresent=Test-Path -LiteralPath (Join-Path $EngineRoot 'Templates') -PathType Container
 $report.featurePacksDirectoryPresent=Test-Path -LiteralPath (Join-Path $EngineRoot 'FeaturePacks') -PathType Container
 if(-not (Test-Path -LiteralPath $versionFile -PathType Leaf)){
  throw 'Unreal Build.version missing; engine installation unverified.'
 }
 $build=Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
 $report.version="$($build.MajorVersion).$($build.MinorVersion).$($build.PatchVersion)"
 if($build.MajorVersion -ne 5 -or $build.MinorVersion -ne 8){
  throw 'UE5.8 required for this pinned spike; found '+$report.version
 }
 if(-not ($report.templatesDirectoryPresent -and $report.featurePacksDirectoryPresent)){
  throw 'UE_5.8 Templates/FeaturePacks missing.'
 }
 $report.installedUE58Detected=$true
 $report.status='ENGINE_PRESENT_PROJECT_UNCHECKED'
 $report.projectExists=Test-Path -LiteralPath $project -PathType Leaf
 if(-not $report.projectExists){
  $report.status='ENGINE_PRESENT_PROJECT_MISSING'
  throw 'No .uproject at '+$project+'. Sync the repository GPUProbe scaffold, or create the UE5.8 Virtual Reality template project separately.'
 }
 if([IO.Path]::GetExtension($project) -ne '.uproject'){
  throw 'Project must be a .uproject file.'
 }
 $pj=Get-Content -LiteralPath $project -Raw | ConvertFrom-Json
 if($pj.FileVersion -lt 3){throw 'Unreal .uproject FileVersion invalid.'}
 if($pj.EngineAssociation -and $pj.EngineAssociation -ne '5.8'){
  throw 'Project EngineAssociation is not the installed 5.8 engine.'
 }
 $report.projectFileSha256=(Get-FileHash -LiteralPath $project -Algorithm SHA256).Hash.ToLowerInvariant()
 if($Mode -eq 'Inspect'){
  $report.status='ENGINE_AND_PROJECT_PRESENT_GPU_PREFLIGHT_NOT_RUN'
 }else{
  $projectRoot=Split-Path -Parent $project
  $preflightJson=Join-Path $evidence 'nvenc-preflight.json'
  if($Mode -eq 'Launch'){
   if($GpuIndex -lt 0){throw 'GPU index must be nonnegative.'}
   $preflight=Join-Path $PSScriptRoot 'sr1-dedicated-gpu-preflight.mjs'
   if(-not (Test-Path -LiteralPath $preflight -PathType Leaf)){throw 'Missing SR1 NVIDIA/NVENC preflight.'}
   $node=Get-Command node -ErrorAction Stop
   & node $preflight "--expected-sha=$rev" "--gpu-index=$GpuIndex" "--output=$preflightJson" | Out-Null
   if($LASTEXITCODE -ne 0){throw 'Dedicated GPU + NVENC real hardware preflight FAILED; Unreal launch blocked.'}
  }
  if(-not (Test-Path -LiteralPath $preflightJson -PathType Leaf)){
   throw 'No previously successful dedicated GPU/NVENC report; do not infer hardware from installation.'
  }
  $pf=Get-Content -LiteralPath $preflightJson -Raw | ConvertFrom-Json
  if(-not $pf.passed -or $pf.sourceCommit -ne $rev -or
     $pf.gpu.vendor -ne 'NVIDIA' -or -not $pf.gpu.dedicatedHardwareRequired -or
     $pf.encoder.name -ne 'h264_nvenc' -or -not $pf.encoder.actualEncodeSucceeded){
   throw 'Dedicated GPU/NVENC preflight is not a matching successful report.'
  }
  $report.preflightPassed=$true
  $report.dedicatedGPU=$pf.gpu
  $report.h264NVENCVerified=$true
  if($Mode -eq 'Launch'){
   # The native editor must start on the actual workstation desktop.
   # No -nullrhi, software/CPU renderer, scalable graphics or browser WebGL.
   $args=@(('"' + $project + '"'),'-log','-d3d12','-NoSplash')
   $proc=Start-Process -FilePath $editor -ArgumentList $args -PassThru -ErrorAction Stop
   $report.unrealLaunchAttempted=$true
   $report.unrealProcessID=$proc.Id
   $report.status='UE_EDITOR_LAUNCHED_GPU_RENDER_UNVERIFIED'
   Start-Sleep -Seconds $WatchSeconds
   $proc.Refresh()
   if($proc.HasExited){throw "UnrealEditor exited prematurely. Exit code: $($proc.ExitCode)"}
  }else{$report.status='COLLECTING_UNREAL_RENDER_EVIDENCE'}
  $logsDir=Join-Path $projectRoot 'Saved\Logs'
  $logs=@(Get-ChildItem -LiteralPath $logsDir -Filter '*.log' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending)
  if($logs.Count){
   $log=$logs[0]
   $report.unrealLogPath=$log.FullName
   $report.unrealLogSha256=(Get-FileHash -LiteralPath $log.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
   $matches=@(Select-String -LiteralPath $log.FullName -Pattern 'LogD3D12RHI.*(NVIDIA|GeForce|RTX|Quadro)' -ErrorAction SilentlyContinue)
   $report.nvidiaRHIInLog=$matches.Count -gt 0
   if($matches.Count){$matches | Select-Object -First 10 | ForEach-Object Line |
     Set-Content -Path (Join-Path $evidence 'selected-rhi-log-lines.txt') -Encoding utf8}
  }
  $shotDir=Join-Path $projectRoot 'Saved\Screenshots\Windows'
  $shots=@(Get-ChildItem -LiteralPath $shotDir -Filter '*.png' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending)
  if($shots.Count){
   $shot=$shots[0]
   $report.screenshotPath=$shot.FullName
   $report.screenshotSha256=(Get-FileHash -LiteralPath $shot.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
   $report.screenshotBytes=$shot.Length
  }
  if($report.nvidiaRHIInLog -and $report.screenshotPath){
   $report.status='UE_GPU_RHI_AND_SCREENSHOT_FOUND_INDEPENDENT_REVIEW_PENDING'
  }else{
   $report.status='UE_GPU_RENDER_EVIDENCE_INCOMPLETE'
  }
 }
}catch{
 $report.errors=@($report.errors)+@($_.Exception.Message)
 if($report.status -notin @('ENGINE_PRESENT_PROJECT_MISSING','ENGINE_EXECUTABLE_MISSING')){
  $report.status='BLOCKED'
 }
}finally{
 Save-Report
}
if($report.status -in @('ENGINE_PRESENT_PROJECT_UNCHECKED','ENGINE_PRESENT_PROJECT_MISSING',
 'ENGINE_EXECUTABLE_MISSING','BLOCKED','UE_GPU_RENDER_EVIDENCE_INCOMPLETE')){
 exit 2
}
# A zero exit code means an inspection/collection ran, NEVER GPU acceptance.
