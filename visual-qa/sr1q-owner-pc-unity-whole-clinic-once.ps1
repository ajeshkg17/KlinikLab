# SR1Q — one owner-PC native Unity D3D11 WHOLE CLINIC attempt.
# Run in a detached exact-SHA checkout. No screenshots/manual uploads,
# no Godot or Unreal run, no changes to the Godot watcher or older jobs.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$RepositoryPath,
 [Parameter(Mandatory=$true)][string]$ExpectedCodeSha,
 [string]$UnityExe
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'Real owner Windows PC is required'}
$source='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$repo=[IO.Path]::GetFullPath($RepositoryPath)
$head=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $head -cne $ExpectedCodeSha -or
 $head -cnotmatch '^[a-f0-9]{40}$'){
 throw 'Unity native runner must use EXACT approved unmodified code SHA'}
$changes=@(& git -C $repo status --porcelain --untracked-files=no)
if($LASTEXITCODE -ne 0 -or $changes.Count -ne 0){throw 'Unity native runner checkout is not clean'}
$ps51=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
if(-not(Test-Path -LiteralPath $ps51)){throw 'Real Windows PowerShell 5.1 missing'}
$sourceScript=Join-Path $repo 'visual-qa\run-unity-source-probe.ps1'
$renderScript=Join-Path $repo 'visual-qa\run-unity-clinic-render-pc.ps1'
$publishScript=Join-Path $repo 'visual-qa\publish-unity-clinic-evidence.ps1'
foreach($p in @($sourceScript,$renderScript,$publishScript)){
 if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw 'Missing approved Unity source/GPU/publisher file: '+$p}
}
if(-not $UnityExe){
 $hub='C:\Program Files\Unity\Hub\Editor'
 $found=@(Get-ChildItem -LiteralPath $hub -Directory -ErrorAction SilentlyContinue |
  ForEach-Object{Join-Path $_.FullName 'Editor\Unity.exe'}|
  Where-Object{Test-Path -LiteralPath $_})
 if($found.Count -ne 1){
  throw ('UNITY_EDITOR_PREREQUISITE_BLOCKED: expected exactly one installed Unity Editor; found '+
   $found.Count+'. Unity Hub alone is not an Editor. Pass -UnityExe for an installed editor.')}
 $UnityExe=$found[0]
}
$UnityExe=[IO.Path]::GetFullPath($UnityExe)
if(-not(Test-Path -LiteralPath $UnityExe -PathType Leaf) -or
 [IO.Path]::GetFileName($UnityExe) -cne 'Unity.exe'){
 throw 'UNITY_EDITOR_PREREQUISITE_BLOCKED: installed Unity.exe executable not found'}
if(Get-Process -Name Unity -ErrorAction SilentlyContinue){
 throw 'Unity Editor already running; no competing/editor foreground run'}
$receipts=Join-Path $env:LOCALAPPDATA 'KlinikLabUnityRunReceipts'
New-Item -ItemType Directory -Force -Path $receipts|Out-Null
$id=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,10)
$receipt=Join-Path $receipts ('unity-source-'+$id+'.json')
if(Test-Path -LiteralPath $receipt){throw 'Never reuse attempted Unity source receipt'}
Write-Host ('UNITY_ORIGINAL_NATIVE_ATTEMPT_CODE_SHA='+$ExpectedCodeSha)
Write-Host ('UNITY_SOURCE_PROBE_NEW_RECEIPT='+$receipt)
# Step 1: true source-import only, no GPU assertion. If Unity activation
# or license is unavailable, this stage exits nonzero with original logs.
& $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $sourceScript -RepositoryPath $repo -ExpectedSourceSha $source -UnityExe $UnityExe -RunReceiptPath $receipt
if($LASTEXITCODE -ne 0){
 throw 'UNITY_EDITOR_SOURCE_OR_LICENSE_BLOCKED: original source import failed; review new KlinikLabUnityProbe logs; do not reuse attempted source ID'}
if(-not(Test-Path -LiteralPath $receipt -PathType Leaf)){
 throw 'Unity Editor did not issue its verified successful source run receipt'}
$r=Get-Content -LiteralPath $receipt -Raw|ConvertFrom-Json
if($r.status -cne 'UNITY_SOURCE_IMPORTED_SCENE_SAVED_NO_GPU_RENDER' -or
 $r.sourceGitSHA -cne $source -or $r.unityExe -cne $UnityExe -or
 $r.realGpuRendered -ne $false -or
 $r.fullKlinikLabApplicationMigrated -ne $false -or
 -not(Test-Path -LiteralPath (Join-Path $r.sourceRun 'unity-source-only-result.json'))){
 throw 'Unity source handoff identity/status invalid; no GPU render permitted'}
# Step 2: a separate NEW immutable WinSta0 private desktop real-D3D11
# Unity process. The sampler must corroborate UNITY PID, 3D engine, actual
# RTX5060 DXGI LUID and original three PNG hashes; never infer from source stage.
Write-Host ('UNITY_NATIVE_D3D11_SOURCE_RUN='+[string]$r.sourceRun)
& $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $renderScript -RepositoryPath $repo -SourceProbeRun ([string]$r.sourceRun) -UnityExe $UnityExe
if($LASTEXITCODE -ne 0){
 throw 'UNITY_NATIVE_GPU_RENDER_FAILED: original run preserved in LOCALAPPDATA; do not rerun any attempted native run ID'}
# The native runner creates one unique clinic folder, but its identity
# must be handed off to the publisher without guessing or selecting a
# pre-existing run. A NEW receipt is written by the render runner.
$nativeReceipt=Join-Path $receipts ('unity-native-'+$id+'.json')
if(-not(Test-Path -LiteralPath $nativeReceipt -PathType Leaf)){
 throw 'Unity GPU stage completed without an exact source-linked native receipt; do not select a folder by timestamp or rerender'}
$n=Get-Content -LiteralPath $nativeReceipt -Raw|ConvertFrom-Json
if($n.sourceRun -cne $r.sourceRun -or $n.sourceGitSHA -cne $source -or
 $n.codeGitSHA -cne $ExpectedCodeSha -or
 -not(Test-Path -LiteralPath (Join-Path $n.nativeRun 'Captures\unity-owner-pc-result.json'))){
 throw 'Native Unity attempt receipt does not match exact original source/run/code'}
# Step 3: publication ONLY, original native PNG bytes and reports.
& $ps51 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $publishScript -EvidenceRun ([string]$n.nativeRun) -RepositoryPath $repo
if($LASTEXITCODE -ne 0){
 throw 'UNITY_ORIGINAL_PNG_GITHUB_PUBLICATION_FAILED: original local native run preserved; no rerender'}
Write-Host ('UNITY_NATIVE_WHOLE_CLINIC_ORIGINAL_PNGS_PUBLISHED_NEEDS_DIRECT_PIXEL_REVIEW '+[string]$n.nativeRun)
