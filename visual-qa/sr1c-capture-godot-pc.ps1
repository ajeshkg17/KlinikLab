# Native Windows Godot FDI16 evidence capture. Only execute on interactive owner PC.
# Does not accept job-provided commands/paths; never claims image review itself.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$ExpectedSha,
 [Parameter(Mandatory=$true)][string]$GodotExe
)
$ErrorActionPreference='Stop'
$out=[IO.Path]::GetFullPath($EvidenceDir)
$sourceReport=Join-Path $out 'godot-source-prepare.json'
$project=Join-Path $out 'Project'
$captures=Join-Path $out 'Captures'
$reportPath=Join-Path $captures 'godot-owner-pc-result.json'
if(-not(Test-Path $sourceReport)){throw 'No prepared exact-source Godot project'}
if(Test-Path $reportPath){throw 'Capture result already exists; refusing overwrite'}
$prepared=Get-Content $sourceReport -Raw|ConvertFrom-Json
if($prepared.sourceGitSHA -ne $ExpectedSha -or $prepared.status -ne 'SOURCE_EXPORTED_GODOT_PROJECT_READY_NOT_RENDERED'){
 throw 'Prepared exact source not verified'
}
if(-not(Test-Path (Join-Path $project 'project.godot'))){throw 'Godot source project missing'}
if(-not(Test-Path $GodotExe -PathType Leaf)){throw "Godot installed exe not found: $GodotExe"}
$exe=[IO.Path]::GetFullPath($GodotExe)
if([IO.Path]::GetExtension($exe).ToLowerInvariant() -ne '.exe'){throw 'Only actual Windows Godot executable accepted'}
$report=[ordered]@{
 schemaVersion=1
 kind='owner-PC Godot native FDI16 source/GPU/capture diagnostics; no pixel acceptance'
 status='EVIDENCE_INCOMPLETE'
 sourceGitSHA=$ExpectedSha
 godotExe=$exe;godotProject=(Join-Path $project 'project.godot')
 godotPid=$null;godotStartedUTC=$null
 sourceTriangles=@{before=14856;after=14936}
 expectedTissueSurfacesPerState=5
 nativeSourceSubmissionVerified=$false
 nativeScreenshotFile=$null;imageSHA256=$null;imageWidth=$null;imageHeight=$null
 nativeImagePresent=$false;nativePixelReviewAccepted=$false
 godotLogSHA256=$null
 rendererLogNvidiaRtx5060=$false
 process3DSampleCount=0;process3DPositiveSamples=0;process3DMaxUtilizationPercent=$null
 gpuAdapterLuidMatchedToNvidia=$false
 godotProcessGPUCorroborated=$false
 originalGpuCounterSampleFile='godot-gpu-3d-counters.json'
 blockers=@();limitations=@(
   'Source geometry and a native PNG require independent visual inspection',
   'GPU 3D PID counters plus NVIDIA Vulkan log are corroboration, not independent Windows LUID mapping'
 )
}
function Block([string]$message){$report.blockers=@($report.blockers)+@($message)}
$p=$null
try{
 Add-Type -AssemblyName System.Windows.Forms
 Add-Type -Namespace Win32 -Name Foreground -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);' -ErrorAction SilentlyContinue
 $log=Join-Path $captures 'godot-native-stdout.log'
 $err=Join-Path $captures 'godot-native-stderr.log'
 $args='--path "'+$project+'" --rendering-driver vulkan --verbose'
 $p=Start-Process -FilePath $exe -ArgumentList $args -PassThru -RedirectStandardOutput $log -RedirectStandardError $err -ErrorAction Stop
 $report.godotPid=[int]$p.Id
 $report.godotStartedUTC=([DateTime]$p.StartTime).ToUniversalTime().ToString('o')
 Start-Sleep -Seconds 8
 $p.Refresh()
 if($p.HasExited){Block "Native Godot process exited before capture (exit=$($p.ExitCode))"}
 else {
  $handle=[IntPtr]::Zero
  for($j=0;$j -lt 12;$j++){
   $p.Refresh();$handle=$p.MainWindowHandle
   if($handle -ne [IntPtr]::Zero){break}
   Start-Sleep -Milliseconds 500
  }
  if($handle -eq [IntPtr]::Zero){Block 'Native Godot game window missing (logged-in desktop required)'}
  elseif(-not [Win32.Foreground]::SetForegroundWindow($handle)){
   Block 'Windows refused native Godot game focus; F12 cannot be trusted'
  }else {
   Start-Sleep -Milliseconds 650
   [System.Windows.Forms.SendKeys]::SendWait('{F12}')
   Start-Sleep -Seconds 4
   if(-not (Get-ChildItem -LiteralPath $captures -File -Filter 'godot-native-fdi16-*.png' -ErrorAction SilentlyContinue)){
    # A second targeted keypress is permitted only when no first image exists.
    [System.Windows.Forms.SendKeys]::SendWait('{F12}')
    Start-Sleep -Seconds 3
   }
  }
  try {
   $raw=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 12 -ErrorAction Stop)
   $samples=@(foreach($sample in $raw){
    foreach($item in @($sample.CounterSamples)){
     if($item.Path -match ('(?i)pid_'+$p.Id+'_') -and $item.Path -match '(?i)engtype_3d'){
      $num=[double]$item.CookedValue
      [PSCustomObject]@{utc=$sample.Timestamp.ToUniversalTime().ToString('o');
         counterPath=[string]$item.Path; utilizationPercent=$num;
         finite=([double]::IsNaN($num) -eq $false -and [double]::IsInfinity($num) -eq $false)}
     }
    }
   })
   $samples|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $captures $report.originalGpuCounterSampleFile) -Encoding utf8
   $good=@($samples|Where-Object{$_.finite -and $_.utilizationPercent -ge 0 -and $_.utilizationPercent -le 100})
   $positive=@($good|Where-Object{$_.utilizationPercent -gt 0.05})
   $report.process3DSampleCount=$good.Count
   $report.process3DPositiveSamples=$positive.Count
   if($good.Count){$report.process3DMaxUtilizationPercent=[double](($good|Measure-Object -Property utilizationPercent -Maximum).Maximum)}
   if($positive.Count -lt 3){Block 'Insufficient positive same-PID GPU 3D samples (need >=3)'}
  } catch{
   Block ('Windows GPU Engine counter failure: '+$_.Exception.Message)
  }
 }
 $sourceFile=Join-Path $captures 'native-source-submission.json'
 if(Test-Path $sourceFile){
  $source=Get-Content $sourceFile -Raw|ConvertFrom-Json
  $before=@($source.states.before.tissues.PSObject.Properties)
  $after=@($source.states.after.tissues.PSObject.Properties)
  $correct=($source.sourceGitSHA -eq $ExpectedSha -and
   $source.status -eq 'NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU' -and
   $source.renderingMethod -eq 'forward_plus' -and $source.renderingDriver -eq 'vulkan' -and
   [int]$source.states.before.submittedTriangles -eq 14856 -and
   [int]$source.states.after.submittedTriangles -eq 14936 -and
   $before.Count -eq 5 -and $after.Count -eq 5)
  if($correct){
   foreach($tissue in @('enamel','dentin','pulp','cementum','caries')){
    foreach($state in @('before','after')){
     $r=$source.states.$state.tissues.$tissue
     if(-not $r -or [int]$r.nativeSubmittedIndices -ne 3*[int]$r.sourceTriangles -or [int]$r.surfaceCount -ne 1){$correct=$false}
    }
   }
  }
  $report.nativeSourceSubmissionVerified=[bool]$correct
  if(-not $correct){Block 'Actual Godot native submission/source material parity incomplete'}
 }else{Block 'Godot did not write actual native-source-submission.json'}
 $shots=@(Get-ChildItem -LiteralPath $captures -File -Filter 'godot-native-fdi16-*.png' -ErrorAction SilentlyContinue|Sort-Object LastWriteTimeUtc -Descending)
 if($shots.Count){
  $shot=$shots[0]
  $report.nativeScreenshotFile=$shot.Name
  $report.imageSHA256=(Get-FileHash -LiteralPath $shot.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $bytes=[IO.File]::ReadAllBytes($shot.FullName)
  if($bytes.Length -gt 10000 -and ([BitConverter]::ToString($bytes,0,8)) -eq '89-50-4E-47-0D-0A-1A-0A'){
   $report.imageWidth=[int]($bytes[16]*16777216+$bytes[17]*65536+$bytes[18]*256+$bytes[19])
   $report.imageHeight=[int]($bytes[20]*16777216+$bytes[21]*65536+$bytes[22]*256+$bytes[23])
   $report.nativeImagePresent=($report.imageWidth -ge 1280 -and $report.imageHeight -ge 720)
  }
  if(-not $report.nativeImagePresent){Block 'PNG invalid or resolution insufficient'}
 }else{Block 'No original native Godot F12 PNG was produced'}
 } # end running/exit check
} catch {Block ('Native Godot capture runner exception: '+$_.Exception.Message)}
finally{
 if($p -and -not $p.HasExited){try{Stop-Process -Id $p.Id -Force -ErrorAction Stop}catch{}}
 $logs=@()
 foreach($name in @('godot-native-stdout.log','godot-native-stderr.log')){
  $lp=Join-Path $captures $name
  if(Test-Path $lp){$logs+=Get-Content $lp -Raw -ErrorAction SilentlyContinue}
 }
 $joined=$logs -join [Environment]::NewLine
 if($joined){
  $stdoutPath=Join-Path $captures 'godot-native-stdout.log'
  if(Test-Path -LiteralPath $stdoutPath){
   $hash=Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256 -ErrorAction SilentlyContinue
   if($hash){$report.godotLogSHA256=$hash.Hash.ToLowerInvariant()}
  }
  $report.rendererLogNvidiaRtx5060=($joined -match '(?is)vulkan' -and $joined -match '(?i)NVIDIA' -and $joined -match '(?i)RTX 5060')
 }
 if(-not $report.rendererLogNvidiaRtx5060){Block 'No renderer process log proves native Vulkan RTX 5060 adapter'}
 $report.godotProcessGPUCorroborated=($report.rendererLogNvidiaRtx5060 -and $report.process3DPositiveSamples -ge 3)
 if(-not $report.godotProcessGPUCorroborated){Block 'Godot process-specific GPU engine proof incomplete'}
 $report.blockers=@($report.blockers|Select-Object -Unique)
 if($report.nativeImagePresent -and $report.nativeSourceSubmissionVerified -and $report.godotProcessGPUCorroborated -and $report.blockers.Count -eq 0){
  $report.status='EVIDENCE_CAPTURED_PENDING_INDEPENDENT_PIXEL_AND_LUID_REVIEW'
 }
 $report|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $reportPath -Encoding utf8
 Write-Host "Godot owner-PC result status: $($report.status)"
 Write-Host "Godot owner-PC evidence: $reportPath"
}
