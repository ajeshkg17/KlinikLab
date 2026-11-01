# SR1J private-desktop whole-clinic native Godot trial; NOT the queued watcher.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RepositoryPath,
 [Parameter(Mandatory=$true)][string]$GodotExe)
$ErrorActionPreference='Stop'
$sha='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$exe=[IO.Path]::GetFullPath($GodotExe)
if($env:OS -ne 'Windows_NT'){throw 'Windows owner PC only'}
if(-not(Test-Path -LiteralPath $exe -PathType Leaf) -or
 [IO.Path]::GetFileName($exe) -notmatch '4\.7\.2'){throw 'Godot 4.7.2 GUI executable required'}
$codeSha=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $codeSha -cnotmatch '^[a-f0-9]{40}$'){throw 'Pinned experiment checkout unavailable'}
$id='godot-clinic-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,10)
$root=Join-Path $env:LOCALAPPDATA 'KlinikLabEngineComparison'
$run=Join-Path $root $id
$source=Join-Path $root ($id+'-source')
$scriptRoot=Join-Path $repo 'visual-qa'
$report=Join-Path $run 'godot-comparison-result.json'
New-Item -ItemType Directory -Path $root -Force | Out-Null
if((Test-Path $run) -or (Test-Path $source)){throw 'Never reuse evidence or source worktree'}
$summary=[ordered]@{schemaVersion=1;engine='Godot 4.7.2';runId=$id;sourceSha=$sha;
 codeSha=$codeSha;status='EVIDENCE_INCOMPLETE';sourceTrianglesBefore=14856;
 sourceTrianglesAfter=14936;sourceDerivedCases=6;sourceDerivedStations=7;
 nativeSceneMode='clinic-cases';privateDesktopCreated=$false;
 gpuProcessCorroborated=$false;imageIndependentlyReviewed=$false;
 fullKlinikLabApplicationMigrated=$false;questVerified=$false;
 oldJob07Touched=$false;errors=@()}
try {
 & git -C $repo cat-file -e ($sha+'^{commit}')
 if($LASTEXITCODE -ne 0){throw 'Pinned original source commit missing; fetch before trial'}
 & git -C $repo worktree add --detach $source $sha
 if($LASTEXITCODE -ne 0){throw 'Immutable original source worktree failed'}
 $builder=Join-Path $source 'visual-qa\sr1c-build-godot-local.ps1'
 & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $builder -ExpectedSha $sha -EvidenceDir $run
 if($LASTEXITCODE -ne 0){throw 'Original source FDI16 14856/14936 import preparation failed'}
 $prepare=Join-Path $scriptRoot 'sr1d-prepare-godot-cases.ps1'
 & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $prepare -EvidenceDir $run -ExpectedSha $sha -SourceWorktree $source
 if($LASTEXITCODE -ne 0){throw 'Original six cases/seven stations preparation failed'}
 $captureScript=Join-Path $scriptRoot 'sr1c-capture-godot-background-pc.ps1'
 & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $captureScript -EvidenceDir $run -ExpectedSha $sha -GodotExe $exe -SceneMode clinic-cases
 if($LASTEXITCODE -ne 0){throw 'Private-desktop Godot Vulkan capture failed; original logs retained'}
 $cap=Join-Path $run 'Captures'
 $native=Join-Path $cap 'godot-owner-pc-result.json'
 $workflow=Join-Path $cap 'godot-native-workflow-state.json'
 $sourceSubmission=Join-Path $cap 'native-source-submission.json'
 foreach($file in @($native,$workflow,$sourceSubmission)){if(-not(Test-Path $file)){throw 'Missing native Godot evidence file: '+$file}}
 $r=Get-Content $native -Raw|ConvertFrom-Json
 $w=Get-Content $workflow -Raw|ConvertFrom-Json
 $a=Get-Content $sourceSubmission -Raw|ConvertFrom-Json
 if($r.sourceGitSHA -cne $sha -or $r.nativeSceneMode -cne 'clinic-cases' -or
 [int]$a.states.before.submittedTriangles -ne 14856 -or [int]$a.states.after.submittedTriangles -ne 14936 -or
 $w.valid -ne $true -or [int]$w.caseCount -ne 6 -or [int]$w.stationCount -ne 7 -or
 $w.selectedFDI -ne '36' -or $w.selectedCaseId -ne 'endo' -or
 $w.originalFDI16GeometryAvailable -ne $false){throw 'Original clinical source/cases mismatch or FDI36 mislabelled'}
 $summary.privateDesktopCreated=[bool]$r.privateDesktopCreated
 $summary.gpuProcessCorroborated=[bool]$r.godotProcessGPUCorroborated
 $summary.positiveGodotPidRtx5060DistinctPeriods=[int]$r.process3DPositiveRtx5060DistinctPeriods
 # Third actual FDI16 native screenshot BEFORE the FDI36 case switch.
 $background=Get-Content (Join-Path $cap 'godot-background-capture.json') -Raw | ConvertFrom-Json
 $focusedName=[string]$background.cutFocusedImageFile
 if($focusedName -cnotmatch '^godot-native-fdi16-cut-focused-[0-9]+\.png$'){
  throw 'New native FDI16 cut-focused PNG was not returned'
 }
 $focusedFile=Join-Path $cap $focusedName
 if(-not(Test-Path $focusedFile -PathType Leaf) -or (Get-Item $focusedFile).Length -lt 25000){
  throw 'Native cut-focused original PNG missing or unexpectedly tiny'
 }
 $focusedHash=(Get-FileHash $focusedFile -Algorithm SHA256).Hash.ToLowerInvariant()
 if($focusedHash -cne [string]$background.cutFocusedImageSHA256){
  throw 'Native Godot focused-cut original PNG SHA256 mismatch'
 }
 $summary.nativeCutFocusedImageSHA256=$focusedHash
 $summary.nativeImageFiles=@([string]$r.nativeScreenshotFile,$focusedName,[string]$r.nativeAngledScreenshotFile)
 $summary.status=$(if($r.status -eq 'EVIDENCE_CAPTURED_PENDING_INDEPENDENT_PIXEL_AND_LUID_REVIEW'){'NATIVE_GODOT_CLINIC_GPU_EVIDENCE_PENDING_PIXEL_REVIEW'}else{'EVIDENCE_INCOMPLETE'})
} catch {
 $summary.errors=@([string]$_.Exception.Message)
 throw
} finally {
 New-Item -ItemType Directory -Path $run -Force|Out-Null
 [IO.File]::WriteAllText($report,(ConvertTo-Json -InputObject $summary -Depth 9)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
 Write-Host "Immutable independent Godot clinic run: $run"
 Write-Host "Status: $($summary.status); original job07 UNTOUCHED"
}
