# Publication ONLY: verified original Unity clinic PNGs and evidence JSON.
# No Unity launch, no Godot watcher, no overwrites, no manual screenshots.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$EvidenceRun,
 [Parameter(Mandatory=$true)][string]$RepositoryPath
)
$ErrorActionPreference='Stop'
$sha='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$root=Join-Path $env:LOCALAPPDATA 'KlinikLabUnityClinic'
$run=[IO.Path]::GetFullPath($EvidenceRun)
if(-not $run.StartsWith(([IO.Path]::GetFullPath($root).TrimEnd('\')+'\'),[StringComparison]::OrdinalIgnoreCase)){
 throw 'Evidence folder must be an original unique local Unity clinic run'
}
$id=Split-Path $run -Leaf
if($id -cnotmatch '^[0-9]{8}-[0-9]{6}-[a-f0-9]{10}$'){
 throw 'Invalid immutable Unity run identity; refusing publication'
}
$cap=Join-Path $run 'Captures'
$report=Join-Path $cap 'unity-whole-clinic-native-report.json'
$owner=Join-Path $cap 'unity-owner-pc-result.json'
$pdh=Join-Path $cap 'unity-gpu-pdh.json'
foreach($p in @($report,$owner,$pdh)){
 if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw "Original owner-PC result absent: $p"}
}
$r=Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
$o=Get-Content -LiteralPath $owner -Raw | ConvertFrom-Json
if($r.originalSourceSHA -cne $sha -or $o.sourceSHA -cne $sha -or
 $r.status -cne 'UNITY_NATIVE_WHOLE_CLINIC_PIXELS_GPU_ATTRIBUTION_PENDING' -or
 $o.privateDesktopCreated -ne $true -or
 $o.foregroundActivationRequested -ne $false -or
 $o.fullKlinikLabApplicationMigrated -ne $false -or
 $o.imageIndependentPixelReviewAccepted -ne $false -or
 $o.status -notin @('EVIDENCE_INCOMPLETE','NATIVE_PIXELS_GPU_CORROBORATED_PENDING_PIXEL_REVIEW')){
 throw 'Original native Unity result is inconsistent; no publication'
}
$images=@(
 @('unity-whole-clinic-overview.png',[string]$r.overviewSHA256),
 @('unity-whole-clinic-angled.png',[string]$r.angledSHA256),
 @('unity-fdi16-cut-occlusal.png',[string]$r.occlusalSHA256)
)
foreach($entry in $images){
 $file=Join-Path $cap $entry[0]
 if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw 'Original native Unity PNG missing'}
 if((Get-Item -LiteralPath $file).Length -lt 25000){throw 'PNG implausibly small'}
 $hash=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
 if($hash -cne $entry[1]){throw 'Original native PNG hash does not match Unity self-report'}
}
$workerSha=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $workerSha -cnotmatch '^[a-f0-9]{40}$'){throw 'Could not determine exact Unity test SHA'}
$dirty=@(& git -C $repo status --porcelain --untracked-files=no)
if($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0){throw 'Unity experiment checkout has modified tracked files'}
$target='runs/unity-clinic-'+$id+'-'+$sha
$temporary=Join-Path $run 'GitPublicationWorktree'
if(Test-Path -LiteralPath $temporary){throw 'Evidence publication already attempted; preserve existing original worktree'}
& git -C $repo fetch origin visual-feedback
if($LASTEXITCODE -ne 0){throw 'Evidence branch fetch failed'}
& git -C $repo worktree add --detach $temporary FETCH_HEAD
if($LASTEXITCODE -ne 0){throw 'Immutable publication worktree creation failed'}
$remoteDir=Join-Path $temporary ($target -replace '/','\')
if(Test-Path $remoteDir){throw 'This unique Unity evidence already exists; no overwrite'}
New-Item -ItemType Directory -Path $remoteDir -ErrorAction Stop|Out-Null
$files=@('unity-whole-clinic-native-report.json','unity-owner-pc-result.json',
 'unity-gpu-pdh.json','unity-whole-clinic-overview.png',
 'unity-whole-clinic-angled.png','unity-fdi16-cut-occlusal.png')
foreach($f in $files){
 Copy-Item -LiteralPath (Join-Path $cap $f) -Destination (Join-Path $remoteDir $f) -ErrorAction Stop
}
$lines=@(
 '# KlinikLab Unity whole-clinic native owner-PC evidence',
 '',
 'Original browser source SHA: '+$sha,
 'Unity experiment code SHA: '+$workerSha,
 'Unique run ID: '+$id,
 'Native owner-PC status: '+[string]$o.status,
 'Original FDI16 before triangles: 14856',
 'Original FDI16 simulated-cut triangles: 14936',
 'Six source-derived cases / seven stations',
 'Native GPU process corroborated: '+[string]$o.processGpuCorroborated,
 'Independent original image pixel review: NOT YET ACCEPTED',
 'Full KlinikLab browser application migrated: NO',
 'Quest/clinical correctness validated: NO',
 'Never render over or reuse this run. No Godot job is affected.',
 '',
 '## Original Unity screenshots',
 '',
 '![Unity whole-clinic overview](./unity-whole-clinic-overview.png)',
 '![Unity whole-clinic angled](./unity-whole-clinic-angled.png)',
 '![Unity FDI16 occlusal simulated cut](./unity-fdi16-cut-occlusal.png)',
 '',
 '## Original SHA256 files',
 ''
)
foreach($f in $files){
 $digest=(Get-FileHash -LiteralPath (Join-Path $remoteDir $f) -Algorithm SHA256).Hash.ToLowerInvariant()
 $lines+=($f+': '+$digest)
}
[IO.File]::WriteAllText((Join-Path $remoteDir 'README.md'),
 ($lines -join [Environment]::NewLine)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
$latest=Join-Path $temporary 'UNITY_PC_LATEST.md'
[IO.File]::WriteAllText($latest,
 ('# Latest Unity PC whole-clinic evidence'+[Environment]::NewLine+[Environment]::NewLine+
  '[Review the immutable Unity run](./'+$target+'/README.md)'+[Environment]::NewLine),
 [Text.UTF8Encoding]::new($false))
& git -C $temporary add -- $target 'UNITY_PC_LATEST.md'
if($LASTEXITCODE -ne 0){throw 'Failed to stage new Unity-only evidence'}
& git -C $temporary commit -m "Unity owner PC whole clinic source-exact native evidence $id $workerSha"
if($LASTEXITCODE -ne 0){throw 'Failed to commit unique Unity evidence; original still local'}
& git -C $temporary push origin HEAD:refs/heads/visual-feedback
if($LASTEXITCODE -ne 0){throw 'Non-forced evidence push rejected; preserve original run and local commit'}
$url='https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/'+$target+'/README.md'
Write-Host "PUBLISHED_ORIGINAL_UNITY_NATIVE_IMAGES_NO_RERENDER: $url"
Write-Host 'Independent pixel review remains PENDING; full app acceptance remains FALSE.'
