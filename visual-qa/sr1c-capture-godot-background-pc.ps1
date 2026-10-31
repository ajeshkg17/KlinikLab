# Autonomous real Vulkan Godot FDI16 on a Windows PRIVATE DESKTOP.
# No Godot editor/Project Manager, no foreground activation, no F12, no --headless.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$ExpectedSha,
 [Parameter(Mandatory=$true)][string]$GodotExe
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
$report=[ordered]@{
 schemaVersion=2
 status='EVIDENCE_INCOMPLETE'
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
 originalGpuCounterSampleFile='godot-gpu-3d-counters.json'
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
$session=$null
try{
 $log=Join-Path $captures 'godot-native-background.log'
 $session=Start-KLPrivateDesktopGodot -GodotExecutable $report.godotExe -ProjectDir $project -LogPath $log
 $report.privateDesktopCreated=$true
 $report.godotPid=[int]$session.Pid
 $proc=Get-Process -Id $session.Pid -ErrorAction Stop
 $report.godotStartedUTC=$proc.StartTime.ToUniversalTime().ToString('o')
 # No foreground focus, no game/editor activation and no manual F12.
 # Capture script itself uses RenderingServer.frame_post_draw and records true adapter.
 $counterData=@();$samplingErrors=@()
 for($i=0;$i -lt 23;$i++){
  Start-Sleep -Seconds 1
  $proc=Get-Process -Id $session.Pid -ErrorAction SilentlyContinue
  if(-not $proc){break}
  try{
   $batch=Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -MaxSamples 1 -ErrorAction Stop
   foreach($c in @($batch.CounterSamples)){
    if($c.Path -match ('(?i)pid_'+$session.Pid+'_') -and $c.Path -match '(?i)engtype_3d'){
     $v=[double]$c.CookedValue
     $finite=(-not [double]::IsNaN($v)) -and (-not [double]::IsInfinity($v))
     $counterData+= [PSCustomObject]@{
      utc=[DateTime]::UtcNow.ToString('o')
      counterPath=[string]$c.Path
      utilizationPercent=$v
      finite=[bool]$finite
     }
    }
   }
  }catch{$samplingErrors+=($_.Exception.Message)}
 }
 $counterOutput=Join-Path $captures $report.originalGpuCounterSampleFile
 @($counterData)|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $counterOutput -Encoding utf8
 $validSamples=@($counterData|Where-Object{$_.finite -and $_.utilizationPercent -ge 0 -and $_.utilizationPercent -le 100})
 $positive=@($validSamples|Where-Object{$_.utilizationPercent -gt 0.05})
 $report.process3DSampleCount=$validSamples.Count
 $report.process3DPositiveSamples=$positive.Count
 if($validSamples.Count){$report.process3DMaxUtilizationPercent=[double](($validSamples|Measure-Object -Property utilizationPercent -Maximum).Maximum)}
 if($samplingErrors.Count){Block ('Windows GPU Engine counter errors: '+(($samplingErrors|Select-Object -Unique) -join '; '))}
 if($positive.Count -lt 3){Block 'Not enough nonzero valid Godot-PID GPU Engine 3D counter samples (require >=3)'}
 $nativeSource=Join-Path $captures 'native-source-submission.json'
 Read-StrictSource -Path $nativeSource
 $background=Join-Path $captures 'godot-background-capture.json'
 if(Test-Path -LiteralPath $background){
  $capture=Get-Content -LiteralPath $background -Raw|ConvertFrom-Json
  $report.backgroundCaptureStatus=[string]$capture.status
  $report.renderingMethod=[string]$capture.renderingMethod
  $report.renderingDriver=[string]$capture.renderingDriver
  $report.videoAdapterName=[string]$capture.videoAdapterName
  $report.videoAdapterVendor=[string]$capture.videoAdapterVendor
  if($capture.headlessUsed -ne $false -or $capture.userDesktopActivationRequested -ne $false){
   Block 'Godot background capture incorrectly marked headless or desktop activation'
  }
  if($capture.status -ne 'BACKGROUND_VULKAN_FRAME_CAPTURED_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW'){
   Block ('Godot background capture blocked: '+[string]$capture.reason)
  }
  if($capture.renderingMethod -ne 'forward_plus' -or $capture.renderingDriver -ne 'vulkan' -or
   $capture.videoAdapterName -notmatch '(?i)RTX\s*5060' -or
   $capture.videoAdapterVendor -notmatch '(?i)NVIDIA'){
   Block 'Godot did not report real native Vulkan rendering on the NVIDIA RTX 5060'
  }else{$report.rendererLogNvidiaRtx5060=$true}
  $name=[string]$capture.imageFile
  if($name -match '^godot-native-fdi16-[0-9]+\.png$'){
   $shot=Join-Path $captures $name
   if(Test-Path -LiteralPath $shot){
    $binary=[IO.File]::ReadAllBytes($shot)
    if($binary.Length -gt 10000 -and [BitConverter]::ToString($binary,0,8) -eq '89-50-4E-47-0D-0A-1A-0A'){
     $report.nativeImagePresent=$true
     $report.nativeScreenshotFile=$name
     $report.imageSHA256=(Get-FileHash -LiteralPath $shot -Algorithm SHA256).Hash.ToLowerInvariant()
     $report.imageWidth=[int]$capture.imageWidth
     $report.imageHeight=[int]$capture.imageHeight
     if($report.imageWidth -lt 1280 -or $report.imageHeight -lt 720){
      $report.nativeImagePresent=$false
      Block 'Reported screenshot size below required dimensions'
     }
    }
   }
  }
  if(-not $report.nativeImagePresent){Block 'No valid original private-desktop GPU PNG'}
 }else{Block 'No original Godot background capture report returned'}
 $report.godotProcessGPUCorroborated=($report.rendererLogNvidiaRtx5060 -and $positive.Count -ge 3)
 if(-not $report.godotProcessGPUCorroborated){Block 'Actual Godot process RTX 5060 GPU render proof incomplete'}
} catch {Block ('Private desktop Godot process exception: '+$_.Exception.Message)}
finally {
 if($session){Stop-KLPrivateDesktopGodot -Session $session}
 $report.blockers=@($report.blockers|Select-Object -Unique)
 if($report.privateDesktopCreated -and $report.nativeSourceSubmissionVerified -and
  $report.nativeImagePresent -and $report.godotProcessGPUCorroborated -and
  $report.blockers.Count -eq 0){
  $report.status='EVIDENCE_CAPTURED_PENDING_INDEPENDENT_PIXEL_AND_LUID_REVIEW'
 }
 $report|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $reportPath -Encoding utf8
 Write-Host "Native background Godot evidence: $reportPath"
 Write-Host "Native background Godot status: $($report.status)"
}
