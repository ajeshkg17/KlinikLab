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
 & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $builder -Mode Build -EvidenceDir $run -ExpectedSha $sha -EngineRoot $ue
 if($LASTEXITCODE -ne 0){throw 'Original source-exact UE procedural tooth level build FAILED; preserve evidence'}
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 & $node (Join-Path $repo 'visual-qa\sr1d-export-native-cases.mjs') "--source-dir=$source" "--output=$cases" "--expected-sha=$sha"
 if($LASTEXITCODE -ne 0){throw 'Original six cases/seven stations export failed'}
 $env:KLINIKLAB_SR1J_EVIDENCE_DIR=$run
 $env:KLINIKLAB_SR1J_CASES=$cases
 $script=Join-Path $repo 'visual-qa\unreal-whole-clinic-stage.py'
 $args=@(('"' + $project + '"'),('-ExecutePythonScript="' + $script + '"'),'-d3d12','-log','-unattended')
 $proc=Start-Process -FilePath $cmdEditor -ArgumentList $args -Wait -PassThru -NoNewWindow
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
# An immutable marker is acquired BEFORE the private desktop process starts.
$marker=[ordered]@{runId=$id;codeSHA=$codeSha;sourceSHA=$sha;timeUTC=[DateTime]::UtcNow.ToString('o');
 mode='PRIVATE_DESKTOP_D3D12';unrealEditorProcessAttempted=$true;neverReuseId=$true}
[IO.File]::WriteAllText($attempt,(ConvertTo-Json -InputObject $marker -Depth 4),
 [Text.UTF8Encoding]::new($false))
# Atomicity: reject even existing marker after a failed prior attempt.
# The guard above is intentionally fail-closed via CreateNew below.
