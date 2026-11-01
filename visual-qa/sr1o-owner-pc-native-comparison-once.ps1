# Owner-PC one-command automation: publish ORIGINAL job08 pixels, then prepare,
# run and publish a fresh bounded Unreal whole-clinic comparison.
# NO Godot launches; NO manual screenshots; no foreground switching.
# The existing Godot watcher and archived jobs are never modified.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$RepositoryPath,
 [Parameter(Mandatory=$true)][string]$ExpectedCodeSha,
 [ValidateSet('RecoverGodotOnly','RecoverGodotThenUnreal')][string]$Mode='RecoverGodotThenUnreal',
 [string]$EngineRoot='C:\Program Files\Epic Games\UE_5.8'
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'Owner Windows PC only; hosted CI cannot substitute'}
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$approved=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $approved -cne $ExpectedCodeSha -or
 $approved -cnotmatch '^[0-9a-f]{40}$'){throw 'Exact immutable experiment checkout SHA mismatch'}
if(@(& git -C $repo status --porcelain --untracked-files=no).Count -ne 0 -or
 $LASTEXITCODE -ne 0){throw 'Experiment checkout has tracked modifications'}
$ps51=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
if(-not(Test-Path -LiteralPath $ps51)){throw 'Missing native Windows PowerShell 5.1'}
$recovery=Join-Path $repo 'visual-qa\sr1n-publish-original-job08-images.ps1'
$unreal=Join-Path $repo 'visual-qa\run-unreal-whole-clinic-pc.ps1'
$publisher=Join-Path $repo 'visual-qa\publish-whole-clinic-comparison-pc.ps1'
foreach($script in @($recovery,$unreal,$publisher)){
 if(-not(Test-Path -LiteralPath $script -PathType Leaf)){throw 'Missing pinned native experiment file: '+$script}
}
# Verify old job07 and current job08 remain terminal before any sidecar publication.
$root=Join-Path $env:LOCALAPPDATA 'KlinikLabGodotWorker'
$ledger=Get-Content (Join-Path $root 'godot-ledger.json') -Raw|ConvertFrom-Json
$old=$ledger.completed.PSObject.Properties['pc-godot-clinic-20261101-job07'].Value
$now=$ledger.completed.PSObject.Properties['pc-godot-clinic-20261101-job08'].Value
if(-not $old -or $old.status -ne 'published' -or $old.recoveryOnly -ne $true -or
 $old.result.reexecuted -ne $false -or $old.result.overallStatus -cne 'EVIDENCE_INCOMPLETE' -or
 -not $now -or $now.status -ne 'published' -or $now.result.overallStatus -cne 'EVIDENCE_INCOMPLETE'){
 throw 'Immutable original job07/job08 terminal evidence gates not met; STOP'}
$task=Get-ScheduledTask -TaskName 'KlinikLab-Godot-PC-Watcher' -ErrorAction Stop
if($task.State -ne 'Running'){throw 'Owner Godot watcher task not Running; do not force a second worker'}
# Verify the source image bytes and native PID/DXGI report BEFORE publication.
& $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $recovery -RepositoryPath $repo -VerifyOnly
if($LASTEXITCODE -ne 0){throw 'Original local Godot job08 PNG verification failed; never rerender'}
$env:GIT_TERMINAL_PROMPT='0'
& git -C $repo fetch origin visual-feedback
if($LASTEXITCODE -ne 0){throw 'Cannot check existing original image publication'}
& git -C $repo cat-file -e 'FETCH_HEAD:GODOT_JOB08_ORIGINALS.md' 2>$null
$already=($LASTEXITCODE -eq 0)
if(-not $already){
 & $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $recovery -RepositoryPath $repo -Publish
 if($LASTEXITCODE -ne 0){throw 'Original job08 pixel publication failed; no rerender, inspect preserved local files'}
}else{Write-Host 'Original job08 images already published once; no duplicate publication'}
if($Mode -eq 'RecoverGodotOnly'){
 Write-Host 'GODOT_JOB08_ORIGINALS_PUBLISHED_NO_RERENDER; Unreal experiment not requested by this mode'
 return
}
# Unreal is a SEPARATE unique source-exact 5.8 experiment, not another
# Godot job, nor a full KlinikLab application port.
$ue=[IO.Path]::GetFullPath($EngineRoot)
foreach($required in @(
 (Join-Path $ue 'Engine\Build\Build.version'),
 (Join-Path $ue 'Engine\Binaries\Win64\UnrealEditor.exe'),
 (Join-Path $ue 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'))){
 if(-not(Test-Path -LiteralPath $required -PathType Leaf)){
  throw 'Real installed UE5.8 owner-PC Editor prerequisite missing; Godot original images already preserved and published. '+$required
 }
}
$v=Get-Content (Join-Path $ue 'Engine\Build\Build.version') -Raw|ConvertFrom-Json
if([int]$v.MajorVersion -ne 5 -or [int]$v.MinorVersion -ne 8){
 throw 'Only exact UE5.8 comparison supported; no unsupported installed editor fallback'}
if(Get-Process UnrealEditor,UnrealEditor-Cmd -ErrorAction SilentlyContinue){
 throw 'Another UnrealEditor is running; no simultaneous native editor/foreground fallback'}
$runId='unreal-clinic-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,10)
$run=Join-Path (Join-Path $env:LOCALAPPDATA 'KlinikLabEngineComparison') $runId
if(Test-Path -LiteralPath $run){throw 'Never reuse a native Unreal evidence run ID'}
Write-Host ('UNREAL_NEW_IMMUTABLE_RUN='+$run)
& $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $unreal -Mode Prepare -RepositoryPath $repo -EvidenceDir $run -EngineRoot $ue
if($LASTEXITCODE -ne 0){throw 'Original Unreal source-derived whole-clinic stage FAILED; never reuse attempted run'}
& $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $unreal -Mode Render -RepositoryPath $repo -EvidenceDir $run -EngineRoot $ue
if($LASTEXITCODE -ne 0){throw 'Unreal private native whole-clinic render failed; keep original logs/attempt, never rerender this ID'}
& $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $publisher -Engine Unreal -RepositoryPath $repo -EvidenceDir $run
if($LASTEXITCODE -ne 0){throw 'Unreal original native image publication failed; original local attempt preserved, do NOT rerender'}
Write-Host 'UNREAL_WHOLE_CLINIC_ORIGINAL_NATIVE_EVIDENCE_PUBLISHED_PENDING_INDEPENDENT_PIXEL_AND_GPU_REVIEW'
Write-Host ('Original Unreal run: '+$run)
