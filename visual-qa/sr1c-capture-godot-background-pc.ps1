# Autonomous real Vulkan Godot FDI16 on a Windows PRIVATE DESKTOP.
# No Godot editor/Project Manager, no foreground activation, no F12, no --headless.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$ExpectedSha,
 [Parameter(Mandatory=$true)][string]$GodotExe,
 [ValidateSet('fdi16','clinic-overview')][string]$SceneMode='fdi16'
)
$ErrorActionPreference='Stop'
$run=[IO.Path]::GetFullPath($EvidenceDir)
$project=Join-Path $run 'Project'
$captures=Join-Path $run 'Captures'
$sourceReportPath=Join-Path $run 'godot-source-prepare.json'
$reportPath=Join-Path $captures 'godot-owner-pc-result.json'
if(-not(Test-Path -LiteralPath $sourceReportPath)){throw 'Missing SHA-pinned preparation report'}
if(Test-Path -LiteralPath $reportPath){throw 'Owner PC result already exists; refusing overwrite'}
if(-not(Test-Path -LiteralPath $GodotExe -PathType Leaf)){throw 'No installed Godot GUI .exe'}
$expected=Get-Content -LiteralPath $sourceReportPath -Raw|ConvertFrom-Json
if($expected.sourceGitSHA -ne $ExpectedSha -or
 $expected.status -ne 'SOURCE_EXPORTED_GODOT_PROJECT_READY_NOT_RENDERED'){
 throw 'Godot project provenance is not the requested exact source SHA'
}
$script=Join-Path $PSScriptRoot 'sr1c-godot-background-capture.gd'
$launcher=Join-Path $PSScriptRoot 'sr1c-private-desktop.ps1'
if(-not(Test-Path -LiteralPath $script) -or -not(Test-Path -LiteralPath $launcher)){
 throw 'Approved private desktop capture components absent'
}
$projectScript=Join-Path $project 'sr1c-godot-background-capture.gd'
if(Test-Path -LiteralPath $projectScript){throw 'Refusing to overwrite preexisting project background script'}
Copy-Item -LiteralPath $script -Destination $projectScript -ErrorAction Stop
# Only the allowlisted source-anchored clinic shell may be added for job06.
# Original f4d4 FDI16 OBJ, original five-tissue report and source hashes are unchanged.
if($SceneMode -eq 'clinic-overview'){
 $clinicScript=Join-Path $PSScriptRoot 'sr1c-godot-clinic-overview.gd'
 if(-not(Test-Path -LiteralPath $clinicScript)){throw 'Approved native clinic workspace source absent'}
 $dest=Join-Path $project 'sr1c-godot-clinic-overview.gd'
 if(Test-Path -LiteralPath $dest){throw 'Refusing to overwrite existing clinic scene'}
 Copy-Item -LiteralPath $clinicScript -Destination $dest -ErrorAction Stop
}
$sceneModeFile=Join-Path $project 'source\scene-mode.txt'
if(Test-Path -LiteralPath $sceneModeFile){throw 'Refusing to overwrite pinned native scene-mode file'}
[IO.File]::WriteAllText($sceneModeFile,$SceneMode+[Environment]::NewLine,
 (New-Object System.Text.UTF8Encoding($false)))
$report=[ordered]@{
 schemaVersion=2
 status='EVIDENCE_INCOMPLETE'
 nativeSceneMode=$SceneMode
 fullKlinikLabApplicationMigrated=$false
 sourceGitSHA=$ExpectedSha
 godotExe=[IO.Path]::GetFullPath($GodotExe)
 godotProject=(Join-Path $project 'project.godot')
 privateDesktopCreated=$false
 userDesktopActivationRequested=$false
 headlessUsed=$false
 godotPid=$null;godotStartedUTC=$null
 nativeSourceSubmissionVerified=$false
 nativeImagePresent=$false;nativeScreenshotFile=$null
 imageSHA256=$null;imageWidth=$null;imageHeight=$null
 nativePixelReviewAccepted=$false
 sourceTriangles=@{before=14856;after=14936}
 expectedTissueSurfacesPerState=5
 renderingMethod=$null;renderingDriver=$null
 videoAdapterName=$null;videoAdapterVendor=$null
 backgroundCaptureStatus=$null
 process3DSampleCount=0;process3DPositiveSamples=0;process3DMaxUtilizationPercent=$null
 process3DDistinctSamplePeriods=0;process3DPositiveDistinctPeriods=0
 process3DPositiveRtx5060DistinctPeriods=0
 persistentPDHQueryUsed=$false
 originalGpuCounterSampleFile='godot-gpu-3d-counters.json'
 dxgiAdapters=@();rtx5060DxgiLuid=$null;positiveGodotEngineLuids=@()
 nativeAngledScreenshotFile=$null;angledImageSHA256=$null
 nativeAngledImagePresent=$false
 orbitDurationSeconds=$null
 rendererLogNvidiaRtx5060=$false
 gpuAdapterLuidMatchedToNvidia=$false
 godotProcessGPUCorroborated=$false
 blockers=@()
 limitations=@('Independent original PNG pixel review remains required',
 'Windows GPU 3D PID utilization plus Godot Vulkan adapter identity does not itself map a DXGI LUID')
}
function Block([string]$message){$script:report.blockers=@($script:report.blockers)+$message}
function Read-StrictSource {
 param([string]$Path)
 if(-not(Test-Path -LiteralPath $Path)){Block 'Native original FDI16 source-submission JSON absent';return}
 try{
  $data=Get-Content -LiteralPath $Path -Raw|ConvertFrom-Json -ErrorAction Stop
  $valid=($data.sourceGitSHA -eq $ExpectedSha -and
   $data.status -eq 'NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU' -and
   $data.renderingMethod -eq 'forward_plus' -and $data.renderingDriver -eq 'vulkan' -and
   [int]$data.states.before.submittedTriangles -eq 14856 -and
   [int]$data.states.after.submittedTriangles -eq 14936)
  $faceCounts=@{
   before=@{enamel=10320;dentin=112;pulp=207;cementum=4105;caries=112}
   after=@{enamel=10308;dentin=205;pulp=207;cementum=4105;caries=111}
  }
  foreach($state in @('before','after')){
   $parts=@($data.states.$state.tissues.PSObject.Properties)
   if($parts.Count -ne 5 -or [int]$data.states.$state.nativeSurfaceCount -ne 5){$valid=$false}
   foreach($tissue in @('enamel','dentin','pulp','cementum','caries')){
    $v=$data.states.$state.tissues.$tissue
    if(-not $v -or [int]$v.sourceTriangles -ne $faceCounts[$state][$tissue] -or
     [int]$v.nativeSubmittedIndices -ne 3*$faceCounts[$state][$tissue] -or
     [int]$v.surfaceCount -ne 1){$valid=$false}
   }
  }
  $report.nativeSourceSubmissionVerified=[bool]$valid
  if(-not $valid){Block 'Godot source submission failed exact five-tissue topology/renderer contract'}
 }catch{Block ('Native source validation exception: '+$_.Exception.Message)}
}
. $launcher
# WinPS 5.1 dynamically compiles typed DXGI COM interface for independent LUID.
# Fail closed before launching Godot if this native evidence dependency fails.
$dxgiSource=Join-Path $PSScriptRoot 'sr1c-dxgi-luid.cs'
if(-not (Test-Path -LiteralPath $dxgiSource)){throw 'No native DXGI LUID source helper'}
Add-Type -Path $dxgiSource -ErrorAction Stop
$session=$null
try{
 $log=Join-Path $captures 'godot-native-background.log'
 $session=Start-KLPrivateDesktopGodot -GodotExecutable $report.godotExe -ProjectDir $project -LogPath $log
 $report.privateDesktopCreated=$true
 $report.godotPid=[int]$session.Pid
 $proc=Get-Process -Id $session.Pid -ErrorAction Stop
 $report.godotStartedUTC=$proc.StartTime.ToUniversalTime().ToString('o')
 Start-Sleep -Seconds 3 # Give Godot time to register its Vulkan GPU Engine instances before opening ONE persistent PDH query
 # No foreground focus, no game/editor activation and no manual F12.
 # Capture script itself uses RenderingServer.frame_post_draw and records true adapter.
 # One Get-Counter invocation keeps ONE native Windows PDH query open across
 # 34 ~1s data collections. Job04 reopened the full wildcard query each
 # iteration, yielding 54 ROWS but only TWO distinct collection timestamps.
 # Never count multiple GPU engine rows at one timestamp as independent proof.
 $filterScript=Join-Path $PSScriptRoot 'sr1c-pdh-filter.ps1'
 if(-not(Test-Path -LiteralPath $filterScript)){throw 'Missing approved PDH validity filter'}
 . $filterScript
 $counterData=@();$samplingErrors=@();$pdhPowerShellErrors=@()
 $rejectedPidRows=@();$collectionPeriods=@()
 $report.persistentPDHQueryUsed=$true
 # A wildcard GPU Engine counter set can include invalid instances unrelated to
 # the Godot PID. WinPS Get-Counter -ErrorAction Stop aborted the ENTIRE query
 # in job05. Continue collecting, but never count invalid counter samples.
 try{
  $snapshots=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' `
   -SampleInterval 1 -MaxSamples 34 -ErrorAction Continue -ErrorVariable +pdhPowerShellErrors)
  $parsed=ConvertTo-KLGodotGpu3DRows -Snapshots $snapshots -GodotPid ([int]$session.Pid) `
   -GetEngineLuid {param($path) [KlinikLab.DxgiEvidence]::FromGpuEnginePath([string]$path)}
  $counterData=@($parsed.rows)
  $collectionPeriods=@($parsed.periods)
  $rejectedPidRows=@($parsed.invalidRows|Select-Object -First 100)
 }catch{$samplingErrors+=($_.Exception.Message)}
 $counterOutput=Join-Path $captures $report.originalGpuCounterSampleFile
 $counterJson=ConvertTo-Json -InputObject @($counterData) -Depth 7
 [IO.File]::WriteAllText($counterOutput, ($counterJson + [Environment]::NewLine),
  (New-Object System.Text.UTF8Encoding($false)))
 # PowerShell may warn about individual invalid wildcard rows and still produce
 # valid samples. Warnings are evidence, not a reason to discard good snapshots.
 $pdhWarningMessages=@($pdhPowerShellErrors|ForEach-Object{[string]$_.Exception.Message}|
  Select-Object -Unique|Select-Object -First 40)
 $pdhDiagnostic=[ordered]@{
  schemaVersion=1;godotPid=[int]$session.Pid;query='GPU Engine(*)/Utilization Percentage'
  commandErrorAction='Continue';queryInvocationCount=1
  collectionPeriodCount=$collectionPeriods.Count;collectionPeriods=@($collectionPeriods)
  godot3DRowsObserved=$counterData.Count;godot3DRowsRejected=@($counterData|Where-Object{-not $_.usable}).Count
  rejectedGodotRows=@($rejectedPidRows)
  nonTerminatingErrorCount=@($pdhPowerShellErrors).Count
  nonTerminatingErrorMessages=$pdhWarningMessages
  terminatingErrors=@($samplingErrors)
 }
 $pdhDiagnosticsPath=Join-Path $captures 'godot-gpu-pdh-diagnostics.json'
 [IO.File]::WriteAllText($pdhDiagnosticsPath,
  ((ConvertTo-Json -InputObject $pdhDiagnostic -Depth 12)+[Environment]::NewLine),
  (New-Object System.Text.UTF8Encoding($false)))
 $report.pdhNonTerminatingErrorCount=@($pdhPowerShellErrors).Count
 $report.pdhRejectedGodot3DRows=@($counterData|Where-Object{-not $_.usable}).Count
 $report.pdhCollectionPeriods=$collectionPeriods.Count
 $report.originalPdhDiagnosticFile='godot-gpu-pdh-diagnostics.json'
 $validSamples=@($counterData|Where-Object{$_.usable})
 $positive=@($validSamples|Where-Object{$_.utilizationPercent -gt 0.05})
 $report.process3DSampleCount=$validSamples.Count
 $report.process3DPositiveSamples=$positive.Count
 $report.process3DDistinctSamplePeriods=@($validSamples|Select-Object -ExpandProperty utc -Unique).Count
 $report.process3DPositiveDistinctPeriods=@($positive|Select-Object -ExpandProperty utc -Unique).Count
 $report.positiveGodotEngineLuids=@($positive|Select-Object -ExpandProperty engineLuid -Unique)
 if($validSamples.Count){
  $report.process3DMaxUtilizationPercent=[double](($validSamples|Measure-Object -Property utilizationPercent -Maximum).Maximum)
 }
 if($samplingErrors.Count){Block ('Persistent Windows PDH query terminated: '+(($samplingErrors|Select-Object -Unique) -join '; '))}
 if($report.process3DPositiveDistinctPeriods -lt 3){
  Block 'Insufficient independent positive Godot-PID GPU 3D PDH COLLECTION PERIODS (require >=3)'
 }
 # Independent adapter identification through native DXGI. Explicit LUID
 # equality is REQUIRED, not a GPU device-name string or aggregate nvidia-smi.
 try{
  $adapterRows=@([KlinikLab.DxgiEvidence]::Enumerate())
  $report.dxgiAdapters=@($adapterRows)
  $nvidia=@($adapterRows|Where-Object{
   $_.vendorId -eq 4318 -and $_.name -match '(?i)RTX\s*5060'
  })
  if($nvidia.Count -ne 1){
   Block "DXGI enumerated $($nvidia.Count) distinct NVIDIA RTX 5060 adapters, required exactly 1"
  }else{
   $report.rtx5060DxgiLuid=[string]$nvidia[0].luid
   $matched=@($positive|Where-Object{$_.engineLuid -eq $report.rtx5060DxgiLuid})
   $report.process3DPositiveRtx5060DistinctPeriods=@(
    $matched|Select-Object -ExpandProperty utc -Unique
   ).Count
   $report.gpuAdapterLuidMatchedToNvidia=($report.process3DPositiveRtx5060DistinctPeriods -ge 3)
   if(-not $report.gpuAdapterLuidMatchedToNvidia){
    Block 'Fewer than three independent Godot-PID GPU 3D periods match the RTX 5060 DXGI LUID'
   }
  }
 }catch{Block ('Native DXGI GetDesc1 LUID map failed: '+$_.Exception.Message)}
 $nativeSource=Join-Path $captures 'native-source-submission.json'
 Read-StrictSource -Path $nativeSource
 $background=Join-Path $captures 'godot-background-capture.json'
 if(Test-Path -LiteralPath $background){
  $capture=Get-Content -LiteralPath $background -Raw|ConvertFrom-Json
  $report.backgroundCaptureStatus=[string]$capture.status
  if([string]$capture.nativeSceneMode -ne $SceneMode){
   Block 'Native Godot captured scene mode does not match the approved PC job'
  }
  if($SceneMode -eq 'clinic-overview' -and [int]$capture.nativeClinicWorkspaceObjectCount -lt 25){
   Block 'Native KlinikLab clinic workspace not populated with expected objects'
  }
  $report.renderingMethod=[string]$capture.renderingMethod
  $report.renderingDriver=[string]$capture.renderingDriver
  $report.videoAdapterName=[string]$capture.videoAdapterName
  $report.videoAdapterVendor=[string]$capture.videoAdapterVendor
  if($capture.headlessUsed -ne $false -or $capture.userDesktopActivationRequested -ne $false){
   Block 'Godot background capture incorrectly marked headless or desktop activation'
  }
  if($capture.status -ne 'BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW'){
   Block ('Godot background capture blocked: '+[string]$capture.reason)
  }
  if($capture.renderingMethod -ne 'forward_plus' -or $capture.renderingDriver -ne 'vulkan' -or
   $capture.videoAdapterName -notmatch '(?i)RTX\s*5060' -or
   $capture.videoAdapterVendor -notmatch '(?i)NVIDIA'){
   Block 'Godot did not report real native Vulkan rendering on the NVIDIA RTX 5060'
  }else{$report.rendererLogNvidiaRtx5060=$true}
  $name=[string]$capture.imageFile
  if($name -match '^godot-native-fdi16-frontal-[0-9]+\.png$'){
   $shot=Join-Path $captures $name
   if(Test-Path -LiteralPath $shot){
    $bytes=[IO.File]::ReadAllBytes($shot)
    if($bytes.Length -gt 10000 -and [BitConverter]::ToString($bytes,0,8) -eq '89-50-4E-47-0D-0A-1A-0A'){
     $shotHash=(Get-FileHash -LiteralPath $shot -Algorithm SHA256).Hash.ToLowerInvariant()
     if($shotHash -eq [string]$capture.imageSHA256){
      $report.nativeImagePresent=$true
      $report.nativeScreenshotFile=$name
      $report.imageSHA256=$shotHash
      $report.imageWidth=[int]$capture.imageWidth
      $report.imageHeight=[int]$capture.imageHeight
      if($report.imageWidth -lt 1280 -or $report.imageHeight -lt 720){
       $report.nativeImagePresent=$false
       Block 'Frontal original PNG dimensions insufficient'
      }
     }else{Block 'Frontal original PNG SHA256 mismatch'}
    }
   }
  }
  # A second original native Vulkan GPU readback is mandatory.
  $angleName=[string]$capture.angledImageFile
  if($angleName -match '^godot-native-fdi16-occlusal-[0-9]+\.png$'){
   $angledShot=Join-Path $captures $angleName
   if(Test-Path -LiteralPath $angledShot){
    $angledBytes=[IO.File]::ReadAllBytes($angledShot)
    if($angledBytes.Length -gt 10000 -and [BitConverter]::ToString($angledBytes,0,8) -eq '89-50-4E-47-0D-0A-1A-0A'){
     $angledHash=(Get-FileHash -LiteralPath $angledShot -Algorithm SHA256).Hash.ToLowerInvariant()
     if($angledHash -eq [string]$capture.angledImageSHA256){
      $report.nativeAngledImagePresent=$true
      $report.nativeAngledScreenshotFile=$angleName
      $report.angledImageSHA256=$angledHash
     }else{Block 'Angled original PNG SHA256 mismatch'}
    }
   }
  }
  $report.orbitDurationSeconds=[double]$capture.orbitDurationSeconds
  if($report.orbitDurationSeconds -lt 40 -or $report.orbitDurationSeconds -gt 45){
   Block 'Native Godot continuous orbit did not complete required 40-45 seconds'
  }
  if(-not $report.nativeImagePresent){Block 'No valid original frontal private-desktop Vulkan PNG'}
  if(-not $report.nativeAngledImagePresent){Block 'No valid original angled/occlusal private-desktop Vulkan PNG'}
 }else{Block 'No original Godot background capture report returned'}
 $report.godotProcessGPUCorroborated=(
  $report.rendererLogNvidiaRtx5060 -and
  $report.process3DPositiveRtx5060DistinctPeriods -ge 3 -and
  $report.gpuAdapterLuidMatchedToNvidia
 )
 if(-not $report.godotProcessGPUCorroborated){Block 'Actual Godot process RTX 5060 GPU render proof incomplete'}
} catch {Block ('Private desktop Godot process exception: '+$_.Exception.Message)}
finally {
 if($session){Stop-KLPrivateDesktopGodot -Session $session}
 $report.blockers=@($report.blockers|Select-Object -Unique)
 if($report.privateDesktopCreated -and $report.nativeSourceSubmissionVerified -and
  $report.nativeImagePresent -and $report.nativeAngledImagePresent -and
  $report.godotProcessGPUCorroborated -and $report.gpuAdapterLuidMatchedToNvidia -and
  $report.blockers.Count -eq 0){
  $report.status='EVIDENCE_CAPTURED_PENDING_INDEPENDENT_PIXEL_AND_LUID_REVIEW'
 }
 $reportJson=$report|ConvertTo-Json -Depth 12
 [IO.File]::WriteAllText($reportPath, ($reportJson + [Environment]::NewLine),
  (New-Object System.Text.UTF8Encoding($false)))
 Write-Host "Native background Godot evidence: $reportPath"
 Write-Host "Native background Godot status: $($report.status)"
}
