# KlinikLab SR1B native local-only clinical app mesh proof.
# Build  -> exports *production* FDI16 geometry, imports into DISTINCT UE5.8 project.
# Open   -> starts interactive clinical UE project for original HighResShot.
# Collect-> copies native PNG/log and samples exact UnrealEditor PID GPU 3D counters.
# Never touches existing blank-project evidence, starts Quest/streaming, or asserts
# that CI-only source checks constitute a native workstation GPU frame.
[CmdletBinding()]
param(
 [ValidateSet('Build','Open','Collect')][string]$Mode='Build',
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$ExpectedSha,
 [string]$EngineRoot='C:\Program Files\Epic Games\UE_5.8',
 [int]$GpuIndex=0
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out=[IO.Path]::GetFullPath($EvidenceDir)
$sha=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $sha -ne $ExpectedSha -or $sha -notmatch '^[a-f0-9]{40}$'){
 throw "Source pin mismatch; require checkout of exact $ExpectedSha, got $sha"
}
$editor=Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
$editorCmd=Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$verFile=Join-Path $EngineRoot 'Engine\Build\Build.version'
if(-not (Test-Path -LiteralPath $editor) -or -not (Test-Path -LiteralPath $editorCmd) -or -not (Test-Path -LiteralPath $verFile)){
 throw 'UE5.8 native editor/commandlet/version files missing'
}
$ver=Get-Content -LiteralPath $verFile -Raw|ConvertFrom-Json
if($ver.MajorVersion -ne 5 -or $ver.MinorVersion -ne 8){throw "Not UE5.8: $($ver.MajorVersion).$($ver.MinorVersion)"}
$project=Join-Path $out 'Project\KlinikLab_SR1B_Local.uproject'
$exportDir=Join-Path $out 'Export'
function Assert-Run(){
 if(-not (Test-Path -LiteralPath $project -PathType Leaf)){throw "Missing SR1B isolated project: $project"}
 if(-not (Test-Path -LiteralPath (Join-Path $exportDir 'kliniklab-export-manifest.json'))){throw 'Missing original source export manifest'}
 $manifest=Get-Content -LiteralPath (Join-Path $exportDir 'kliniklab-export-manifest.json') -Raw|ConvertFrom-Json
 if($manifest.sourceGitSHA -ne $sha){throw 'Clinical export source commit mismatch'}
}
if($Mode -eq 'Build'){
 if(Test-Path -LiteralPath $out){throw "Refusing to overwrite existing native clinical evidence: $out"}
 New-Item -ItemType Directory -Path (Split-Path $out -Parent) -Force -ErrorAction Stop | Out-Null
 New-Item -ItemType Directory -Path $out -ErrorAction Stop | Out-Null
 $projectDir=Join-Path $out 'Project'
 New-Item -ItemType Directory -Path $projectDir | Out-Null
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'ue5_8-kliniklab-local\KlinikLab_SR1B_Local.uproject') -Destination $project -ErrorAction Stop
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'ue5_8-kliniklab-local\Config') -Destination $projectDir -Recurse -ErrorAction Stop
 & node (Join-Path $PSScriptRoot 'sr1-local-kliniklab-export.mjs') "--expected-sha=$sha" "--output=$exportDir"
 if($LASTEXITCODE -ne 0){throw 'Production FDI16 native OBJ exporter failed; retained partial run for inspection'}
 $env:KLINIKLAB_SR1B_SHA=$sha
 $env:KLINIKLAB_SR1B_EVIDENCE_DIR=$out
 $env:KLINIKLAB_SR1B_MESH_DIR=$exportDir
 $env:KLINIKLAB_SR1B_SCRIPT_DIR=$PSScriptRoot
 $buildScript=Join-Path $PSScriptRoot 'sr1b-unreal-build-clinical-level.py'
 $proc=Start-Process -FilePath $editorCmd -ArgumentList @("`"$project`"","-ExecutePythonScript=`"$buildScript`"","-d3d12","-log") -Wait -PassThru -NoNewWindow
 $reportPath=Join-Path $out 'unreal-clinical-level-build.json'
 if(-not (Test-Path -LiteralPath $reportPath)){throw "No real UE native level build report. UE exit: $($proc.ExitCode). Inspect saved UE logs."}
 $report=Get-Content -LiteralPath $reportPath -Raw|ConvertFrom-Json
 if($report.status -ne 'NATIVE_LEVEL_CREATED_PENDING_GPU_AND_PIXEL_EVIDENCE' -or $report.sourceGitSHA -ne $sha){
  throw "Native UE clinical level build FAILED: $($report.status). See report/log"
 }
 $umap=Join-Path $projectDir 'Content\Maps\L_KlinikLab_FDI16.umap'
 if(-not (Test-Path -LiteralPath $umap -PathType Leaf)){throw 'No native UE .umap saved on disk'}
 $meshFiles=@(Get-ChildItem -LiteralPath (Join-Path $projectDir 'Content\KlinikLab\NativeMeshes') -Filter '*.uasset' -File -ErrorAction SilentlyContinue)
 $source=Get-Content -LiteralPath (Join-Path $exportDir 'kliniklab-export-manifest.json') -Raw|ConvertFrom-Json
 $sectionRows=@($report.importedMaterialSections.before.PSObject.Properties.Value)+@($report.importedMaterialSections.after.PSObject.Properties.Value)
 $expectedSectionCount=0
 foreach($state in @('before','after')){
  $rows=@($report.importedMaterialSections.$state.PSObject.Properties.Value)
  $expected=[int]$source.sceneStates.$state.triangles
  $actual=[int](($rows|Measure-Object -Property triangleCount -Sum).Sum)
  $expectedSectionCount+=$rows.Count
  if($actual -ne $expected -or [int]$report.importedTrianglesLOD0.$state -ne $expected){
   throw "Aggregate native LOD0 triangle parity failed for $state"
  }
 }
 if($expectedSectionCount -lt 2 -or $sectionRows.Count -ne $expectedSectionCount){
  throw 'Invalid native multi-material section report'
 }
 foreach($section in $sectionRows){
  $assetPath=[string]$section.assetPath
  if($assetPath -notmatch '^/Game/KlinikLab/NativeMeshes/([^./]+)\.([^./]+)$'){
   throw "Invalid imported native StaticMesh path: $assetPath"
  }
  if($matches[1] -ne $matches[2]){
   throw "Native package/object names differ unexpectedly: $assetPath"
  }
  $assetNameOnDisk=$matches[1]+'.uasset'
  if(-not ($meshFiles.Name -contains $assetNameOnDisk)){
   throw "Missing native section uasset: $assetNameOnDisk"
  }
 }
 if($meshFiles.Count -lt $sectionRows.Count){
  throw "Saved native asset count below validated tissue-section count"
 }
 $fileHashes=[ordered]@{
  sourceGitSHA=$sha
  status='NATIVE_ASSET_FILES_HASHED_NOT_RENDERED'
  originalFdi16ManifestSHA256=(Get-FileHash (Join-Path $exportDir 'kliniklab-export-manifest.json') -Algorithm SHA256).Hash.ToLowerInvariant()
  nativeLevelSHA256=(Get-FileHash $umap -Algorithm SHA256).Hash.ToLowerInvariant()
  nativeAssetFiles=@(foreach($asset in $meshFiles){
   [ordered]@{name=$asset.Name;sizeBytes=$asset.Length;sha256=(Get-FileHash -LiteralPath $asset.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
  })
  gpuAndPixelValidated=$false
 }
 $fileHashes|ConvertTo-Json -Depth 9|Set-Content -LiteralPath (Join-Path $out 'native-level-file-hashes.json') -Encoding utf8
 Write-Host "SOURCE/ASSET-ONLY SR1B level created: $umap (NOT a verified GPU frame)"
 Write-Host "Next: rerun with -Mode Open -EvidenceDir '$out' -ExpectedSha $sha"
 exit 0
}
Assert-Run
if($Mode -eq 'Open'){
 $marker=Join-Path $out 'clinical-editor-open.json'
 if(Test-Path -LiteralPath $marker){throw 'Editor open marker exists; use a separate evidence collection, do not rewrite it'}
 $p=Start-Process -FilePath $editor -ArgumentList @("`"$project`"","-d3d12","-log") -PassThru
 $data=@{sourceGitSHA=$sha;utc=[DateTime]::UtcNow.ToString('o');pid=$p.Id;project=$project;engineExe=$editor;status='EDITOR_LAUNCH_REQUESTED_NOT_GPU_VERIFIED'}
 $data|ConvertTo-Json|Set-Content -LiteralPath $marker -Encoding utf8
 Write-Host "Native clinical UE Editor requested, PID=$($p.Id). In the FDI16 level, capture a real HighResShot 1920x1080."
 Write-Host 'Then run Collect while the Editor remains visibly rendering, and move camera gently during GPU sampling.'
 exit 0
}
if($Mode -eq 'Collect'){
 $captures=Join-Path $out 'Captures'
 if(-not (Test-Path -LiteralPath $captures)){New-Item -ItemType Directory -Path $captures | Out-Null}
 $capture=Join-Path $captures ('capture-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-fffffff'))
 if(Test-Path -LiteralPath $capture){throw "Refusing to overwrite capture: $capture"}
 New-Item -ItemType Directory -Path $capture | Out-Null
 $report=[ordered]@{
  schemaVersion=1;kind='SR1B native KlinikLab clinical GPU/pixel evidence (not Quest/Pixel Streaming)'
  sourceGitSHA=$sha;project=$project;ueVersion="$($ver.MajorVersion).$($ver.MinorVersion).$($ver.PatchVersion)"
  status='EVIDENCE_INCOMPLETE';matchedEditorPid=$null;editorStartUTC=$null
  logSHA256=$null;imageSHA256=$null;imageWidth=$null;imageHeight=$null
  nativeLogFreshForProcess=$false;nativeScreenshotFreshForProcess=$false
  sourceClinicalManifestMatched=$false;nativeClinicalLevelBuilt=$false
  selectedD3D12GPUClassification=$null;adapterIndexMappedToGPU=$false
  process3DCounterPositiveSamples=0;process3DMaxUtilizationPercent=0.0
  processSpecificGPUActivityCorroborated=$false;gpuAdapterLuidMatchedToNVIDIA=$false
  limitations=@('GPU 3D-engine counters identify the clinical process PID, but an independent Windows GPU-engine LUID to NVIDIA adapter mapping is still pending',
                'Original clinical screenshot requires independent pixel review before the local render gate passes')
  independentNativePixelReviewPassed=$false;clinicianAnatomyReviewPassed=$false
  pixelStreaming2Verified=$false;quest2Verified=$false;blockers=@()
 }
 function Block([string]$msg){$report.blockers=@($report.blockers)+@($msg)}
 try {
  $built=Get-Content (Join-Path $out 'unreal-clinical-level-build.json') -Raw|ConvertFrom-Json
  $export=Get-Content (Join-Path $exportDir 'kliniklab-export-manifest.json') -Raw|ConvertFrom-Json
  $report.sourceClinicalManifestMatched=($built.sourceGitSHA -eq $sha -and $export.sourceGitSHA -eq $sha -and
   $built.clinicalMeshManifestSHA256 -eq (Get-FileHash (Join-Path $exportDir 'kliniklab-export-manifest.json') -Algorithm SHA256).Hash.ToLowerInvariant())
  $report.nativeClinicalLevelBuilt=($built.status -eq 'NATIVE_LEVEL_CREATED_PENDING_GPU_AND_PIXEL_EVIDENCE' -and
   (Test-Path -LiteralPath (Join-Path $out 'Project\Content\Maps\L_KlinikLab_FDI16.umap')))
  if(-not $report.sourceClinicalManifestMatched -or -not $report.nativeClinicalLevelBuilt){Block 'Native clinical level/export provenance not verified'}
  $procs=@(Get-CimInstance Win32_Process -Filter "Name = 'UnrealEditor.exe'" -ErrorAction Stop | Where-Object {
   [string]::Equals([IO.Path]::GetFullPath([string]$_.ExecutablePath),[IO.Path]::GetFullPath($editor),[StringComparison]::OrdinalIgnoreCase) -and
   ([string]$_.CommandLine).IndexOf($project,[StringComparison]::OrdinalIgnoreCase) -ge 0
  })
  if($procs.Count -ne 1){Block "Expected exactly one currently-running clinical UE5.8 project editor, observed $($procs.Count)"}
  else{
   $p=$procs[0]
   $report.matchedEditorPid=[int]$p.ProcessId
   $started=([DateTime]$p.CreationDate).ToUniversalTime()
   $report.editorStartUTC=$started.ToString('o')
   $logDir=Join-Path $out 'Project\Saved\Logs'
   $logs=@(Get-ChildItem -LiteralPath $logDir -Filter '*.log' -File -ErrorAction SilentlyContinue|Sort-Object LastWriteTimeUtc -Descending)
   if(-not $logs.Count){Block 'No real native clinical Unreal log'}
   else {
    $log=$logs[0]
    $report.nativeLogFreshForProcess=$log.LastWriteTimeUtc -ge $started
    Copy-Item -LiteralPath $log.FullName -Destination (Join-Path $capture 'unreal-clinical-native.log')
    $report.logSHA256=(Get-FileHash (Join-Path $capture 'unreal-clinical-native.log') -Algorithm SHA256).Hash.ToLowerInvariant()
    if(-not $report.nativeLogFreshForProcess){Block 'Stale log predates running clinical editor'}
   }
   $shotDirs=@('Saved\Screenshots\WindowsEditor','Saved\Screenshots\Windows')
   $shots=@(foreach($folder in $shotDirs){
    Get-ChildItem -LiteralPath (Join-Path (Join-Path $out 'Project') $folder) -File -Filter '*.png' -ErrorAction SilentlyContinue
   })
   $shots=@($shots | Sort-Object LastWriteTimeUtc -Descending)
   if(-not $shots.Count){Block 'No real native UE clinical HighResShot PNG; capture in running Editor'}
   else{
    $shot=$shots[0]
    $report.nativeScreenshotFreshForProcess=$shot.LastWriteTimeUtc -ge $started
    Copy-Item -LiteralPath $shot.FullName -Destination (Join-Path $capture 'unreal-clinical-viewport.png')
    $dest=Join-Path $capture 'unreal-clinical-viewport.png'
    $report.imageSHA256=(Get-FileHash $dest -Algorithm SHA256).Hash.ToLowerInvariant()
    $bytes=[IO.File]::ReadAllBytes($dest)
    if($bytes.Length -lt 10000 -or ([BitConverter]::ToString($bytes,0,8)) -ne '89-50-4E-47-0D-0A-1A-0A'){
     Block 'PNG signature/screenshot size invalid'
    }else{
     $report.imageWidth=[int]($bytes[16]*16777216 + $bytes[17]*65536 + $bytes[18]*256 + $bytes[19])
     $report.imageHeight=[int]($bytes[20]*16777216 + $bytes[21]*65536 + $bytes[22]*256 + $bytes[23])
     if($report.imageWidth -lt 1280 -or $report.imageHeight -lt 720){Block 'Clinical screenshot resolution too low'}
    }
    if(-not $report.nativeScreenshotFreshForProcess){Block 'Native screenshot predates matched clinical editor'}
   }
   if($report.nativeLogFreshForProcess){
    $preflight=Join-Path $PSScriptRoot 'sr1-dedicated-gpu-preflight.mjs'
    & node $preflight "--expected-sha=$sha" "--gpu-index=$GpuIndex" "--output=$(Join-Path $capture 'nvenc-preflight.json')" | Out-Null
    if($LASTEXITCODE -ne 0){Block 'NVIDIA/NVENC preflight failed (no software fallback)'}
    else{
     $pf=Get-Content (Join-Path $capture 'nvenc-preflight.json') -Raw|ConvertFrom-Json
     $adapterJson=(& node (Join-Path $PSScriptRoot 'sr1-unreal-adapter-evidence.mjs') "--log=$(Join-Path $capture 'unreal-clinical-native.log')" "--expected-gpu=$($pf.gpu.name)" | Out-String)
     if($LASTEXITCODE -ne 0){Block 'Native D3D12 GPU log parser failed'}
     else{
      $adapter=$adapterJson|ConvertFrom-Json
      $report.selectedD3D12GPUClassification=[string]$adapter.classification
      $report.adapterIndexMappedToGPU=[bool]$adapter.adapterIndexMappedToGPU
      if(-not $adapter.evidenceFound -or -not $adapter.adapterIndexMappedToGPU){Block 'Native GPU log adapter/index evidence incomplete'}
     }
    }
   }
   # A separate independent observed Windows performance counter trace from the
   # *specific clinical UnrealEditor.exe PID*. Never substitute FFmpeg NVENC.
   try{
    $samples=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 16 -ErrorAction Stop)
    $gpu=@(foreach($sample in $samples){
     foreach($metric in $sample.CounterSamples){
      if($metric.Path -match "pid_$($p.ProcessId)_" -and $metric.Path -match '(?i)engtype_3d'){
       [ordered]@{timeUTC=$sample.Timestamp.ToUniversalTime().ToString('o');counter=$metric.Path;utilizationPercent=[double]$metric.CookedValue}
      }
     }
    })
    $gpu|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $capture 'gpu-engine-3d-pid-samples.json') -Encoding utf8
    $positive=@($gpu|Where-Object {$_.utilizationPercent -gt 0.05})
    $report.process3DCounterPositiveSamples=$positive.Count
    if($gpu.Count){$report.process3DMaxUtilizationPercent=[double](($gpu | Measure-Object utilizationPercent -Maximum).Maximum)}
    $report.processSpecificGPUActivityCorroborated=($positive.Count -ge 3)
    if(-not $report.processSpecificGPUActivityCorroborated){Block 'No sufficient nonzero clinical editor PID GPU 3D counters'}
    # Per-process GPU 3D counter activity is corroboration only.
    # LUID/physical NVIDIA adapter mapping remains explicitly unproven;
    # keep this as a stated limitation, not a fabricated acceptance.
   }catch{Block ('Windows GPU Engine counters unavailable: '+$_.Exception.Message)}
  }
  if($report.blockers.Count -eq 0){$report.status='NATIVE_CLINICAL_EVIDENCE_COLLECTED_PENDING_INDEPENDENT_REVIEW'}
 }catch{Block $_.Exception.Message}
 finally{
  $report|ConvertTo-Json -Depth 12|Set-Content -LiteralPath (Join-Path $capture 'clinical-capture-report.json') -Encoding utf8
  Write-Host "Native SR1B clinical capture status: $($report.status)"
  Write-Host "Capture directory: $capture"
  Write-Host "NOTE: Clinical native screenshot pixels, model/mat identity, per-GPU LUID and anatomy remain independent REVIEW."
 }
 if($report.status -ne 'NATIVE_CLINICAL_EVIDENCE_COLLECTED_PENDING_INDEPENDENT_REVIEW'){exit 2}
}
