# Exact exported Windows app, no source project or editor; original owner-PC evidence.
param([Parameter(Mandatory=$true)][string]$EvidenceDir,[Parameter(Mandatory=$true)][string]$ExpectedSha,[Parameter(Mandatory=$true)][string]$ArtifactZip,[Parameter(Mandatory=$true)][string]$CaptureId)
$ErrorActionPreference='Stop'
if($ExpectedSha -notmatch '^[a-f0-9]{40}$' -or $CaptureId -notmatch '^pc-kliniklab-native-cc0-[a-z0-9-]{10,}$'){throw 'Invalid SHA or unique capture ID'}
$run=[IO.Path]::GetFullPath($EvidenceDir);$release=Join-Path $run 'Release';$captures=Join-Path $run 'Captures'
if(Test-Path -LiteralPath $release){throw 'Immutable exported-app evidence path reused'}
New-Item -ItemType Directory -Path $release,$captures -Force|Out-Null
$out=Join-Path $captures 'godot-owner-pc-result.json'
$script:r=[ordered]@{schemaVersion=8;sourceGitSHA=$ExpectedSha;nativeSceneMode='native-exported-cc0';status='EVIDENCE_INCOMPLETE';nativeSourceSubmissionVerified=$false;nativeCaseWorkflowVerified=$false;nativeImagePresent=$false;nativeAngledImagePresent=$false;thirdImagePresent=$false;nativeScreenshotFile=$null;nativeAngledScreenshotFile=$null;thirdScreenshotFile=$null;godotProcessGPUCorroborated=$false;gpuAdapterLuidMatchedToNvidia=$false;process3DPositiveRtx5060DistinctPeriods=0;rtx5060DxgiLuid=$null;godotPid=$null;imageIndependentPixelReviewAccepted=$false;errors=@();blockers=@()}
function Block([string]$s){$script:r.blockers=@($script:r.blockers)+$s}
$session=$null
try{
 Expand-Archive -LiteralPath $ArtifactZip -DestinationPath $release -ErrorAction Stop
 $exe=Join-Path $release 'KlinikLab.exe'
 $manifest=Get-Content (Join-Path $release 'native-build-manifest.json') -Raw|ConvertFrom-Json
 $checksum=((Get-Content (Join-Path $release 'SHA256SUMS.txt') -Raw) -split '\s+')[0].ToLowerInvariant()
 $actual=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
 if($actual -ne $checksum -or $manifest.originalSourceGitSHA -ne $ExpectedSha -or $manifest.nativeCc0WholeClinicStaticEnvironment -ne $true -or $manifest.nativeCases -ne 6){throw 'Exported EXE checksum/source/CC0 identity failed'}
 $script:r.nativeSourceSubmissionVerified=$true
 $script:r.exportedExeSHA256=$actual
 $env:KLINIKLAB_PC_CAPTURE_DIR=$captures
 . (Join-Path $PSScriptRoot 'sr1c-private-desktop.ps1')
 $session=Start-KLPrivateDesktopExportedApp -Executable $exe -WorkingDir $release -LogPath (Join-Path $captures 'native-exported-app.log') -CaptureId $CaptureId
 $script:r.godotPid=[int]$session.Pid
 Get-Process -Id $session.Pid -ErrorAction Stop|Out-Null
 Add-Type -Path (Join-Path $PSScriptRoot 'sr1c-dxgi-luid.cs') -ErrorAction Stop
 . (Join-Path $PSScriptRoot 'sr1c-pdh-filter.ps1')
 Start-Sleep -Seconds 3
 $warnings=@()
 $snapshots=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 34 -ErrorAction Continue -ErrorVariable +warnings)
 $parsed=ConvertTo-KLGodotGpu3DRows -Snapshots $snapshots -GodotPid ([int]$session.Pid) -GetEngineLuid {param($path) [KlinikLab.DxgiEvidence]::FromGpuEnginePath([string]$path)}
 $rows=@($parsed.rows)
 [IO.File]::WriteAllText((Join-Path $captures 'godot-gpu-3d-counters.json'),(ConvertTo-Json -InputObject $rows -Depth 12),(New-Object Text.UTF8Encoding($false)))
 $positive=@($rows|Where-Object{$_.usable -eq $true -and $_.utilizationPercent -gt 0.05})
 $nvidia=@([KlinikLab.DxgiEvidence]::Enumerate()|Where-Object{$_.vendorId -eq 4318 -and $_.name -match '(?i)RTX\s*5060'})
 if($nvidia.Count -eq 1){
  $script:r.rtx5060DxgiLuid=[string]$nvidia[0].luid
  $matched=@($positive|Where-Object{$_.engineLuid -eq $script:r.rtx5060DxgiLuid})
  $script:r.process3DPositiveRtx5060DistinctPeriods=@($matched|Select-Object -ExpandProperty utc -Unique).Count
  $script:r.gpuAdapterLuidMatchedToNvidia=($script:r.process3DPositiveRtx5060DistinctPeriods -ge 3)
 }else{Block 'RTX5060 DXGI adapter not uniquely identified'}
 if(-not $script:r.gpuAdapterLuidMatchedToNvidia){Block 'Insufficient independent positive EXE PID RTX5060 3D LUID periods'}
 $dir=Join-Path $captures $CaptureId
 $file=Join-Path $dir 'exported-app-native-capture.json'
 $deadline=[DateTime]::UtcNow.AddSeconds(75)
 while(-not(Test-Path -LiteralPath $file -PathType Leaf) -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 500}
 if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw 'Embedded actual app did not publish native capture JSON'}
 $native=Get-Content -LiteralPath $file -Raw|ConvertFrom-Json
 $script:r.renderingMethod=[string]$native.renderingMethod
 $script:r.renderingDriver=[string]$native.renderingDriver
 $script:r.videoAdapterName=[string]$native.videoAdapterName
 $script:r.videoAdapterVendor=[string]$native.videoAdapterVendor
 $script:r.nativeCaseWorkflowVerified=($native.jobId -eq $CaptureId -and $native.sourceGitSHA -eq $ExpectedSha -and [int]$native.godotPID -eq [int]$session.Pid -and (@($native.originalSixFDI) -join ',') -eq '16,36,11,26,48,46' -and [int]$native.clinicMeshInstances -ge 20 -and [int]$native.trayMeshInstances -ge 1)
 if(-not $script:r.nativeCaseWorkflowVerified){Block 'Actual app PID/CC0/six FDI contract invalid'}
 if($native.renderingDriver -ne 'vulkan' -or $native.renderingMethod -ne 'forward_plus' -or $native.videoAdapterName -notmatch '(?i)RTX\s*5060' -or $native.videoAdapterVendor -notmatch '(?i)NVIDIA'){Block 'Actual exported app not NVIDIA RTX5060 Vulkan Forward+'}
 $expectedNames=@('overview-fdi16.png','practical-fdi36.png','practical-fdi26.png')
 $expectedCases=@('molar','endo','crown')
 $expectedFDI=@('16','36','26')
 $exportNames=@('kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png','kliniklab-exported-fdi26-practical.png')
 $images=@($native.images)
 if($images.Count -ne 3){Block 'Actual exported app returned wrong PNG count'}
 for($i=0;$i -lt [Math]::Min(3,$images.Count);$i++){
  $img=$images[$i]
  if($img.file -ne $expectedNames[$i] -or $img.caseId -ne $expectedCases[$i] -or $img.fdi -ne $expectedFDI[$i]){Block ('PNG case/FDI mismatch #'+$i);continue}
  $p=Join-Path $dir ([string]$img.file)
  if(-not(Test-Path -LiteralPath $p -PathType Leaf)){Block ('Missing original PNG '+$img.file);continue}
  $bytes=[IO.File]::ReadAllBytes($p)
  $digest=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
  if($bytes.Length -lt 10000 -or [BitConverter]::ToString($bytes,0,8) -ne '89-50-4E-47-0D-0A-1A-0A' -or $digest -ne [string]$img.sha256 -or [int]$img.width -lt 900 -or [int]$img.height -lt 600){Block ('Invalid PNG/size/hash '+$img.file);continue}
  Copy-Item -LiteralPath $p -Destination (Join-Path $captures $exportNames[$i]) -ErrorAction Stop
  if($i -eq 0){$script:r.nativeImagePresent=$true;$script:r.nativeScreenshotFile=$exportNames[$i]}
  elseif($i -eq 1){$script:r.nativeAngledImagePresent=$true;$script:r.nativeAngledScreenshotFile=$exportNames[$i]}
  else{$script:r.thirdImagePresent=$true;$script:r.thirdScreenshotFile=$exportNames[$i]}
 }
 $script:r.godotProcessGPUCorroborated=($script:r.gpuAdapterLuidMatchedToNvidia -and $native.renderingDriver -eq 'vulkan' -and $native.videoAdapterName -match '(?i)RTX\s*5060')
 if($script:r.nativeImagePresent -and $script:r.nativeAngledImagePresent -and $script:r.thirdImagePresent -and $script:r.nativeCaseWorkflowVerified -and $script:r.godotProcessGPUCorroborated){$script:r.status='ORIGINAL_EXPORTED_APP_THREE_PNGS_PENDING_INDEPENDENT_PIXEL_REVIEW'}
}catch{
 Block ('Owner-PC exported app exception: '+$_.Exception.Message)
 $script:r.errors=@($script:r.errors)+[string]$_.Exception.ToString()
}finally{
 if($null -ne $session){Stop-KLPrivateDesktopGodot -Session $session}
 [IO.File]::WriteAllText($out,((ConvertTo-Json -InputObject $script:r -Depth 16)+[Environment]::NewLine),(New-Object Text.UTF8Encoding($false)))
 Remove-Item Env:KLINIKLAB_PC_CAPTURE_DIR -ErrorAction SilentlyContinue
}
Write-Host ('SR14 exported EXE evidence status '+$script:r.status)
