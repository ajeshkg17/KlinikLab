# SR1J original PNG publication only. NO renderer, Godot watcher or rerender.
# Publishes independent comparison run; never overwrites GODOT_PC_LATEST.md.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][ValidateSet('Godot','Unreal')][string]$Engine,
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$RepositoryPath)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$run=[IO.Path]::GetFullPath($EvidenceDir)
$base=Join-Path $env:LOCALAPPDATA 'KlinikLabEngineComparison'
if(-not $run.StartsWith(([IO.Path]::GetFullPath($base).TrimEnd('\')+'\'),
 [StringComparison]::OrdinalIgnoreCase)){throw 'Only independent local comparison runs can be published'}
$id=Split-Path -Leaf $run
if($id -cnotmatch '^(godot|unreal)-clinic-[0-9]{8}-[0-9]{6}-[a-f0-9]{10}$'){
 throw 'Invalid unique comparison run identity'}
$prefix=if($Engine -eq 'Godot'){'godot-clinic-'}else{'unreal-clinic-'}
if(-not $id.StartsWith($prefix,[StringComparison]::Ordinal)){
 throw 'Engine does not match unique original evidence folder'}
$cap=Join-Path $run 'Captures'
$sha='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$files=New-Object 'System.Collections.Generic.List[string]'
$names=New-Object 'System.Collections.Generic.List[string]'
$ownerStatus='EVIDENCE_INCOMPLETE'
if($Engine -eq 'Godot'){
 $summary=Get-Content (Join-Path $run 'godot-comparison-result.json') -Raw|ConvertFrom-Json
 $native=Get-Content (Join-Path $cap 'godot-owner-pc-result.json') -Raw|ConvertFrom-Json
 $capture=Get-Content (Join-Path $cap 'godot-background-capture.json') -Raw|ConvertFrom-Json
 if($summary.sourceSha -cne $sha -or $native.sourceGitSHA -cne $sha -or
  $summary.oldJob07Touched -ne $false -or
  $native.nativeSceneMode -cne 'clinic-cases' -or
  $summary.fullKlinikLabApplicationMigrated -ne $false){
  throw 'Original Godot source/clinic limitation mismatch'}
 $imageRows=@(
  @([string]$native.nativeScreenshotFile,[string]$capture.imageSHA256),
  @([string]$capture.cutFocusedImageFile,[string]$capture.cutFocusedImageSHA256),
  @([string]$native.nativeAngledScreenshotFile,[string]$capture.angledImageSHA256)
 )
 if(@($summary.nativeImageFiles).Count -ne 3 -or
   @($summary.nativeImageFiles)[1] -cne [string]$capture.cutFocusedImageFile){
  throw 'Third focused FDI16 source image was not independently validated by comparison runner'
 }
 foreach($p in $imageRows){
  if($p[0] -cnotmatch '^godot-native-fdi16-(frontal|occlusal|cut-focused)-[0-9]+\.png$'){
   throw 'Godot original native PNG name not allowlisted'}
  $names.Add($p[0]);$files.Add($p[0])
 }
 foreach($name in @('godot-comparison-result.json','godot-owner-pc-result.json',
  'godot-background-capture.json','native-source-submission.json',
  'godot-native-workflow-state.json','godot-gpu-3d-counters.json',
  'godot-gpu-pdh-diagnostics.json')){
  if($name -eq 'godot-comparison-result.json'){
   $files.Add($name)
  }elseif(Test-Path (Join-Path $cap $name)){$files.Add($name)}
 }
 $ownerStatus=[string]$summary.status
}else{
 $owner=Get-Content (Join-Path $cap 'unreal-owner-pc-result.json') -Raw|ConvertFrom-Json
 $native=Get-Content (Join-Path $cap 'unreal-whole-clinic-native-report.json') -Raw|ConvertFrom-Json
 $scene=Get-Content (Join-Path $run 'unreal-whole-clinic-build.json') -Raw|ConvertFrom-Json
 if($owner.sourceSHA -cne $sha -or $native.sourceSHA -cne $sha -or
 $scene.sourceSHA -cne $sha -or $owner.fullKlinikLabApplicationMigrated -ne $false -or
 $owner.pixelIndependentlyReviewed -ne $false -or
 $scene.sourceTeethRetainedAfterLevelReload -ne $true){
  throw 'Original Unreal procedural source/clinic or limitation invalid'}
 $imageRows=@(
  @('unreal-whole-clinic-overview.png',[string]$native.originalNativePngs.'unreal-whole-clinic-overview.png'.sha256),
  @('unreal-whole-clinic-angled.png',[string]$native.originalNativePngs.'unreal-whole-clinic-angled.png'.sha256),
  @('unreal-fdi16-cut-occlusal.png',[string]$native.originalNativePngs.'unreal-fdi16-cut-occlusal.png'.sha256)
 )
 foreach($p in $imageRows){$names.Add($p[0]);$files.Add($p[0])}
 foreach($name in @('unreal-owner-pc-result.json','unreal-whole-clinic-native-report.json','unreal-gpu-pdh.json')){
  if(Test-Path (Join-Path $cap $name)){$files.Add($name)}
 }
 $files.Add('unreal-whole-clinic-build.json')
 $ownerStatus=[string]$owner.status
}
# Reject images with missing native hashes, short PNGs, or bad PNG header.
foreach($row in $imageRows){
 $name=$row[0];$expect=$row[1]
 $p=Join-Path $cap $name
 if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw 'Original PC screenshot missing: '+$name}
 $bytes=[IO.File]::ReadAllBytes($p)
 if($bytes.Length -lt 25000 -or
  [BitConverter]::ToString($bytes,0,8) -cne '89-50-4E-47-0D-0A-1A-0A'){
  throw 'Original screenshot invalid/too small: '+$name}
 $hash=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
 if($hash -cne $expect){throw 'Original image hash does not match native engine report: '+$name}
}
$codeSha=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $codeSha -cnotmatch '^[a-f0-9]{40}$'){throw 'No exact comparison-code Git SHA'}
$dirty=@(& git -C $repo status --porcelain --untracked-files=no)
if($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0){throw 'Engine comparison checkout modified; refuse provenance ambiguity'}
$target='runs/engine-compare-'+$id+'-'+$sha
$worktree=Join-Path $run 'PublicationOnly'
if(Test-Path -LiteralPath $worktree){throw 'Publication attempted before; no overwrite or rerender'}
& git -C $repo fetch origin visual-feedback
if($LASTEXITCODE -ne 0){throw 'Could not fetch original visual-feedback branch'}
& git -C $repo worktree add --detach $worktree FETCH_HEAD
if($LASTEXITCODE -ne 0){throw 'Could not prepare independent publication worktree'}
$dest=Join-Path $worktree ($target.Replace('/','\'))
if(Test-Path $dest){throw 'Original immutable engine comparison already published'}
New-Item -ItemType Directory -Path $dest -ErrorAction Stop|Out-Null
foreach($file in @($files.ToArray())){
 $origin=if($file -in @('godot-comparison-result.json','unreal-whole-clinic-build.json')){
  Join-Path $run $file
 }else{Join-Path $cap $file}
 Copy-Item -LiteralPath $origin -Destination (Join-Path $dest $file) -ErrorAction Stop
}
$readme=@('# Native KlinikLab '+$Engine+' whole-clinic comparison',
 '','Source FDI16 exact SHA: '+$sha,'Experiment code SHA: '+$codeSha,
 'Unique run ID: '+$id,'Original external result: '+$ownerStatus,
 'Native images: original owner-PC bytes, SHA256-verified prior to publication.',
 'Independent original pixel acceptance: PENDING',
 'Schematic clinic scene only; complete browser app migrated: NO',
 'Clinical validity and Quest compatibility: NOT ACCEPTED',
 'Previous watcher job07 and GODOT_PC_LATEST.md: UNTOUCHED','',
 '## Native engine original PNGs','','')
foreach($name in $names){$readme+=('!['+$name+'](./'+$name+')')}
$readme+=('','## Original SHA256 files','')
foreach($file in @($files.ToArray())){
 $digest=(Get-FileHash -LiteralPath (Join-Path $dest $file) -Algorithm SHA256).Hash.ToLowerInvariant()
 $readme+=($file+': '+$digest)
}
[IO.File]::WriteAllText((Join-Path $dest 'README.md'),
 ($readme -join [Environment]::NewLine)+[Environment]::NewLine,
 [Text.UTF8Encoding]::new($false))
$pointer=if($Engine -eq 'Godot'){'GODOT_COMPARISON_LATEST.md'}else{'UNREAL_PC_LATEST.md'}
[IO.File]::WriteAllText((Join-Path $worktree $pointer),
 ('# Latest native '+$Engine+' whole clinic comparison'+[Environment]::NewLine+
 '[Review exact original native evidence](./'+$target+'/README.md)'+[Environment]::NewLine),
 [Text.UTF8Encoding]::new($false))
& git -C $worktree add -- $target $pointer
if($LASTEXITCODE -ne 0){throw 'Native comparison files staging failed'}
& git -C $worktree commit -m "Immutable $Engine clinic native evidence $id source $sha"
if($LASTEXITCODE -ne 0){throw 'Native comparison commit failed; originals preserved'}
& git -C $worktree push origin HEAD:refs/heads/visual-feedback
if($LASTEXITCODE -ne 0){throw 'Non-force evidence push rejected; preserve attempted publication worktree'}
Write-Host ('PUBLISHED_IMMUTABLE_'+$Engine.ToUpperInvariant()+'_ORIGINAL_NATIVE_PNGS: https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/'+$target+'/README.md')
Write-Host 'Independent pixel review still required; no rerender, no job07 change.'
){
   throw 'Godot original native PNG name not allowlisted'}
  $names.Add($p[0]);$files.Add($p[0])
 }
 foreach($name in @('godot-comparison-result.json','godot-owner-pc-result.json',
  'godot-background-capture.json','native-source-submission.json',
  'godot-native-workflow-state.json','godot-gpu-3d-counters.json',
  'godot-gpu-pdh-diagnostics.json')){
  if($name -eq 'godot-comparison-result.json'){
   $files.Add($name)
  }elseif(Test-Path (Join-Path $cap $name)){$files.Add($name)}
 }
 $ownerStatus=[string]$summary.status
}else{
 $owner=Get-Content (Join-Path $cap 'unreal-owner-pc-result.json') -Raw|ConvertFrom-Json
 $native=Get-Content (Join-Path $cap 'unreal-whole-clinic-native-report.json') -Raw|ConvertFrom-Json
 $scene=Get-Content (Join-Path $run 'unreal-whole-clinic-build.json') -Raw|ConvertFrom-Json
 if($owner.sourceSHA -cne $sha -or $native.sourceSHA -cne $sha -or
 $scene.sourceSHA -cne $sha -or $owner.fullKlinikLabApplicationMigrated -ne $false -or
 $owner.pixelIndependentlyReviewed -ne $false -or
 $scene.sourceTeethRetainedAfterLevelReload -ne $true){
  throw 'Original Unreal procedural source/clinic or limitation invalid'}
 $imageRows=@(
  @('unreal-whole-clinic-overview.png',[string]$native.originalNativePngs.'unreal-whole-clinic-overview.png'.sha256),
  @('unreal-whole-clinic-angled.png',[string]$native.originalNativePngs.'unreal-whole-clinic-angled.png'.sha256),
  @('unreal-fdi16-cut-occlusal.png',[string]$native.originalNativePngs.'unreal-fdi16-cut-occlusal.png'.sha256)
 )
 foreach($p in $imageRows){$names.Add($p[0]);$files.Add($p[0])}
 foreach($name in @('unreal-owner-pc-result.json','unreal-whole-clinic-native-report.json','unreal-gpu-pdh.json')){
  if(Test-Path (Join-Path $cap $name)){$files.Add($name)}
 }
 $files.Add('unreal-whole-clinic-build.json')
 $ownerStatus=[string]$owner.status
}
# Reject images with missing native hashes, short PNGs, or bad PNG header.
foreach($row in $imageRows){
 $name=$row[0];$expect=$row[1]
 $p=Join-Path $cap $name
 if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw 'Original PC screenshot missing: '+$name}
 $bytes=[IO.File]::ReadAllBytes($p)
 if($bytes.Length -lt 25000 -or
  [BitConverter]::ToString($bytes,0,8) -cne '89-50-4E-47-0D-0A-1A-0A'){
  throw 'Original screenshot invalid/too small: '+$name}
 $hash=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
 if($hash -cne $expect){throw 'Original image hash does not match native engine report: '+$name}
}
$codeSha=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $codeSha -cnotmatch '^[a-f0-9]{40}$'){throw 'No exact comparison-code Git SHA'}
$dirty=@(& git -C $repo status --porcelain --untracked-files=no)
if($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0){throw 'Engine comparison checkout modified; refuse provenance ambiguity'}
$target='runs/engine-compare-'+$id+'-'+$sha
$worktree=Join-Path $run 'PublicationOnly'
if(Test-Path -LiteralPath $worktree){throw 'Publication attempted before; no overwrite or rerender'}
& git -C $repo fetch origin visual-feedback
if($LASTEXITCODE -ne 0){throw 'Could not fetch original visual-feedback branch'}
& git -C $repo worktree add --detach $worktree FETCH_HEAD
if($LASTEXITCODE -ne 0){throw 'Could not prepare independent publication worktree'}
$dest=Join-Path $worktree ($target.Replace('/','\'))
if(Test-Path $dest){throw 'Original immutable engine comparison already published'}
New-Item -ItemType Directory -Path $dest -ErrorAction Stop|Out-Null
foreach($file in @($files.ToArray())){
 $origin=if($file -in @('godot-comparison-result.json','unreal-whole-clinic-build.json')){
  Join-Path $run $file
 }else{Join-Path $cap $file}
 Copy-Item -LiteralPath $origin -Destination (Join-Path $dest $file) -ErrorAction Stop
}
$readme=@('# Native KlinikLab '+$Engine+' whole-clinic comparison',
 '','Source FDI16 exact SHA: '+$sha,'Experiment code SHA: '+$codeSha,
 'Unique run ID: '+$id,'Original external result: '+$ownerStatus,
 'Native images: original owner-PC bytes, SHA256-verified prior to publication.',
 'Independent original pixel acceptance: PENDING',
 'Schematic clinic scene only; complete browser app migrated: NO',
 'Clinical validity and Quest compatibility: NOT ACCEPTED',
 'Previous watcher job07 and GODOT_PC_LATEST.md: UNTOUCHED','',
 '## Native engine original PNGs','','')
foreach($name in $names){$readme+=('!['+$name+'](./'+$name+')')}
$readme+=('','## Original SHA256 files','')
foreach($file in @($files.ToArray())){
 $digest=(Get-FileHash -LiteralPath (Join-Path $dest $file) -Algorithm SHA256).Hash.ToLowerInvariant()
 $readme+=($file+': '+$digest)
}
[IO.File]::WriteAllText((Join-Path $dest 'README.md'),
 ($readme -join [Environment]::NewLine)+[Environment]::NewLine,
 [Text.UTF8Encoding]::new($false))
$pointer=if($Engine -eq 'Godot'){'GODOT_COMPARISON_LATEST.md'}else{'UNREAL_PC_LATEST.md'}
[IO.File]::WriteAllText((Join-Path $worktree $pointer),
 ('# Latest native '+$Engine+' whole clinic comparison'+[Environment]::NewLine+
 '[Review exact original native evidence](./'+$target+'/README.md)'+[Environment]::NewLine),
 [Text.UTF8Encoding]::new($false))
& git -C $worktree add -- $target $pointer
if($LASTEXITCODE -ne 0){throw 'Native comparison files staging failed'}
& git -C $worktree commit -m "Immutable $Engine clinic native evidence $id source $sha"
if($LASTEXITCODE -ne 0){throw 'Native comparison commit failed; originals preserved'}
& git -C $worktree push origin HEAD:refs/heads/visual-feedback
if($LASTEXITCODE -ne 0){throw 'Non-force evidence push rejected; preserve attempted publication worktree'}
Write-Host ('PUBLISHED_IMMUTABLE_'+$Engine.ToUpperInvariant()+'_ORIGINAL_NATIVE_PNGS: https://github.com/ajeshkg17/KlinikLab/blob/visual-feedback/'+$target+'/README.md')
Write-Host 'Independent pixel review still required; no rerender, no job07 change.'
