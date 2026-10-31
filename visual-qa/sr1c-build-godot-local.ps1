# SR1C isolated source-pinned Godot 4.7 clinical scene preparation.
# PREPARE ONLY: no GPU/screenshot/clinical acceptance from this script.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$ExpectedSha,
 [Parameter(Mandatory=$true)][string]$EvidenceDir
)
$ErrorActionPreference='Stop'
if($ExpectedSha -notmatch '^[a-f0-9]{40}$'){throw 'ExpectedSha must be an exact 40-digit Git commit'}
$sha=$ExpectedSha
$repo=Split-Path -Parent $PSScriptRoot
$actual=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $actual -ne $sha){
 throw "Repo/worktree is not pinned to SHA $sha; observed $actual"
}
$run=[IO.Path]::GetFullPath($EvidenceDir)
if(Test-Path -LiteralPath $run){
 throw "Refusing to overwrite/reuse Godot evidence: $run"
}
$sourceDir=Join-Path $run 'source'
$project=Join-Path $run 'Project'
$projectSource=Join-Path $project 'source'
$captures=Join-Path $run 'Captures'
New-Item -ItemType Directory -Path $run -ErrorAction Stop|Out-Null
$builder=Join-Path $PSScriptRoot 'sr1-local-kliniklab-export.mjs'
& node $builder "--expected-sha=$sha" "--output=$sourceDir"
if($LASTEXITCODE -ne 0){throw 'Original production FDI16 OBJ source export failed'}
$manifest=Get-Content (Join-Path $sourceDir 'kliniklab-export-manifest.json') -Raw|ConvertFrom-Json
if($manifest.sourceGitSHA -ne $sha -or $manifest.fdi -ne '16' -or
 [int]$manifest.sceneStates.before.triangles -ne 14856 -or
 [int]$manifest.sceneStates.after.triangles -ne 14936){
 throw 'Original FDI16 source counts mismatch; do not weaken acceptance'
}
$expected=@{
 before=@{enamel=10320;dentin=112;pulp=207;cementum=4105;caries=112}
 after=@{enamel=10308;dentin=205;pulp=207;cementum=4105;caries=111}
}
foreach($state in @('before','after')){
 foreach($tissue in @('enamel','dentin','pulp','cementum','caries')){
  if([int]$manifest.sceneStates.$state.byMaterial.$tissue -ne $expected[$state][$tissue]){
   throw "Wrong original tissue triangle count: $state/$tissue"
  }
 }
}
foreach($entry in $manifest.originals.PSObject.Properties){
 $p=Join-Path $sourceDir $entry.Name
 if(-not (Test-Path -LiteralPath $p -PathType Leaf)){throw "Missing original source: $p"}
 $digest=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
 if($digest -ne [string]$entry.Value){throw "Original source checksum mismatch: $p"}
}
New-Item -ItemType Directory -Path $projectSource -Force|Out-Null
New-Item -ItemType Directory -Path $captures -Force|Out-Null
$scaffold=Join-Path $PSScriptRoot 'godot-local-clinical'
foreach($file in @('project.godot','main.tscn','main.gd')){
 Copy-Item -LiteralPath (Join-Path $scaffold $file) -Destination (Join-Path $project $file)
}
Get-ChildItem -LiteralPath $sourceDir -File|ForEach-Object{
 Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $projectSource $_.Name)
}
[IO.File]::WriteAllText((Join-Path $projectSource 'expected-sha.txt'),$sha+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $projectSource 'capture-path.txt'),$captures+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
$report=[ordered]@{
 schemaVersion=1
 kind='SR1C Godot clinical source PREPARED (not native rendered)'
 status='SOURCE_EXPORTED_GODOT_PROJECT_READY_NOT_RENDERED'
 sourceGitSHA=$sha
 godotEditorVersionConfirmedOnThisRun=$false
 nativeScreenshotReviewed=$false
 processSpecificGpuVerified=$false
 questVerified=$false
 fullKlinikLabApplicationMigrated=$false
 godotProject=$project
 requestedGodotMethod='forward_plus'
 requestedGodotDriver='vulkan'
 sourceTrianglesBefore=14856
 sourceTrianglesAfter=14936
 screenshotDirectory=$captures
 sourceManifestSHA256=(Get-FileHash (Join-Path $sourceDir 'kliniklab-export-manifest.json') -Algorithm SHA256).Hash.ToLowerInvariant()
}
$report|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $run 'godot-source-prepare.json') -Encoding utf8
Write-Host "SR1C source prepared, no rendered image: $run"
Write-Host 'Import this NEW Godot project via Project Manager:'
Write-Host (Join-Path $project 'project.godot')
Write-Host 'Run the project F5, inspect both tooth surfaces, then F12 in native game window.'
Write-Host "Expected original screenshot and source submission report: $captures"
