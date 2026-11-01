# Unique Unity Editor SOURCE import only; no Godot watcher, render, or screenshot.
[CmdletBinding()]
param(
 [string]$UnityExe,
 [Parameter(Mandatory=$true)][string]$RepositoryPath,
 [string]$ExpectedSourceSha='f4d4d4151851a08342def08d9f2e461f5f5e7109'
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'Windows-only local Unity source import'}
$repo=[IO.Path]::GetFullPath($RepositoryPath)
if($ExpectedSourceSha -cnotmatch '^[a-f0-9]{40}$'){throw '40-character pinned source SHA required'}
if(-not(Test-Path -LiteralPath (Join-Path $repo 'visual-qa\sr1-local-kliniklab-export.mjs'))){throw 'Invalid KlinikLab repository'}
$node=(Get-Command node.exe -ErrorAction Stop).Source
if(-not $UnityExe){
 $hub='C:\Program Files\Unity\Hub\Editor'
 if(-not(Test-Path -LiteralPath $hub)){throw 'No standard Unity Hub Editor folder; specify -UnityExe'}
 $edits=@(Get-ChildItem -LiteralPath $hub -Directory | ForEach-Object {
  Join-Path $_.FullName 'Editor\Unity.exe'
 } | Where-Object {Test-Path -LiteralPath $_})
 if($edits.Count -ne 1){throw ('Expected exactly one Editor; use -UnityExe. Found: '+($edits -join '; '))}
 $UnityExe=$edits[0]
}
$UnityExe=[IO.Path]::GetFullPath($UnityExe)
if([IO.Path]::GetFileName($UnityExe) -cne 'Unity.exe' -or -not(Test-Path -LiteralPath $UnityExe)){
 throw 'UnityExe must be an installed Unity Editor Unity.exe'
}
if(Get-Process -Name Unity -ErrorAction SilentlyContinue){
 throw 'Unity Editor already running. Avoid concurrent access; no import started.'
}
$parent=Join-Path $env:LOCALAPPDATA 'KlinikLabUnityProbe'
New-Item -ItemType Directory -Path $parent -Force | Out-Null
$id=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('n').Substring(0,10)
$run=Join-Path $parent $id
New-Item -ItemType Directory -Path $run -ErrorAction Stop | Out-Null
$sourceTree=Join-Path $run 'PinnedSource'
$source=Join-Path $run 'OriginalOBJ'
$project=Join-Path $run 'UnityProject'
$report=Join-Path $run 'unity-source-only-result.json'
$createLog=Join-Path $run 'unity-create.log'
$importLog=Join-Path $run 'unity-import.log'
function Invoke-Editor([string[]]$More,[string]$phase){
 $stdout=Join-Path $run "unity-$phase-stdout.log"
 $stderr=Join-Path $run "unity-$phase-stderr.log"
 $args=@('-batchmode','-nographics','-quit')+$More
 $p=Start-Process -FilePath $UnityExe -ArgumentList $args -PassThru -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr
 if(-not $p.WaitForExit(300000)){
  & taskkill.exe /PID $p.Id /T /F | Out-Null
  throw "Unity $phase exceeded 300 seconds. Evidence preserved: $run"
 }
 $p.Refresh()
 if($p.ExitCode -ne 0){throw "Unity $phase exited $($p.ExitCode); inspect logs $run"}
}
try{
 & git -C $repo cat-file -e "$ExpectedSourceSha^{commit}"
 if($LASTEXITCODE -ne 0){throw 'Exact original source commit not present. Run git fetch first.'}
 & git -C $repo worktree add --detach $sourceTree $ExpectedSourceSha
 if($LASTEXITCODE -ne 0){throw 'Immutable source worktree creation failed'}
 $exporter=Join-Path $sourceTree 'visual-qa\sr1-local-kliniklab-export.mjs'
 & $node $exporter "--expected-sha=$ExpectedSourceSha" "--output=$source"
 if($LASTEXITCODE -ne 0){throw 'Original FDI16 source export failed'}
 $manifest=Get-Content (Join-Path $source 'kliniklab-export-manifest.json') -Raw | ConvertFrom-Json
 if($manifest.sourceGitSHA -cne $ExpectedSourceSha -or $manifest.fdi -ne '16' -or
  $manifest.procedure -ne 'restoration' -or
  $manifest.sceneStates.before.triangles -ne 14856 -or
  $manifest.sceneStates.after.triangles -ne 14936){
  throw 'Source FDI16 provenance or topology does not match exact source'
 }
 foreach($item in $manifest.originals.PSObject.Properties){
  $file=Join-Path $source $item.Name
  if(-not(Test-Path -LiteralPath $file)){throw "Missing source $file"}
  $hash=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if($hash -cne [string]$item.Value){throw "Original source SHA256 mismatch: $file"}
 }
 Invoke-Editor @('-createProject',('"'+$project+'"'),'-logFile',('"'+$createLog+'"')) 'create'
 if(-not(Test-Path -LiteralPath (Join-Path $project 'Assets'))){throw 'Unity project Assets not created'}
 $editor=Join-Path $project 'Assets\Editor'
 New-Item -ItemType Directory -Path $editor -Force | Out-Null
 $tool=Join-Path $PSScriptRoot 'unity-probe\KlinikLabUnitySourceProbe.cs'
 Copy-Item -LiteralPath $tool -Destination $editor -ErrorAction Stop
 Invoke-Editor @('-projectPath',('"'+$project+'"'),'-executeMethod',
  'KlinikLabUnitySourceProbe.Run','-klSourceDir',('"'+$source+'"'),
  '-klExpectedSha',$ExpectedSourceSha,'-klResult',('"'+$report+'"'),
  '-logFile',('"'+$importLog+'"')) 'import'
 if(-not(Test-Path -LiteralPath $report)){throw 'Unity did not emit mandatory source result'}
 $r=Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
 if($r.status -cne 'UNITY_SOURCE_IMPORTED_SCENE_SAVED_NO_GPU_RENDER' -or
  $r.sourceGitSHA -cne $ExpectedSourceSha -or
  $r.sourceBeforeTriangles -ne 14856 -or $r.importedBeforeTriangles -ne 14856 -or
  $r.sourceAfterTriangles -ne 14936 -or $r.importedAfterTriangles -ne 14936 -or
  $r.processGpuVerified -ne $false -or
  $r.fullKlinikLabApplicationMigrated -ne $false){
  throw 'Unity source parity result is incomplete or mismatched'
 }
 Write-Host 'UNITY_SOURCE_ONLY_PASS — original FDI16 imported, no GPU render'
 Write-Host "Unity version: $($r.unityVersion)"
 Write-Host "Saved Unity scene: $project\Assets\Scenes\KlinikLab_FDI16_SourcePreview.unity"
 Write-Host "Preserved evidence: $run"
}catch{
 Write-Host "UNITY_SOURCE_PROBE_FAILED: $($_.Exception.Message)"
 Write-Host "Preserved run folder (do not reuse): $run"
 throw
}
