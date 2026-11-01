# Publication ONLY of the two immutable original job08 Godot PNGs.
# This script NEVER launches Godot or modifies job07/job08 original evidence.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$RepositoryPath,
 [switch]$VerifyOnly,
 [switch]$Publish
)
$ErrorActionPreference='Stop'
if([bool]$Publish -eq [bool]$VerifyOnly){throw 'Choose exactly one of -VerifyOnly or -Publish'}
if($env:OS -ne 'Windows_NT'){throw 'Owner Windows PC only'}
$sourceSHA='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$workerSHA='f41078e3fc7049adb9158f1122adca7298168df8'
$job='pc-godot-clinic-20261101-job08'
$old='pc-godot-clinic-20261101-job07'
$root=Join-Path $env:LOCALAPPDATA 'KlinikLabGodotWorker'
$ledger=Get-Content (Join-Path $root 'godot-ledger.json') -Raw|ConvertFrom-Json
# The original owner-PC job08 GPU/PNG evidence was published while the
# user-visible local ledger subsequently contained only job01..job07.
# Never invent or rewrite a job08 ledger record. Authorize reconciliation
# only from the EXISTING remote Git blob identity, with byte-exact local
# original evidence cross-checks. No GitHub attachment or engine launch.
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$actualGitHead=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $actualGitHead -cnotmatch '^[0-9a-f]{40}$'){
 throw 'Recovery must run from an exact pinned Git checkout'}
$env:GIT_TERMINAL_PROMPT='0'
& git -C $repo fetch origin visual-feedback
if($LASTEXITCODE -ne 0){throw 'Cannot read canonical remote original job08 evidence'}
$remoteCommit=(& git -C $repo rev-parse FETCH_HEAD).Trim()
$remoteRoot='runs/pc-godot-'+$job+'-'+$sourceSHA
$remoteJobFile=$remoteRoot+'/godot-job-result.json'
$remoteJobBytes=@(& git -C $repo show ('FETCH_HEAD:'+$remoteJobFile))
if($LASTEXITCODE -ne 0 -or $remoteJobBytes.Count -eq 0){
 throw 'No existing published original job08 report; missing local ledger alone cannot authorize recovery'}
try{$remoteJob=($remoteJobBytes -join [Environment]::NewLine)|ConvertFrom-Json -ErrorAction Stop}
catch{throw 'Published original job08 Git result malformed: '+$_.Exception.Message}
. (Join-Path $PSScriptRoot 'sr1p-job08-publication-gate.ps1')
$ledgerReconciliation=Assert-KLJob08OriginalPublicationGate -Ledger $ledger -RemoteJob $remoteJob -ExpectedSourceSha $sourceSHA -ExpectedWorkerSha $workerSHA
$entry=$ledger.completed.PSObject.Properties[$job].Value
$run=Join-Path (Join-Path $root 'godot-evidence') ($job+'-'+$sourceSHA.Substring(0,10))
if($null -ne $entry -and [IO.Path]::GetFullPath([string]$entry.run) -cne [IO.Path]::GetFullPath($run)){
 throw 'Original job08 ledger path disagrees with captured folder'}
# Verify local original FILE bytes are exactly the same Git blobs that the
# publisher committed previously; compare immutable git blob object SHAs,
# NOT just self-reported JSON fields or rewritten/reformatted JSON.
function Assert-KLOriginalRemoteByteParity([string]$Relative,[string]$LocalPath){
 if(-not(Test-Path -LiteralPath $LocalPath -PathType Leaf)){
  throw 'Original local capture missing: '+$LocalPath}
 $remoteObject=(& git -C $repo rev-parse ('FETCH_HEAD:'+$remoteRoot+'/'+$Relative)).Trim()
 if($LASTEXITCODE -ne 0 -or $remoteObject -cnotmatch '^[a-f0-9]{40}$'){
  throw 'Original remote Git blob missing: '+$Relative}
 $localObject=(& git -C $repo hash-object -- $LocalPath).Trim()
 if($LASTEXITCODE -ne 0 -or $localObject -cne $remoteObject){
  throw 'Local original capture does not match exact remote Git blob bytes: '+$Relative}
 return $localObject
}
$remoteEvidenceBlobs=[ordered]@{}
foreach($n in @('godot-owner-pc-result.json','godot-background-capture.json',
 'godot-native-workflow-state.json','native-source-submission.json',
 'godot-gpu-3d-counters.json','godot-gpu-pdh-diagnostics.json',
 'godot-job-result.json')){
 $remoteEvidenceBlobs[$n]=Assert-KLOriginalRemoteByteParity -Relative $n -LocalPath (Join-Path (Join-Path $run 'Captures') $n)
}
$captures=Join-Path $run 'Captures'
$bgPath=Join-Path $captures 'godot-background-capture.json'
$nativePath=Join-Path $captures 'godot-owner-pc-result.json'
$wfPath=Join-Path $captures 'godot-native-workflow-state.json'
foreach($p in @($bgPath,$nativePath,$wfPath)){
 if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw 'Original local job08 evidence absent: '+$p}
}
$background=Get-Content $bgPath -Raw|ConvertFrom-Json
$owner=Get-Content $nativePath -Raw|ConvertFrom-Json
$workflow=Get-Content $wfPath -Raw|ConvertFrom-Json
if($background.status -cne 'BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW' -or
 $background.nativeSceneMode -cne 'clinic-cases' -or
 $background.nativeCaseWorkflowStateVerified -ne $true -or
 [int]$background.nativeClinicWorkspaceObjectCount -lt 25 -or
 [double]$background.orbitDurationSeconds -lt 40 -or [double]$background.orbitDurationSeconds -gt 45 -or
 $background.renderingMethod -cne 'forward_plus' -or $background.renderingDriver -cne 'vulkan' -or
 $background.videoAdapterName -notmatch '(?i)RTX\s*5060' -or
 [int]$background.sourceTrianglesBefore -ne 14856 -or [int]$background.sourceTrianglesAfter -ne 14936 -or
 [int]$background.tissueSurfacesPerTooth -ne 5){
 throw 'Original Godot source/Vulkan/native clinic capture is inconsistent'}
if($workflow.valid -ne $true -or [int]$workflow.caseCount -ne 6 -or
 [int]$workflow.stationCount -ne 7 -or $workflow.selectedCaseId -cne 'endo' -or
 $workflow.selectedFDI -cne '36' -or $workflow.selectedStationId -cne 'practical' -or
 $workflow.originalFDI16GeometryAvailable -ne $false -or
 $workflow.fullKlinikLabApplicationMigrated -ne $false){
 throw 'Original native six-case/seven-station switch or FDI36 limitations invalid'}
if($owner.sourceGitSHA -cne $sourceSHA -or [int]$owner.godotPid -le 0 -or
 $owner.status -cne 'EVIDENCE_INCOMPLETE' -or $owner.nativeImagePresent -ne $false -or
 $owner.persistentPDHQueryUsed -ne $true -or
 [int]$owner.process3DPositiveRtx5060DistinctPeriods -lt 3 -or
 $owner.gpuAdapterLuidMatchedToNvidia -ne $true -or
 $owner.rtx5060DxgiLuid -notmatch '^0x[0-9a-fA-F]{8}_0x[0-9a-fA-F]{8}$'){
 throw 'Preserved original Godot PID / DXGI PDH evidence inconsistent'}
$nvidia=@($owner.dxgiAdapters|Where-Object{$_.vendorId -eq 4318 -and $_.name -match '(?i)RTX\s*5060'})
if($nvidia.Count -ne 1 -or $nvidia[0].luid -cne $owner.rtx5060DxgiLuid){
 throw 'Original RTX5060 DXGI adapter mapping is not independently consistent'}
$pngs=@()
foreach($spec in @(
 @{name=[string]$background.imageFile;sha=[string]$background.imageSHA256;label='frontal'},
 @{name=[string]$background.angledImageFile;sha=[string]$background.angledImageSHA256;label='occlusal'}
)){
 $name=$spec.name
 if($name -cnotmatch ('^godot-native-fdi16-'+$spec.label+'-[0-9]+\.png$')){
  throw 'Native original screenshot filename unsupported: '+$name}
 $file=Join-Path $captures $name
 if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw 'Original PNG not present: '+$file}
 $bytes=[IO.File]::ReadAllBytes($file)
 if($bytes.Length -lt 25000 -or [BitConverter]::ToString($bytes,0,8) -cne '89-50-4E-47-0D-0A-1A-0A'){
  throw 'Original PNG header/byte count invalid: '+$name}
 $width=([int]$bytes[16] -shl 24) + ([int]$bytes[17] -shl 16) + ([int]$bytes[18] -shl 8) + [int]$bytes[19]
 $height=([int]$bytes[20] -shl 24) + ([int]$bytes[21] -shl 16) + ([int]$bytes[22] -shl 8) + [int]$bytes[23]
 if($width -ne 1600 -or $height -ne 900){throw 'Original native PNG resolution differs from source report'}
 $sha=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
 if($sha -cne $spec.sha){throw 'Original Godot PNG SHA does not match native Godot self-report: '+$name}
 $pngs+= [pscustomobject]@{name=$name;path=$file;sha256=$sha;bytes=$bytes.Length;width=$width;height=$height}
}
$publishedPngs=@($pngs|ForEach-Object{
 [ordered]@{name=$_.name;sha256=$_.sha256;bytes=$_.bytes;width=$_.width;height=$_.height}
})
$record=[ordered]@{
 schemaVersion=1;status='ORIGINAL_JOB08_PIXELS_PRESERVED_PENDING_DIRECT_PIXEL_REVIEW'
 reconciliationStatus=$ledgerReconciliation
 remoteOriginalGitCommit=$remoteCommit
 remoteOriginalJob08BlobSHA=$remoteEvidenceBlobs['godot-job-result.json']
 remoteOriginalEvidenceBlobSHAs=$remoteEvidenceBlobs
 localJob08LedgerEntryPresent=($null -ne $entry)
 ledgerModified=$false
 oldJob07Untouched=$true;originalJob08Untouched=$true;recoveryOnly=$true;reexecuted=$false
 sourceGitSHA=$sourceSHA;workerGitSHA=$workerSHA;jobId=$job
 originalGodotPid=[int]$owner.godotPid;originalNativeSceneMode='clinic-cases'
 originalNativeOrbitSeconds=[double]$background.orbitDurationSeconds
 nativeClinicWorkspaceObjectCount=[int]$background.nativeClinicWorkspaceObjectCount
 originalNativeWorkflowVerified=$true
 originalPDHPositiveRtx5060DistinctPeriods=[int]$owner.process3DPositiveRtx5060DistinctPeriods
 originalRtx5060DxgiLuid=$owner.rtx5060DxgiLuid
 pngs=$publishedPngs
 originalOwnerReportStatus='EVIDENCE_INCOMPLETE'
 originalOwnerReportGpuProcessCorroborated=$false
 independentlyReviewedPixels=$false;fullKlinikLabApplicationMigrated=$false
 limitation='Original Godot image bytes recovered as sidecar; original job08 report remains incomplete due producer/consumer timing race; no rerender and no clinical/full-app acceptance'
}
if($VerifyOnly){
 Write-Host ('JOB08_ORIGINALS_VERIFIED_NO_PUBLICATION '+(ConvertTo-Json -InputObject $record -Depth 8 -Compress))
 return
}
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$head=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $head -cnotmatch '^[0-9a-f]{40}$'){
 throw 'Recovery script repository must be a pinned exact SHA checkout'}
$clean=@(& git -C $repo status --porcelain --untracked-files=no)
if($LASTEXITCODE -ne 0 -or $clean.Count -ne 0){throw 'Originals publisher checkout must be clean'}
# Remote exact-published evidence was fetched and source-checked above.
# Do not re-fetch a moving visual-feedback head between validation and upload.

if($LASTEXITCODE -ne 0){throw 'Could not fetch original visual-feedback branch'}
$parent=$remoteCommit
$worktree=Join-Path $env:LOCALAPPDATA ('KlinikLabGodotRecoveryPublish-'+[guid]::NewGuid().ToString('N'))
& git -C $repo worktree add --detach $worktree $parent
if($LASTEXITCODE -ne 0){throw 'Unique detached publication checkout failed'}
try{
 $pointer=Join-Path $worktree 'GODOT_JOB08_ORIGINALS.md'
 if(Test-Path -LiteralPath $pointer){throw 'Job08 originals already published; never duplicate original recovery'}
 $id='job08-original-pixels-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,10)
 $relative='runs/pc-godot-recovery-'+$id
 $target=Join-Path $worktree ($relative.Replace('/','\'))
 New-Item -ItemType Directory -Path $target -ErrorAction Stop|Out-Null
 foreach($p in $pngs){
  Copy-Item -LiteralPath $p.path -Destination (Join-Path $target $p.name) -ErrorAction Stop
  $verify=(Get-FileHash -LiteralPath (Join-Path $target $p.name) -Algorithm SHA256).Hash.ToLowerInvariant()
  if($verify -cne $p.sha256){throw 'Published copy changed original PNG bytes'}
 }
 $record.publishedAtUTC=[DateTime]::UtcNow.ToString('o')
 $record.originalJob08EvidenceUrl='https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/runs/pc-godot-pc-godot-clinic-20261101-job08-'+$sourceSHA+'/README.md'
 [IO.File]::WriteAllText((Join-Path $target 'original-pixels-recovery.json'),((ConvertTo-Json -InputObject $record -Depth 12)+[Environment]::NewLine),[Text.UTF8Encoding]::new($false))
 $readme=@('# Job08 original native Godot pixel bytes — publication only','','Original PID '+$owner.godotPid+'; exact source SHA '+$sourceSHA,
  'This is a NEW separate publication of ORIGINAL files, not a second render.',
  'Original job08 result remains EVIDENCE_INCOMPLETE; original job07 untouched.','',
  'Original 42s whole-clinic native capture reported 44 clinic objects, 6 cases and 7 stations.',
  'FDI36 station selection is metadata-only; original FDI16 geometry is hidden after that switch.',
  'Original process PDH '+$owner.process3DPositiveRtx5060DistinctPeriods+' positive RTX5060 3D periods; DXGI LUID '+$owner.rtx5060DxgiLuid+'.',
  'Independent pixel review/clinical/full-app migration are NOT accepted here.','',
  '![Original Godot whole-clinic frontal](./'+$pngs[0].name+')',
  '![Original Godot whole-clinic angled](./'+$pngs[1].name+')','')
 [IO.File]::WriteAllText((Join-Path $target 'README.md'),($readme -join [Environment]::NewLine),[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($pointer,('# Original job08 native clinic PNGs (publication-only)' + [Environment]::NewLine+[Environment]::NewLine+'[Browse original images](./'+$relative+'/README.md)'+[Environment]::NewLine),[Text.UTF8Encoding]::new($false))
 & git -C $worktree add -- $relative 'GODOT_JOB08_ORIGINALS.md'
 if($LASTEXITCODE -ne 0){throw 'Could not stage immutable original images'}
 & git -C $worktree -c user.name='KlinikLab Owner-PC Evidence' -c user.email='owner-pc-evidence@users.noreply.github.com' commit -m ('Publish ORIGINAL job08 Godot native images without rerender, exact source '+$sourceSHA)
 if($LASTEXITCODE -ne 0){throw 'Failed to commit immutable original image sidecar'}
 & git -C $worktree push origin HEAD:refs/heads/visual-feedback
 if($LASTEXITCODE -ne 0){throw 'Non-force publication failed; preserve original files and do not rerender'}
 Write-Host ('JOB08_ORIGINAL_IMAGES_PUBLISHED_NO_RERENDER https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/'+$relative+'/README.md')
}finally{
 & git -C $repo worktree remove --force $worktree
 if($LASTEXITCODE -ne 0){Write-Warning 'Detached publication checkout requires cleanup; DO NOT delete original job08 evidence'}
}
