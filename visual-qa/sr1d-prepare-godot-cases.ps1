# SR1D new source-derived case/station data from the *actual* detached
# production app.js worktree. Existing FDI16 preparer remains unchanged.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$ExpectedSha,
 [Parameter(Mandatory=$true)][string]$SourceWorktree
)
$ErrorActionPreference='Stop'
if($ExpectedSha -notmatch '^[0-9a-f]{40}$'){throw 'Source SHA must be 40 hex'}
$actual=(& git -C $SourceWorktree rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $actual -ne $ExpectedSha){throw 'Production case worktree not exact pinned SHA'}
$run=[IO.Path]::GetFullPath($EvidenceDir)
$project=Join-Path $run 'Project'
$sourceManifest=Join-Path $run 'godot-source-prepare.json'
if(-not(Test-Path -LiteralPath $sourceManifest)){throw 'Original source preparation must finish before case export'}
$previous=Get-Content -LiteralPath $sourceManifest -Raw|ConvertFrom-Json
if($previous.sourceGitSHA -ne $ExpectedSha -or
 $previous.status -ne 'SOURCE_EXPORTED_GODOT_PROJECT_READY_NOT_RENDERED'){
 throw 'Original source FDI16 geometry not verified'
}
$output=Join-Path $project 'source\kliniklab-native-cases.json'
if(Test-Path -LiteralPath $output){throw 'Refusing to overwrite native clinic case metadata'}
$exporter=Join-Path $PSScriptRoot 'sr1d-export-native-cases.mjs'
if(-not(Test-Path -LiteralPath $exporter)){throw 'Case exporter missing from approved worker'}
& node $exporter "--source-dir=$SourceWorktree" "--output=$output" "--expected-sha=$ExpectedSha"
if($LASTEXITCODE -ne 0){throw 'Production case exporter failed'}
$d=Get-Content -LiteralPath $output -Raw|ConvertFrom-Json
if($d.sourceGitSHA -ne $ExpectedSha -or $d.caseCount -ne 6 -or $d.stationCount -ne 7 -or
 $d.cases[0].id -ne 'molar' -or $d.cases[0].fdi -ne '16' -or
 $d.cases[1].id -ne 'endo' -or $d.cases[1].fdi -ne '36'){
 throw 'Clinical case/station source parity failure'
}
$actualAppHash=(Get-FileHash -LiteralPath (Join-Path $SourceWorktree 'app.js') -Algorithm SHA256).Hash.ToLowerInvariant()
if($d.sourceFileSHA256 -ne $actualAppHash){throw 'Source app.js SHA256 mismatch'}
$report=[ordered]@{
 schemaVersion=1;kind='CASE_STATION_EXPORT_NOT_FULL_KLINIKLAB'
 sourceGitSHA=$ExpectedSha;sourceAppSHA256=$actualAppHash
 nativeManifestSHA256=(Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
 cases=6;stations=7;fullKlinikLabApplicationMigrated=$false
}
$reportPath=Join-Path $run 'godot-native-cases-prepare.json'
if(Test-Path -LiteralPath $reportPath){throw 'Refusing overwrite native case preparation report'}
[IO.File]::WriteAllText($reportPath,
 (($report|ConvertTo-Json -Depth 5)+[Environment]::NewLine),
 (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'SR1D source exact six clinical cases / seven stations PREPARED; no full-app acceptance'
