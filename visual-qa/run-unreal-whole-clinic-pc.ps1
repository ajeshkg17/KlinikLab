# SR1J UE5.8 schematic WHOLE-CLINIC source-build/native GPU rendering.
# Immutable, separate run; mode Render refuses repeating an attempted run.
# No foreground focus, manual HighResShot, Quest or Godot watcher interaction.
[CmdletBinding()]
param([ValidateSet('Prepare','Render')][string]$Mode='Prepare',
 [Parameter(Mandatory=$true)][string]$RepositoryPath,
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [string]$EngineRoot='C:\Program Files\Epic Games\UE_5.8')
$ErrorActionPreference='Stop'
$sha='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$run=[IO.Path]::GetFullPath($EvidenceDir)
$parent=Join-Path $env:LOCALAPPDATA 'KlinikLabEngineComparison'
$parentPrefix=[IO.Path]::GetFullPath($parent).TrimEnd('\')+'\'
if(-not $run.StartsWith($parentPrefix,[StringComparison]::OrdinalIgnoreCase)){
 throw 'Native UE run must be in independent local KlinikLabEngineComparison root'}
$id=Split-Path -Leaf $run
if($id -cnotmatch '^unreal-clinic-[0-9]{8}-[0-9]{6}-[a-f0-9]{10}$'){
 throw 'Unique exact UE clinic run ID required; never reuse old jobs'}
if($env:OS -ne 'Windows_NT'){throw 'Windows owner PC only'}
$ue=[IO.Path]::GetFullPath($EngineRoot)
$editor=Join-Path $ue 'Engine\Binaries\Win64\UnrealEditor.exe'
$cmdEditor=Join-Path $ue 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$versionFile=Join-Path $ue 'Engine\Build\Build.version'
foreach($p in @($editor,$cmdEditor,$versionFile)){
 if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw 'Unreal Engine 5.8 editor absent: '+$p}
}
$version=Get-Content $versionFile -Raw|ConvertFrom-Json
if($version.MajorVersion -ne 5 -or $version.MinorVersion -ne 8){
 throw 'Pinned native source experiment requires UE5.8, not another Unreal version'}
$source=Join-Path $parent ($id+'-source')
$project=Join-Path $run 'Project\KlinikLab_SR1B_Local.uproject'
$cases=Join-Path $run 'original-cases-stations.json'
$stage=Join-Path $run 'unreal-whole-clinic-build.json'
$cap=Join-Path $run 'Captures'
$codeSha=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $codeSha -notmatch '^[a-f0-9]{40}$'){throw 'Source code checkout SHA unavailable'}
if($Mode -eq 'Prepare'){
 if((Test-Path $run) -or (Test-Path $source)){throw 'Never overwrite/reuse a previous native UE whole-clinic run'}
 New-Item -ItemType Directory -Path $parent -Force|Out-Null
 & git -C $repo cat-file -e ($sha+'^{commit}')
 if($LASTEXITCODE -ne 0){throw 'Original source commit not available locally'}
 & git -C $repo worktree add --detach $source $sha
 if($LASTEXITCODE -ne 0){throw 'Pinned original UE source worktree failed'}
 $builder=Join-Path $source 'visual-qa\sr1b-run-local-kliniklab.ps1'
 $buildArgs='-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+
  $builder+'" -Mode Build -EvidenceDir "'+$run+'" -ExpectedSha '+$sha+' -EngineRoot "'+$ue+'"'
 $outLog=Join-Path $run 'original-source-build-stdout.log'
 $errLog=Join-Path $run 'original-source-build-stderr.log'
 $p=Start-Process -FilePath 'powershell.exe' -ArgumentList $buildArgs -PassThru -NoNewWindow -RedirectStandardOutput $outLog -RedirectStandardError $errLog
 if(-not $p.WaitForExit(1800000)){
  & taskkill.exe /PID $p.Id /T /F | Out-Null
  throw 'Original Unreal source build exceeded 1800s bound; preserve unique attempt and logs'
 }
 $p.Refresh()
 if($p.ExitCode -ne 0){throw 'Original UE procedural tooth level build failed; preserve run and original logs'}
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 & $node (Join-Path $repo 'visual-qa\sr1d-export-native-cases.mjs') "--source-dir=$source" "--output=$cases" "--expected-sha=$sha"
 if($LASTEXITCODE -ne 0){throw 'Original six cases/seven stations export failed'}
 $env:KLINIKLAB_SR1J_EVIDENCE_DIR=$run
 $env:KLINIKLAB_SR1J_CASES=$cases
 $script=Join-Path $repo 'visual-qa\unreal-whole-clinic-stage.py'
 $args=@(('"' + $project + '"'),('-ExecutePythonScript="' + $script + '"'),'-d3d12','-log','-unattended')
 $proc=Start-Process -FilePath $cmdEditor -ArgumentList $args -PassThru -NoNewWindow
 if(-not $proc.WaitForExit(1200000)){
  & taskkill.exe /PID $proc.Id /T /F | Out-Null
  throw 'Unreal source-derived whole clinic actor staging exceeded 1200s; original evidence retained'
 }
 $proc.Refresh()
 if(-not(Test-Path $stage)){throw 'No source-derived UE whole clinic stage report; original logs retained'}
 $s=Get-Content $stage -Raw|ConvertFrom-Json
 if($s.sourceSHA -cne $sha -or $s.status -cne 'UNREAL_WHOLE_CLINIC_SCENE_SAVED_NOT_GPU_RENDERED' -or
 $s.sixSourceCasesVerified -ne $true -or $s.sevenStationsVerified -ne $true -or
 $s.sourceTeethRetainedAfterLevelReload -ne $true -or
 [int]$s.wholeClinicObjectCount -lt 35){
 throw "UE whole-clinic stage incomplete. Editor exit $($proc.ExitCode); do not claim native render"}
 Write-Host "UNREAL_WHOLE_CLINIC_SCENE_PREPARED_NO_GPU: $run"
 exit 0
}
# Render phase: a unique, previously prepared *never rendered* scene.
if(-not(Test-Path -LiteralPath $run -PathType Container) -or -not(Test-Path -LiteralPath $stage)){
 throw 'Run Prepare in a fresh unique folder before Render'}
$b=Get-Content $stage -Raw|ConvertFrom-Json
if($b.sourceSHA -cne $sha -or
 $b.status -cne 'UNREAL_WHOLE_CLINIC_SCENE_SAVED_NOT_GPU_RENDERED' -or
 $b.sourceTeethRetainedAfterLevelReload -ne $true){throw 'Source stage incomplete: refuse render'}
if(-not(Test-Path (Join-Path $run 'Project\Content\Maps\L_KlinikLab_WholeClinic.umap'))){
 throw 'Saved UE native whole-clinic map absent'}
if(Get-Process UnrealEditor -ErrorAction SilentlyContinue){
 throw 'Unreal Editor is already running: no concurrent or visible desktop fallback'}
$attempt=Join-Path $run 'unreal-private-render-attempt.json'
# Set an atomic CreateNew marker: NEVER reuse uncertain/failed render attempt.
if(Test-Path -LiteralPath $attempt){throw 'Unreal render already attempted; use a new unique run'}
$payload=(ConvertTo-Json -InputObject ([ordered]@{runId=$id;codeSHA=$codeSha;
 sourceSHA=$sha;timeUTC=[DateTime]::UtcNow.ToString('o');
 mode='PRIVATE_DESKTOP_D3D12';neverReuseId=$true}) -Compress)
$bytes=[Text.UTF8Encoding]::new($false).GetBytes($payload+[Environment]::NewLine)
$f=[IO.File]::Open($attempt,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try{$f.Write($bytes,0,$bytes.Length);$f.Flush()}finally{$f.Dispose()}
New-Item -ItemType Directory -Path $cap -Force|Out-Null
$ownerPath=Join-Path $cap 'unreal-owner-pc-result.json'
$native=Join-Path $cap 'unreal-whole-clinic-native-report.json'
$engineLog=Join-Path $run 'unreal-native-private-editor.log'
$session=$null;$proc=$null
$owner=[ordered]@{schemaVersion=1;status='EVIDENCE_INCOMPLETE';sourceSHA=$sha;
 codeSHA=$codeSha;unrealPid=0;privateDesktopCreated=$false;
 nativeOriginalThreePngs=@();sourceTopologyVerified=$true;caseStationVerified=$true;
 rhiD3D12Rtx5060LogMatched=$false;processRtx5060LuidMatched=$false;
 distinctPositiveUnrealPid3DPeriods=0;pngSha256Verified=$false;
 processGpuCorroborated=$false;pixelIndependentlyReviewed=$false;
 fullKlinikLabApplicationMigrated=$false;clinicalAccuracyVerified=$false;
 questVerified=$false;foregroundActivationRequested=$false;errors=@()}
try {
 # Known WinSta0 Win32 CreateDesktopW raw UTF16 helper from existing Godot
 # evidence pipeline; no foreground switch or keyboard input.
 . (Join-Path $repo 'visual-qa\sr1c-private-desktop.ps1')
 . (Join-Path $repo 'visual-qa\sr1c-pdh-filter.ps1')
 Add-Type -Path (Join-Path $repo 'visual-qa\sr1c-dxgi-luid.cs') -ErrorAction Stop
 $station=[KlinikLab.PrivateDesktop]::GetProcessWindowStation()
 if($station -eq [IntPtr]::Zero){throw 'No interactive WinSta0 workstation'}
 $name=New-Object Text.StringBuilder 256
 $needed=0
 $ok=[KlinikLab.PrivateDesktop]::GetUserObjectInformation($station,2,$name,$name.Capacity*2,[ref]$needed)
 if(-not $ok -or $name.ToString() -cne 'WinSta0'){
  throw 'Not a verified WinSta0 workstation; never launch UE on user desktop'}
 $deskName='KL_SR1J_UE_'+[guid]::NewGuid().ToString('N').Substring(0,10)
 $ptr=[Runtime.InteropServices.Marshal]::StringToHGlobalUni($deskName)
 try{
  $desktop=[KlinikLab.PrivateDesktop]::CreateDesktopRaw($ptr,[IntPtr]::Zero,
   [IntPtr]::Zero,[uint32]0,[uint32]0xC3,[IntPtr]::Zero)
 }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)}
 if($desktop -eq [IntPtr]::Zero){throw 'CreateDesktopRaw failed; no visible foreground fallback'}
 $session=[pscustomobject]@{desktop=$desktop;handle=[IntPtr]::Zero;pid=0}
 $si=New-Object KlinikLab.PrivateDesktop+STARTUPINFO
 $si.cb=[Runtime.InteropServices.Marshal]::SizeOf([type][KlinikLab.PrivateDesktop+STARTUPINFO])
 $si.lpDesktop='WinSta0\'+$deskName
 $si.dwFlags=1;$si.wShowWindow=4
 $pi=New-Object KlinikLab.PrivateDesktop+PROCESS_INFORMATION
 # Unreal's official -ExecutePythonScript launch AUTO-QUITS when Python
 # returns; callbacks would never render. Use the persistent project-local
 # Content/Python/init_unreal.py startup hook instead (Epic 5.8 docs).
 $env:KLINIKLAB_SR1J_EVIDENCE_DIR=$run
 $env:KLINIKLAB_SR1J_CAPTURE_ENABLED='1'
 $python=Join-Path (Split-Path -Parent $project) 'Content\Python'
 New-Item -ItemType Directory -Path $python -Force|Out-Null
 $initDest=Join-Path $python 'init_unreal.py'
 $captureDest=Join-Path $python 'kl_sr1j_capture.py'
 if((Test-Path $initDest) -or (Test-Path $captureDest)){
  throw 'Private native UE Editor startup hook already exists; never rerun this attempt'
 }
 Copy-Item -LiteralPath (Join-Path $repo 'visual-qa\unreal-whole-clinic-init.py') -Destination $initDest -ErrorAction Stop
 Copy-Item -LiteralPath (Join-Path $repo 'visual-qa\unreal-whole-clinic-capture.py') -Destination $captureDest -ErrorAction Stop
 $commandLine='"'+$editor+'" "'+$project+'" /Game/Maps/L_KlinikLab_WholeClinic -d3d12 -log -NoSplash'+
  ' -abslog="'+$engineLog+'"'
 $command=New-Object Text.StringBuilder($commandLine)
 $created=[KlinikLab.PrivateDesktop]::CreateProcess($editor,$command,
  [IntPtr]::Zero,[IntPtr]::Zero,$false,[uint32]0,[IntPtr]::Zero,
  (Split-Path -Parent $project),[ref]$si,[ref]$pi)
 if(-not $created){throw "Private UnrealEditor CreateProcess failed Win32=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
 $session.handle=$pi.hProcess
 $session.pid=[int]$pi.dwProcessId
 if($pi.hThread -ne [IntPtr]::Zero){[void][KlinikLab.PrivateDesktop]::CloseHandle($pi.hThread)}
 $owner.unrealPid=$session.pid
 $owner.privateDesktopCreated=$true
 $proc=[System.Diagnostics.Process]::GetProcessById($session.pid)
 # Wait until the REAL Unreal Editor Python startup hook has loaded the
 # whole clinic and registered its camera tick. No pre-start GPU sample claims.
 $readyFile=Join-Path $cap 'unreal-native-capture-ready.json'
 $readyFound=$false
 for($attempt=0;$attempt -lt 90;$attempt++){
  if(Test-Path -LiteralPath $readyFile){$readyFound=$true;break}
  $proc.Refresh()
  if($proc.HasExited){throw 'Private UnrealEditor terminated before native capture-ready signal'}
  Start-Sleep -Seconds 1
 }
 if(-not $readyFound){throw 'Unreal native camera startup callback not ready within 90s'}
 $ready=Get-Content -LiteralPath $readyFile -Raw|ConvertFrom-Json
 if([int]$ready.unrealPid -ne $session.pid -or $ready.sourceSHA -cne $sha -or
  $ready.status -cne 'NATIVE_UNREAL_EDITOR_CALLBACK_REGISTERED'){
  throw 'Native Unreal Editor ready marker PID/source identity mismatch'
 }
 # Exactly ONE persistent Windows PDH GPU Engine wildcard query, 1s intervals.
 $snapshots=@();$warnings=@()
 try{
  $snapshots=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 34 -ErrorAction Continue -ErrorVariable +warnings)
 }catch{$warnings+=($_.Exception.Message)}
 $parsed=ConvertTo-KLGodotGpu3DRows -Snapshots $snapshots -GodotPid ([int]$session.pid) -GetEngineLuid {param($p) [KlinikLab.DxgiEvidence]::FromGpuEnginePath([string]$p)}
 $adapters=@([KlinikLab.DxgiEvidence]::Enumerate())
 $nvidia=@($adapters|Where-Object{$_.vendorId -eq 4318 -and $_.name -match '(?i)RTX\s*5060'})
 $luids=@($nvidia|ForEach-Object{$_.luid})
 $periods=@($parsed.validRows|Where-Object{$_.utilizationPercent -gt 0.05 -and $luids -contains $_.engineLuid}|Select-Object -ExpandProperty utc -Unique)
 $gpuEvidence=[ordered]@{schemaVersion=1;unrealPid=$session.pid;query='one persistent 1Hz WinPS GPU Engine(*)';dxgiAdapters=$adapters;
 positiveUnrealPidRtx5060DistinctPeriods=$periods.Count;periods=@($parsed.periods);
 rows=@($parsed.rows);warnings=@($warnings|ForEach-Object{[string]$_})}
 [IO.File]::WriteAllText((Join-Path $cap 'unreal-gpu-pdh.json'),
  (ConvertTo-Json -InputObject $gpuEvidence -Depth 12),[Text.UTF8Encoding]::new($false))
 $owner.distinctPositiveUnrealPid3DPeriods=$periods.Count
 if(-not $proc.WaitForExit(150000)){throw 'Unreal clinic auto renderer exceeded post-PDH timeout'}
 $proc.Refresh()
 if(-not(Test-Path $native)){throw "Unreal Editor produced no real native report; exit $($proc.ExitCode)"}
 $render=Get-Content -LiteralPath $native -Raw | ConvertFrom-Json
 if($render.sourceSHA -cne $sha -or [int]$render.unrealPid -ne $session.pid -or
 [int]$render.sourceTrianglesBefore -ne 14856 -or [int]$render.sourceTrianglesAfter -ne 14936 -or
 $render.status -cne 'UNREAL_NATIVE_THREE_IMAGES_PENDING_PID_DXGI_GPU_AND_PIXEL_REVIEW' -or
 [double]$render.elapsedSeconds -lt 40 -or [int]$render.orbitViewportTicks -lt 30){
  throw 'Native screenshot/report, source parity or real camera orbit incomplete'}
 $files=@('unreal-whole-clinic-overview.png','unreal-whole-clinic-angled.png',
  'unreal-fdi16-cut-occlusal.png')
 foreach($name in $files){
  $p=Join-Path $cap $name
  if(-not(Test-Path $p -PathType Leaf) -or (Get-Item $p).Length -lt 25000){
   throw 'Original UE screenshot absent or too small: '+$name}
  $bytes=[IO.File]::ReadAllBytes($p)
  if([BitConverter]::ToString($bytes,0,8) -cne '89-50-4E-47-0D-0A-1A-0A'){
   throw 'Original UE image not a PNG: '+$name}
  $digest=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
  $reported=[string]$render.originalNativePngs.$name.sha256
  if($digest -cne $reported){throw 'Actual UE PNG SHA mismatch: '+$name}
 }
 $owner.nativeOriginalThreePngs=$files
 $owner.pngSha256Verified=$true
 if(Test-Path $engineLog){
  $logText=Get-Content $engineLog -Raw
  $owner.rhiD3D12Rtx5060LogMatched=($logText -match '(?i)LogD3D12RHI.*RTX\s*5060')
 }
 $owner.processRtx5060LuidMatched=($periods.Count -ge 5 -and $nvidia.Count -eq 1)
 $owner.processGpuCorroborated=($owner.rhiD3D12Rtx5060LogMatched -and
  $owner.processRtx5060LuidMatched -and $owner.pngSha256Verified)
 if($owner.processGpuCorroborated){
  $owner.status='UNREAL_THREE_NATIVE_PIXELS_AND_PID_GPU_PENDING_DIRECT_PIXEL_REVIEW'
 }
}catch{
 $owner.errors=@([string]$_.Exception.Message)
}finally{
 if($session){
  if($session.handle -ne [IntPtr]::Zero){
   if($proc -and -not $proc.HasExited){
    [void][KlinikLab.PrivateDesktop]::TerminateProcess($session.handle,[uint32]1)
   }
   [void][KlinikLab.PrivateDesktop]::CloseHandle($session.handle)
  }
  if($session.desktop -ne [IntPtr]::Zero){
   [void][KlinikLab.PrivateDesktop]::CloseDesktop($session.desktop)
  }
 }
 [IO.File]::WriteAllText($ownerPath,
  (ConvertTo-Json -InputObject $owner -Depth 10)+[Environment]::NewLine,
  [Text.UTF8Encoding]::new($false))
 Write-Host "Original UE5.8 private native clinic run: $run"
 Write-Host "Status=$($owner.status); UE PID=$($owner.unrealPid); RTX periods=$($owner.distinctPositiveUnrealPid3DPeriods)"
 Write-Host 'No Godot job changed, no foreground window, no full application acceptance.'
}
