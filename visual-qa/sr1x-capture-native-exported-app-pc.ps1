# SR14: independent EXPORTED Windows app evidence. No --path source Godot.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$EvidenceDir,
[Parameter(Mandatory=$true)][string]$ExpectedSha,
[Parameter(Mandatory=$true)][string]$ArtifactZip)
$ErrorActionPreference='Stop'
if($ExpectedSha -notmatch '^[a-f0-9]{40}$'){throw 'Invalid source SHA'}
if(-not(Test-Path -LiteralPath $ArtifactZip -PathType Leaf)){throw 'Artifact ZIP absent'}
$run=[IO.Path]::GetFullPath($EvidenceDir)
$release=Join-Path $run 'Release'
$capture=Join-Path $run 'Captures'
if(Test-Path -LiteralPath $release){throw 'Refuse evidence overwrite'}
New-Item -Path $release,$capture -ItemType Directory -Force | Out-Null
$reportPath=Join-Path $capture 'godot-owner-pc-result.json'
$script:report=[ordered]@{
 schemaVersion=8;sourceGitSHA=$ExpectedSha;nativeSceneMode='native-exported-cc0'
 nativeSourceSubmissionVerified=$false;nativeCaseWorkflowVerified=$false;rawSidecarVerified=$false
 nativeImagePresent=$false;nativeAngledImagePresent=$false
 nativeScreenshotFile=$null;nativeAngledScreenshotFile=$null
 godotProcessGPUCorroborated=$false;gpuAdapterLuidMatchedToNvidia=$false
 process3DPositiveRtx5060DistinctPeriods=0;rtx5060DxgiLuid=$null
 godotPid=$null;renderingMethod=$null;renderingDriver=$null
 videoAdapterName=$null;videoAdapterVendor=$null;privateDesktopCreated=$false
 headlessUsed=$false;userDesktopActivationRequested=$false
 imageIndependentPixelReviewAccepted=$false;status='EVIDENCE_INCOMPLETE'
 artifactZipSHA256=(Get-FileHash -LiteralPath $ArtifactZip -Algorithm SHA256).Hash.ToLowerInvariant()
 errors=@();blockers=@()
}
function Block([string]$s){$script:report.blockers=@($script:report.blockers)+$s}
$session=$null
try{
 Expand-Archive -LiteralPath $ArtifactZip -DestinationPath $release -ErrorAction Stop
 $exe=Join-Path $release 'KlinikLab.exe'
 $manifest=Get-Content (Join-Path $release 'native-build-manifest.json') -Raw | ConvertFrom-Json
 $checksum=((Get-Content (Join-Path $release 'SHA256SUMS.txt') -Raw) -split '\s+')[0].ToLowerInvariant()
 $actual=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
 if($checksum -ne $actual -or $manifest.originalSourceGitSHA -ne $ExpectedSha -or
 $manifest.nativeCc0WholeClinicStaticEnvironment -ne $true -or $manifest.nativeCases -ne 6){
  throw 'Exported EXE SHA/source/CC0 manifest does not match target job'
 }
 # Godot remaps OBJ/GLB resources: verify original portable raw bytes before launch.
 $rawManifest=Join-Path $release 'RAW-SOURCE-SHA256SUMS.txt'
 if(-not(Test-Path -LiteralPath $rawManifest -PathType Leaf)){throw 'Portable raw-source SHA manifest missing'}
 $rawEntries=@(Get-Content -LiteralPath $rawManifest | Where-Object{$_ -ne ''})
 if($rawEntries.Count -lt 12){throw 'Incomplete raw-source sidecar list'}
 foreach($line in $rawEntries){
  if($line -cnotmatch '^([a-f0-9]{64})  (verified-raw-source/[a-zA-Z0-9._/-]+)$'){throw 'Unsafe raw checksum row'}
  $want=$Matches[1];$relative=$Matches[2]
  if($relative -match '(^|/)\.\.(/|$)'){throw 'Raw asset traversal rejected'}
  $asset=Join-Path $release $relative
  if(-not(Test-Path -LiteralPath $asset -PathType Leaf)){throw ('Missing raw asset '+$relative)}
  if((Get-FileHash -LiteralPath $asset -Algorithm SHA256).Hash.ToLowerInvariant() -cne $want){throw ('Raw SHA mismatch '+$relative)}
 }
 $script:report.rawSidecarVerified=$true
 $script:report.nativeSourceSubmissionVerified=$true
 $script:report.exportedExeSHA256=$actual
 $env:KLINIKLAB_PC_CAPTURE_DIR=$capture
 $env:KLINIKLAB_PC_EXPECTED_SHA=$ExpectedSha
 . (Join-Path $PSScriptRoot 'sr1c-private-desktop.ps1')
 $session=Start-KLPrivateDesktopExportedApp -Executable $exe -WorkingDir $release -LogPath (Join-Path $capture 'native-exported-app.log')
 $script:report.privateDesktopCreated=$true
 $script:report.godotPid=[int]$session.Pid
 Get-Process -Id $session.Pid -ErrorAction Stop | Out-Null
 Add-Type -Path (Join-Path $PSScriptRoot 'sr1c-dxgi-luid.cs') -ErrorAction Stop
 . (Join-Path $PSScriptRoot 'sr1c-pdh-filter.ps1')
 Start-Sleep -Seconds 3
 $pdhErrors=@()
 $pdhAliveStart=[bool](Get-Process -Id $session.Pid -ErrorAction SilentlyContinue)
 $snapshots=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 34 -ErrorAction Continue -ErrorVariable +pdhErrors)
 $pdhAliveEnd=[bool](Get-Process -Id $session.Pid -ErrorAction SilentlyContinue)
 $parsed=ConvertTo-KLGodotGpu3DRows -Snapshots $snapshots -GodotPid ([int]$session.Pid) -GetEngineLuid {param($path) [KlinikLab.DxgiEvidence]::FromGpuEnginePath([string]$path)}
 $rows=@($parsed.rows)
 [IO.File]::WriteAllText((Join-Path $capture 'godot-gpu-3d-counters.json'),(ConvertTo-Json -InputObject $rows -Depth 12),(New-Object Text.UTF8Encoding($false)))
 $valid=@($rows | Where-Object{$_.usable -eq $true -and $_.utilizationPercent -gt 0.05})
 # PDH 0xC0000BC6 (3221228486) is INVALID DATA, not 0% utilization.
 $pdhDiagnostics=[ordered]@{
  sourceGitSHA=$ExpectedSha;godotPid=[int]$session.Pid
  processAliveAtSamplingStart=$pdhAliveStart;processAliveAtSamplingEnd=$pdhAliveEnd
  sampleSnapshots=[int]$snapshots.Count;pid3dRows=[int]$rows.Count
  positiveUsablePid3dRows=[int]$valid.Count
  pid3dStatuses=@($rows | Group-Object status | ForEach-Object{@{status=[string]$_.Name;count=[int]$_.Count}})
  invalidCode='0xC0000BC6';invalidDataNeverCountsAsGpu=$true
  counterErrorTypes=@($pdhErrors | Select-Object -First 8 | ForEach-Object{[string]$_.CategoryInfo.Reason})
  independentPixelReviewAccepted=$false
 }
 [IO.File]::WriteAllText((Join-Path $capture 'godot-gpu-pdh-diagnostics.json'),(ConvertTo-Json -InputObject $pdhDiagnostics -Depth 12),(New-Object Text.UTF8Encoding($false)))
 if($rows.Count -gt 0 -and $valid.Count -eq 0){Block 'No positive valid same-PID GPU 3D rows; inspect PDH statuses and early process exit'}
 $nvidia=@([KlinikLab.DxgiEvidence]::Enumerate() | Where-Object{$_.vendorId -eq 4318 -and $_.name -match '(?i)RTX\s*5060'})
 if($nvidia.Count -eq 1){
  $script:report.rtx5060DxgiLuid=[string]$nvidia[0].luid
  $matches=@($valid | Where-Object{$_.engineLuid -eq $script:report.rtx5060DxgiLuid})
  $script:report.process3DPositiveRtx5060DistinctPeriods=@($matches | Select-Object -ExpandProperty utc -Unique).Count
  $script:report.gpuAdapterLuidMatchedToNvidia=($script:report.process3DPositiveRtx5060DistinctPeriods -ge 3)
 }else{Block 'Not exactly one RTX 5060 DXGI adapter'}
 if(-not $script:report.gpuAdapterLuidMatchedToNvidia){Block 'Fewer than three independent positive exact exported-app PID GPU 3D periods on RTX5060 LUID'}
 $nativeFile=Join-Path $capture 'native-exported-app-result.json'
 $until=[DateTime]::UtcNow.AddSeconds(75)
 while(-not(Test-Path -LiteralPath $nativeFile -PathType Leaf) -and [DateTime]::UtcNow -lt $until){Start-Sleep -Milliseconds 500}
 if(-not(Test-Path -LiteralPath $nativeFile -PathType Leaf)){throw 'Exported exe did not publish its own capture report; check --script embedded-PCK launch'}
 $native=Get-Content -LiteralPath $nativeFile -Raw | ConvertFrom-Json
 $script:report.renderingMethod=[string]$native.renderingMethod
 $script:report.renderingDriver=[string]$native.renderingDriver
 $script:report.videoAdapterName=[string]$native.videoAdapterName
 $script:report.videoAdapterVendor=[string]$native.videoAdapterVendor
 $script:report.nativeCaseWorkflowVerified=($native.sourceGitSHA -eq $ExpectedSha -and [int]$native.sourceCases -eq 6 -and
  $native.selectedCase -eq 'endo' -and $native.selectedFDI -eq '36' -and
  $native.selectedStation -eq 'practical' -and $native.directBurEnabled -eq $true -and
  [int]$native.environment.wholeMeshInstances -ge 20)
 if(-not $script:report.nativeCaseWorkflowVerified){Block 'Live embedded CC0 scene or FDI36 practical state failed'}
 if($native.renderingMethod -ne 'forward_plus' -or $native.renderingDriver -ne 'vulkan' -or
 $native.videoAdapterName -notmatch '(?i)RTX\s*5060' -or $native.videoAdapterVendor -notmatch '(?i)NVIDIA'){
  Block 'Exported executable did not report RTX5060 Vulkan rendering'
 }
 foreach($item in @(@{field='environmentImage';out='nativeImagePresent';name='nativeScreenshotFile'},
 @{field='practicalImage';out='nativeAngledImagePresent';name='nativeAngledScreenshotFile'})){
  $image=$native.($item.field)
  $file=[string]$image.file
  if($file -notin @('kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png')){
   Block 'Unrecognized exported app evidence filename';continue
  }
  $sourceFile=Join-Path $capture $file
  if(-not(Test-Path -LiteralPath $sourceFile -PathType Leaf)){Block ('Missing image '+$file);continue}
  $data=[IO.File]::ReadAllBytes($sourceFile)
  $sha=(Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash.ToLowerInvariant()
  if($data.Length -le 10000 -or [BitConverter]::ToString($data,0,8) -ne '89-50-4E-47-0D-0A-1A-0A' -or
   $sha -ne [string]$image.sha256 -or [int]$image.width -lt 1280 -or [int]$image.height -lt 720){
   Block ('Invalid image/sha/dimensions '+$file);continue
  }
  $script:report[$item.out]=$true
  $script:report[$item.name]=$file
 }
 $script:report.godotProcessGPUCorroborated=($script:report.gpuAdapterLuidMatchedToNvidia -and
 $script:report.renderingDriver -eq 'vulkan' -and $script:report.videoAdapterName -match '(?i)RTX\s*5060')
 if($script:report.nativeImagePresent -and $script:report.nativeAngledImagePresent -and
 $script:report.nativeCaseWorkflowVerified -and $script:report.godotProcessGPUCorroborated){
  $script:report.status='EXPORTED_APP_RENDER_EVIDENCE_PENDING_INDEPENDENT_PIXEL_REVIEW'
 }
}catch{
 Block ('Exported PC evidence exception: '+$_.Exception.Message)
 $script:report.errors=@($script:report.errors)+[string]$_.Exception.ToString()
}finally{
 if($null -ne $session){Stop-KLPrivateDesktopGodot -Session $session}
 [IO.File]::WriteAllText($reportPath,((ConvertTo-Json -InputObject $script:report -Depth 16)+[Environment]::NewLine),(New-Object Text.UTF8Encoding($false)))
 Remove-Item Env:KLINIKLAB_PC_CAPTURE_DIR -ErrorAction SilentlyContinue
 Remove-Item Env:KLINIKLAB_PC_EXPECTED_SHA -ErrorAction SilentlyContinue
}
Write-Host ('SR14 exact exported-app evidence status='+$script:report.status)
