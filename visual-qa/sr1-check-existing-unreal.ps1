# Existing UE5.8 project: non-invasive workstation evidence collection.
# Does not launch Unreal or Pixel Streaming and does not certify GPU render automatically.
[CmdletBinding()]
param(
 [string]$ProjectDirectory='C:\Users\ajesh\OneDrive\Documents\Unreal Projects\UE58_RenderSmokeTest',
 [string]$EngineRoot='C:\Program Files\Epic Games\UE_5.8',
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [string]$ExpectedSha='',
 [int]$GpuIndex=0,
 [switch]$SkipNVENC
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out=[IO.Path]::GetFullPath($EvidenceDir)
if(Test-Path -LiteralPath $out){
 throw "Refusing to overwrite existing SR1 evidence directory: $out. Use a new run ID."
}
New-Item -ItemType Directory -Path $out -Force | Out-Null
$report=[ordered]@{
 schemaVersion=1
 kind='SR1 already-running Unreal 5.8 workstation D3D12 render observation (NOT Pixel Streaming)'
 status='EVIDENCE_INCOMPLETE'
 createdUTC=[DateTime]::UtcNow.ToString('o')
 gitSourceSHA=$null
 projectDirectory=$ProjectDirectory
 projectFile=$null
 projectSHA256=$null
 engineExecutable=$null
 ue58Version=$null
 engineFilePresent=$false
 editorProcesses=@()
 projectProcessMatched=$false
 matchedProcessStartedUTC=$null
 projectLogFound=$false
 nativeLogFreshForProcess=$false
 logSHA256=$null
 selectedAdapterEvidenceFound=$false
 selectedAdapterText=@()
 nativeScreenshotFound=$false
 nativeScreenshotFreshForProcess=$false
 screenshotSHA256=$null
 screenshotSizeBytes=$null
 dedicatedGPUPreflightPassed=$false
 nvencHardwareTestPassed=$false
 nvencHardwareTestExecuted=$false
 noSoftwareFallback=$true
 unrealRenderVerifiedByIndependentReview=$false
 pixelStreaming2Verified=$false
 quest2StreamingVerified=$false
 blockers=@()
 notes=@(
  'This is a native UE workstation log/screenshot inspection, NOT a KlinikLab scene render.',
  'D3D12 and path-tracing pipeline log initialization are not proof of an NVIDIA frame.',
  'Hardware encode preflight verifies FFmpeg NVENC, NOT Unreal Pixel Streaming 2 encode.',
  'A human must inspect the original native rendered screenshot and active GPU-engine attribution.'
 )
}
function Block([string]$msg){
 $report.blockers=@($report.blockers)+@($msg)
}
try {
 $gitHead=(& git -C $repo rev-parse HEAD).Trim()
 if($LASTEXITCODE -ne 0 -or $gitHead -notmatch '^[a-f0-9]{40}$'){
  throw 'Cannot establish exact repository revision'
 }
 $report.gitSourceSHA=$gitHead
 if($ExpectedSha -and $gitHead -ne $ExpectedSha){throw "Source revision mismatch: expected $ExpectedSha got $gitHead"}
 $projectRoot=[IO.Path]::GetFullPath($ProjectDirectory)
 if(-not (Test-Path -LiteralPath $projectRoot -PathType Container)){
  throw "Unreal project directory does not exist: $projectRoot"
 }
 $candidates=@(Get-ChildItem -LiteralPath $projectRoot -File -Filter '*.uproject')
 if($candidates.Count -ne 1){
  throw "Expected exactly one .uproject in $projectRoot; found $($candidates.Count)."
 }
 $project=$candidates[0]
 $report.projectFile=$project.FullName
 $report.projectSHA256=(Get-FileHash -LiteralPath $project.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
 $p=Get-Content -LiteralPath $project.FullName -Raw | ConvertFrom-Json
 if($p.EngineAssociation -and "$($p.EngineAssociation)" -ne '5.8'){
  Block "Project EngineAssociation is $($p.EngineAssociation), not UE 5.8"
 }
 $editor=Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
 $versionFile=Join-Path $EngineRoot 'Engine\Build\Build.version'
 if(-not (Test-Path -LiteralPath $editor -PathType Leaf)){throw "No UnrealEditor.exe: $editor"}
 $report.engineFilePresent=$true
 $report.engineExecutable=$editor
 if(-not (Test-Path -LiteralPath $versionFile -PathType Leaf)){throw "Missing engine Build.version: $versionFile"}
 $version=Get-Content -LiteralPath $versionFile -Raw|ConvertFrom-Json
 $report.ue58Version="$($version.MajorVersion).$($version.MinorVersion).$($version.PatchVersion)"
 if($version.MajorVersion -ne 5 -or $version.MinorVersion -ne 8){
  throw "Wrong engine version $($report.ue58Version): UE 5.8 required"
 }
 # Match any real interactive UnrealEditor processes to the actual project.
 # A process may run without a project command line; do not infer project ownership.
 $procs=@(Get-CimInstance Win32_Process -Filter "Name = 'UnrealEditor.exe'" -ErrorAction SilentlyContinue)
 $activeStart=$null
 foreach($proc in $procs){
  $cmd=[string]$proc.CommandLine
  $matchesProject=$cmd.IndexOf($project.Name,[StringComparison]::OrdinalIgnoreCase) -ge 0 -or
   $cmd.IndexOf($projectRoot,[StringComparison]::OrdinalIgnoreCase) -ge 0
  $report.editorProcesses+=@([ordered]@{pid=[int]$proc.ProcessId;projectMatched=$matchesProject})
  if($matchesProject){
   $report.projectProcessMatched=$true
   if($proc.CreationDate){
    $started=([DateTime]$proc.CreationDate).ToUniversalTime()
    if($null -eq $activeStart -or $started -gt $activeStart){$activeStart=$started}
   }
  }
 }
 if($null -ne $activeStart){$report.matchedProcessStartedUTC=$activeStart.ToString('o')}
 if($procs.Count -eq 0){Block 'No running UnrealEditor.exe process observed on workstation'}
 if(-not $report.projectProcessMatched){Block 'No UnrealEditor.exe process conclusively matched this project; log/screenshot may be historical'}
 # Evidence from actual UE native project, not from browser Playwright.
 $logDir=Join-Path $projectRoot 'Saved\Logs'
 $logs=@(Get-ChildItem -LiteralPath $logDir -File -Filter '*.log' -ErrorAction SilentlyContinue|
  Sort-Object LastWriteTimeUtc -Descending)
 if($logs.Count){
  $log=$logs[0]
  if($null -eq $activeStart){
   Block 'Unreal log cannot be attributed to a running project process; do not accept as current GPU evidence'
  }elseif($log.LastWriteTimeUtc -lt $activeStart){
   Block 'Unreal log predates the matched UnrealEditor process; do not accept stale native GPU evidence'
  }else{$report.nativeLogFreshForProcess=$true}
  Copy-Item -LiteralPath $log.FullName -Destination (Join-Path $out 'unreal-native-latest.log') -ErrorAction Stop
  $logFile=Join-Path $out 'unreal-native-latest.log'
  $report.logSHA256=(Get-FileHash -LiteralPath $logFile -Algorithm SHA256).Hash.ToLowerInvariant()
  $report.projectLogFound=$true
  $selected=@(Select-String -LiteralPath $logFile -Pattern 'LogD3D12RHI.*(Chosen D3D12 Adapter|Selected.*Adapter|Using.*Adapter)' -ErrorAction SilentlyContinue)
  $selectedText=@($selected|Select-Object -First 12|ForEach-Object { $_.Line })
  $report.selectedAdapterText=$selectedText
  $report.selectedAdapterEvidenceFound=($selectedText -match '(?i)NVIDIA|GeForce|RTX|Quadro').Count -gt 0
  if(-not $report.selectedAdapterEvidenceFound){
   Block 'D3D12 selected dedicated NVIDIA adapter NOT verified by Unreal native log'
  }
 }else{Block 'No original Unreal native .log found in project Saved/Logs'}
 # Editor screenshots can be in WindowsEditor, while PIE/game images use Windows.
 $shotDirs=@('Saved\Screenshots\WindowsEditor','Saved\Screenshots\Windows')
 $shots=@(foreach($folder in $shotDirs){
   Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -File -Filter '*.png' -ErrorAction SilentlyContinue
  })
 $shots=@($shots|Sort-Object LastWriteTimeUtc -Descending)
 if($shots.Count){
  $shot=$shots[0]
  if($null -eq $activeStart){
   Block 'Unreal screenshot cannot be tied to an active project process'
  }elseif($shot.LastWriteTimeUtc -lt $activeStart){
   Block 'Native Unreal screenshot predates current project process; take a fresh HighResShot'
  }else{$report.nativeScreenshotFreshForProcess=$true}
  $destination=Join-Path $out 'unreal-native-viewport.png'
  Copy-Item -LiteralPath $shot.FullName -Destination $destination -ErrorAction Stop
  $report.nativeScreenshotFound=$true
  $report.screenshotSHA256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
  $report.screenshotSizeBytes=(Get-Item -LiteralPath $destination).Length
  if($report.screenshotSizeBytes -lt 10000){Block 'Native screenshot unusually small; inspect image before accepting'}
 }else{Block 'No native UE screenshot: in the real Editor capture HighResShot 1920x1080 in a visibly lit viewport'}
 if(-not $SkipNVENC){
  $preflight=Join-Path $PSScriptRoot 'sr1-dedicated-gpu-preflight.mjs'
  $report.nvencHardwareTestExecuted=$true
  & node $preflight "--expected-sha=$gitHead" "--gpu-index=$GpuIndex" "--output=$(Join-Path $out 'nvenc-preflight.json')" | Out-Null
  if($LASTEXITCODE -ne 0){Block 'Real dedicated GPU/NVENC preflight failed; no CPU/software fallback allowed'}
  else {
   $pf=Get-Content -LiteralPath (Join-Path $out 'nvenc-preflight.json') -Raw|ConvertFrom-Json
   if($pf.passed -and $pf.sourceCommit -eq $gitHead -and
      $pf.gpu.vendor -eq 'NVIDIA' -and $pf.gpu.dedicatedHardwareRequired -and
      $pf.encoder.name -eq 'h264_nvenc' -and $pf.encoder.actualEncodeSucceeded){
    $report.dedicatedGPUPreflightPassed=$true
    $report.nvencHardwareTestPassed=$true
   }else{Block 'NVENC report not matched to exact source/dedicated GPU'}
  }
 }
 else {Block 'NVENC was explicitly skipped; hardware gate remains pending'}
 # Presence and consistency are not GPU-render acceptance.
 if($report.blockers.Count -eq 0){
  $report.status='EVIDENCE_COLLECTED_INDEPENDENT_GPU_AND_PIXEL_REVIEW_PENDING'
 }else {$report.status='EVIDENCE_INCOMPLETE'}
}catch{
 Block $_.Exception.Message
 $report.status='BLOCKED'
}finally{
 $report|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $out 'unreal-attach-report.json') -Encoding utf8
 Write-Host "SR1 attached-project evidence status: $($report.status)"
 Write-Host "Evidence (local only): $out"
}
if($report.status -ne 'EVIDENCE_COLLECTED_INDEPENDENT_GPU_AND_PIXEL_REVIEW_PENDING'){exit 2}
# Exit zero ONLY says files collected, not GPU validated or streamed.
