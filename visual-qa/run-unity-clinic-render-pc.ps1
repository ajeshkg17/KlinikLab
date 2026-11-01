# Real Unity clinic GPU test: a NEW WinSta0 private desktop, never foreground.
param([Parameter(Mandatory=$true)][string]$SourceProbeRun,
      [Parameter(Mandatory=$true)][string]$RepositoryPath,
      [string]$UnityExe)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'Windows owner PC only'}
$src=[IO.Path]::GetFullPath($SourceProbeRun)
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$sha='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$project=Join-Path $src 'UnityProject'
$import=Join-Path $src 'unity-source-only-result.json'
$pinned=Join-Path $src 'PinnedSource'
if(-not(Test-Path $import) -or -not(Test-Path (Join-Path $pinned 'app.js'))){
 throw 'Pass a successfully completed unique Unity source probe run'}
$m=Get-Content $import -Raw|ConvertFrom-Json
if($m.sourceGitSHA -cne $sha -or $m.status -cne 'UNITY_SOURCE_IMPORTED_SCENE_SAVED_NO_GPU_RENDER' -or [int]$m.importedBeforeTriangles -ne 14856 -or [int]$m.importedAfterTriangles -ne 14936){
 throw 'Source geometry parity gate failed'}
if(-not $UnityExe){
 $found=@(Get-ChildItem 'C:\Program Files\Unity\Hub\Editor' -Directory -ErrorAction Stop|ForEach-Object{Join-Path $_.FullName 'Editor\Unity.exe'}|Where-Object{Test-Path $_})
 if($found.Count -ne 1){throw 'Specify -UnityExe when installed Unity Editor count differs from one'}
 $UnityExe=$found[0]
}
$UnityExe=[IO.Path]::GetFullPath($UnityExe)
if(-not(Test-Path -LiteralPath $UnityExe) -or [IO.Path]::GetFileName($UnityExe) -cne 'Unity.exe'){throw 'Unity Editor executable not found'}
if(Get-Process Unity -ErrorAction SilentlyContinue){throw 'Unity Editor running already; never compete or activate foreground'}
$dir=Join-Path $env:LOCALAPPDATA 'KlinikLabUnityClinic'
New-Item -ItemType Directory -Force $dir|Out-Null
$id=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,10)
$run=Join-Path $dir $id
New-Item -ItemType Directory -Path $run -ErrorAction Stop|Out-Null
$cap=Join-Path $run 'Captures'
New-Item -ItemType Directory -Path $cap -ErrorAction Stop|Out-Null
$cases=Join-Path $run 'original-cases.json'
$native=Join-Path $cap 'unity-whole-clinic-native-report.json'
$log=Join-Path $run 'unity-native-private-desktop.log'
$node=(Get-Command node.exe -ErrorAction Stop).Source
$session=$null;$proc=$null
try{
 & $node (Join-Path $repo 'visual-qa\sr1d-export-native-cases.mjs') "--source-dir=$pinned" "--expected-sha=$sha" "--output=$cases"
 if($LASTEXITCODE -ne 0){throw 'Original case/station export failed'}
 $data=Get-Content $cases -Raw|ConvertFrom-Json
 if($data.sourceGitSHA -cne $sha -or [int]$data.caseCount -ne 6 -or [int]$data.stationCount -ne 7){throw 'Native cases not source-exact'}
 $target=Join-Path $project 'Assets\Editor\KlinikLabUnityClinicRender.cs'
 if(Test-Path $target){throw 'Refusing to overwrite previously attempted Unity clinic render script'}
 Copy-Item -LiteralPath (Join-Path $repo 'visual-qa\unity-probe\KlinikLabUnityClinicRender.cs') -Destination $target -ErrorAction Stop
 . (Join-Path $repo 'visual-qa\sr1c-private-desktop.ps1')
 . (Join-Path $repo 'visual-qa\sr1c-pdh-filter.ps1')
 Add-Type -Path (Join-Path $repo 'visual-qa\sr1c-dxgi-luid.cs') -ErrorAction Stop
 $station=[KlinikLab.PrivateDesktop]::GetProcessWindowStation()
 if($station -eq [IntPtr]::Zero){throw 'No WinSta0 station'}
 $stationName=New-Object System.Text.StringBuilder 256
 $needed=0
 if(-not [KlinikLab.PrivateDesktop]::GetUserObjectInformation($station,2,$stationName,$stationName.Capacity*2,[ref]$needed) -or $stationName.ToString() -cne 'WinSta0'){
  throw 'Not confirmed WinSta0; no visible desktop fallback'}
 $name='KL_UNITY_'+[Guid]::NewGuid().ToString('N').Substring(0,12)
 $ptr=[Runtime.InteropServices.Marshal]::StringToHGlobalUni($name)
 try{$desktop=[KlinikLab.PrivateDesktop]::CreateDesktopRaw($ptr,[IntPtr]::Zero,[IntPtr]::Zero,[uint32]0,[uint32]0xC3,[IntPtr]::Zero)}
 finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)}
 if($desktop -eq [IntPtr]::Zero){throw 'Private desktop creation failed; no foreground fallback'}
 $session=[pscustomobject]@{desktop=$desktop;handle=[IntPtr]::Zero;pid=0}
 $si=New-Object KlinikLab.PrivateDesktop+STARTUPINFO
 $si.cb=[Runtime.InteropServices.Marshal]::SizeOf([type][KlinikLab.PrivateDesktop+STARTUPINFO])
 $si.lpDesktop='WinSta0\'+$name
 $si.dwFlags=1;$si.wShowWindow=4
 $pi=New-Object KlinikLab.PrivateDesktop+PROCESS_INFORMATION
 $cmd='"'+$UnityExe+'" -batchmode -quit -force-d3d11 -projectPath "'+$project+'" -executeMethod KlinikLabUnityClinicRender.Run -klCaptureDir "'+$cap+'" -klClinicResult "'+$native+'" -klCaseManifest "'+$cases+'" -logFile "'+$log+'"'
 $sb=New-Object System.Text.StringBuilder($cmd)
 $started=[KlinikLab.PrivateDesktop]::CreateProcess($UnityExe,$sb,[IntPtr]::Zero,[IntPtr]::Zero,$false,[uint32]0,[IntPtr]::Zero,$project,[ref]$si,[ref]$pi)
 if(-not $started){throw "Private desktop Unity CreateProcess failed Win32=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
 $session.handle=$pi.hProcess;$session.pid=[int]$pi.dwProcessId
 if($pi.hThread -ne [IntPtr]::Zero){[void][KlinikLab.PrivateDesktop]::CloseHandle($pi.hThread)}
 $proc=[System.Diagnostics.Process]::GetProcessById($session.pid)
 Start-Sleep -Seconds 4
 $snaps=@();$pdhErrors=@()
 try{$snaps=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 34 -ErrorAction Continue -ErrorVariable +pdhErrors)}
 catch{$pdhErrors+=($_.Exception.Message)}
 $parsed=ConvertTo-KLGodotGpu3DRows -Snapshots $snaps -GodotPid ([int]$session.pid) -GetEngineLuid {param($path) [KlinikLab.DxgiEvidence]::FromGpuEnginePath([string]$path)}
 $adapters=@([KlinikLab.DxgiEvidence]::Enumerate())
 $nvidia=@($adapters|Where-Object{$_.vendorId -eq 4318 -and $_.name -match '(?i)RTX\s*5060'})
 $luids=@($nvidia|ForEach-Object{$_.luid})
 $validPeriods=@($parsed.validRows|Where-Object{$_.utilizationPercent -gt 0 -and $luids -contains $_.engineLuid}|Select-Object -ExpandProperty utc -Unique)
 if(-not $proc.WaitForExit(180000)){throw 'Unity render exceeded bounded 180-second post-sampling period'}
 $proc.Refresh()
 if($proc.ExitCode -ne 0){throw "Unity native render failed exit $($proc.ExitCode); logs at $log"}
 if(-not(Test-Path $native)){throw 'No native Unity GPU render JSON'}
 $r=Get-Content $native -Raw|ConvertFrom-Json
 if([int]$r.nativeUnityPid -ne $session.pid -or $r.status -cne 'UNITY_NATIVE_WHOLE_CLINIC_PIXELS_GPU_ATTRIBUTION_PENDING' -or $r.originalSourceSHA -cne $sha -or [int]$r.beforeTriangles -ne 14856 -or [int]$r.cutTriangles -ne 14936 -or [int]$r.caseCount -ne 6 -or [int]$r.stationCount -ne 7 -or [int]$r.orbitRenderFrames -lt 39){
  throw 'Original source/cases/native orbit mismatch'}
 $pngs=@('unity-whole-clinic-overview.png','unity-whole-clinic-angled.png','unity-fdi16-cut-occlusal.png')
 foreach($file in $pngs){
  $p=Join-Path $cap $file
  if(-not(Test-Path $p) -or (Get-Item $p).Length -lt 25000){throw "Native Unity PNG absent/tiny: $file"}
  $hash=(Get-FileHash $p -Algorithm SHA256).Hash.ToLowerInvariant()
  $expected=switch($file){'unity-whole-clinic-overview.png'{$r.overviewSHA256} 'unity-whole-clinic-angled.png'{$r.angledSHA256} 'unity-fdi16-cut-occlusal.png'{$r.occlusalSHA256}}
  if($hash -cne $expected){throw "Unity PNG bytes do not match native hash: $file"}
 }
 $gpuOK=[bool]($validPeriods.Count -ge 5 -and $r.graphicsDeviceName -match '(?i)RTX\s*5060' -and $r.graphicsDeviceType -eq 'Direct3D11' -and [int]$r.graphicsDeviceVendorID -eq 4318)
 $gpu=[ordered]@{unityPid=$session.pid;dxgiAdapters=$adapters;periods=@($parsed.periods);rows=@($parsed.rows);positiveUnityPidRtx5060DistinctPeriods=$validPeriods.Count;pdhErrors=@($pdhErrors|ForEach-Object{[string]$_})}
 [IO.File]::WriteAllText((Join-Path $cap 'unity-gpu-pdh.json'),(ConvertTo-Json -InputObject $gpu -Depth 12),[Text.UTF8Encoding]::new($false))
 $result=[ordered]@{status=$(if($gpuOK){'NATIVE_PIXELS_GPU_CORROBORATED_PENDING_PIXEL_REVIEW'}else{'EVIDENCE_INCOMPLETE'});unityPid=$session.pid;sourceSHA=$sha;originalNativePngs=$pngs;originalPngHashesVerified=$true;privateDesktopCreated=$true;foregroundActivationRequested=$false;headlessDummyRendererUsed=$false;positiveUnityPidRtx5060DistinctPeriods=$validPeriods.Count;processGpuCorroborated=$gpuOK;imageIndependentPixelReviewAccepted=$false;fullKlinikLabApplicationMigrated=$false;clinicalAccuracyVerified=$false;questVerified=$false}
 [IO.File]::WriteAllText((Join-Path $cap 'unity-owner-pc-result.json'),(ConvertTo-Json -InputObject $result -Depth 8),[Text.UTF8Encoding]::new($false))
 Write-Host "UNITY_CLINIC_GPU_EVIDENCE: $($result.status), PID $($session.pid), GPU periods $($validPeriods.Count)"
}finally{
 if($session){
  if($session.handle -ne [IntPtr]::Zero){
   if($proc -and -not $proc.HasExited){[void][KlinikLab.PrivateDesktop]::TerminateProcess($session.handle,[uint32]1)}
   [void][KlinikLab.PrivateDesktop]::CloseHandle($session.handle)
  }
  if($session.desktop -ne [IntPtr]::Zero){[void][KlinikLab.PrivateDesktop]::CloseDesktop($session.desktop)}
 }
 Write-Host "Original unique Unity run retained: $run"
}
