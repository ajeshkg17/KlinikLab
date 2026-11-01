# SR16: safe owner-login / scheduled-task identity + GPU PDH diagnostics only.
# This script NEVER launches Godot, changes the watcher task, repairs a ledger,
# records credentials or captures screenshots. Job09/job10 remain immutable.
[CmdletBinding()]
param(
 [string]$JobId='pc-godot-exported-20261101-cc0-job09-ed3239',
 [string]$ExpectedSha='ed3239c85a499205bf76b13395dc54c87b8ffe75'
)
$ErrorActionPreference='Stop'
if($JobId -notmatch '^pc-godot-exported-[a-zA-Z0-9-]+$'){throw 'Unsafe job ID'}
if($ExpectedSha -notmatch '^[a-f0-9]{40}$'){throw 'Expected exact 40-character source SHA'}
# Match the Node worker's ROOT calculation exactly; compare with the Windows
# known-folder value rather than silently assuming both resolve identically.
$envLocalAppData=[Environment]::GetEnvironmentVariable('LOCALAPPDATA','Process')
$knownLocalAppData=[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
if(-not [string]::IsNullOrWhiteSpace($envLocalAppData)){
 $workerRootBase=$envLocalAppData
}else{
 $workerRootBase=Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)) '.local\share'
}
$root=Join-Path $workerRootBase 'KlinikLabGodotWorker'
$knownRoot=Join-Path $knownLocalAppData 'KlinikLabGodotWorker'
$ledgerPath=Join-Path $root 'godot-ledger.json'
$heartPath=Join-Path $root 'godot-heartbeat.json'
$runtimePath=Join-Path $root 'godot-watcher-runtime.json'
$task=Get-ScheduledTask -TaskName 'KlinikLab-Godot-PC-Watcher' -ErrorAction Stop
$me=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal=[string]$task.Principal.UserId
$actions=@($task.Actions)
$actionArgs=''
$actionExe=''
if($actions.Count -eq 1){
 $actionArgs=[string]$actions[0].Arguments
 $actionExe=[string]$actions[0].Execute
}
$taskWorkerDirectory=$null;$taskWorkerSha=$null;$taskInstallScript=$null
if($actionArgs -match '(?i)(?:^|\s)-WorkerDirectory\s+"([^"]+)"'){$taskWorkerDirectory=$Matches[1]}
if($actionArgs -match '(?i)(?:^|\s)-ExpectedWorkerSha\s+([a-f0-9]{40})(?:\s|$)'){$taskWorkerSha=$Matches[1]}
if($actionArgs -match '(?i)-File\s+"([^"]*install-godot-pc-watcher\.ps1)"'){$taskInstallScript=$Matches[1]}
$taskWorkerDirectoryExists=($null -ne $taskWorkerDirectory -and
 Test-Path -LiteralPath $taskWorkerDirectory -PathType Container)
$taskInstallScriptExists=($null -ne $taskInstallScript -and
 Test-Path -LiteralPath $taskInstallScript -PathType Leaf)
$taskActionExecutableExists=($null -ne $actionExe -and
 (Test-Path -LiteralPath $actionExe -PathType Leaf))
$taskWorkerHead=$null;$taskWorkerHeadMatchesTaskSha=$false
if($taskWorkerDirectoryExists -and (Get-Command git.exe -ErrorAction SilentlyContinue)){
 try{
  $headText=& git.exe -C $taskWorkerDirectory rev-parse HEAD 2>$null
  if($LASTEXITCODE -eq 0){$taskWorkerHead=([string]$headText).Trim()}
  $taskWorkerHeadMatchesTaskSha=($null -ne $taskWorkerSha -and $taskWorkerHead -ceq $taskWorkerSha)
 }catch{}
}
$ledgerPresent=Test-Path -LiteralPath $ledgerPath -PathType Leaf
$entryPresent=$false;$status=$null;$ledgerSha=$null;$ledgerErrors=@()
if($ledgerPresent){
 $ledgerSha=(Get-FileHash -LiteralPath $ledgerPath -Algorithm SHA256).Hash.ToLowerInvariant()
 try{
  $ledger=Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json -ErrorAction Stop
  if($null -ne $ledger.completed){
   $entry=$ledger.completed.PSObject.Properties[$JobId]
   $entryPresent=($null -ne $entry)
   if($entryPresent){$status=[string]$entry.Value.status}
  }
 }catch{$ledgerErrors+=('Parse failure: '+$_.Exception.GetType().Name)}
}
# Critical: evidence directory suffix must derive from the supplied exact SHA.
# The previous probe hard-coded job09's ed3239c85a suffix for every job.
$originalEvidenceDir=Join-Path (Join-Path $root 'godot-evidence') ($JobId+'-'+$ExpectedSha.Substring(0,10))
$originalEvidenceExists=Test-Path -LiteralPath $originalEvidenceDir -PathType Container
$originalEvidenceFileCount=0
if($originalEvidenceExists){
 $originalEvidenceFileCount=@(Get-ChildItem -LiteralPath $originalEvidenceDir -File -Recurse -ErrorAction SilentlyContinue).Count
}
$heartbeatExists=Test-Path -LiteralPath $heartPath -PathType Leaf
$runtimeExists=Test-Path -LiteralPath $runtimePath -PathType Leaf
$heartbeatJobId=$null;$heartbeatStatus=$null
if($heartbeatExists){
 try{$hb=Get-Content -LiteralPath $heartPath -Raw | ConvertFrom-Json -ErrorAction Stop
  $heartbeatJobId=[string]$hb.jobId;$heartbeatStatus=[string]$hb.status
 }catch{}
}
$runtimeWorkerSha=$null;$runtimeCurrentJob=$null
if($runtimeExists){
 try{$receipt=Get-Content -LiteralPath $runtimePath -Raw | ConvertFrom-Json -ErrorAction Stop
  $runtimeWorkerSha=[string]$receipt.workerGitSHA
  $runtimeCurrentJob=[string]$receipt.currentApprovedJob
 }catch{}
}
# Log inspection is summary-only: never emit raw logs, paths, tokens or credentials.
$latestStdout=$null;$latestStderr=$null
try{$latestStdout=Get-ChildItem -LiteralPath $root -Filter 'godot-watcher-*-stdout.log' -File |
 Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1}catch{}
try{$latestStderr=Get-ChildItem -LiteralPath $root -Filter 'godot-watcher-*-stderr.log' -File |
 Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1}catch{}
$stdoutPublished=$false;$stdoutLedgerReconciliation=$false;$stdoutBlocked=$false
if($null -ne $latestStdout){
 try{
  $tail=Get-Content -LiteralPath $latestStdout.FullName -Tail 300 -ErrorAction Stop
  $stdoutPublished=[bool](@($tail | Select-String -SimpleMatch 'Godot PC evidence published').Count -gt 0)
  $stdoutLedgerReconciliation=[bool](@($tail | Select-String -SimpleMatch 'remote-original-published-ledger-reconciliation-required').Count -gt 0)
  $stdoutBlocked=[bool](@($tail | Select-String -SimpleMatch 'Godot PC worker blocker').Count -gt 0)
 }catch{}
}
$pdhErrorTypes=@();$sampleRows=@();$pdhStatusCounts=@()
# System-wide provider check only. NO attribution to KlinikLab PID or RTX 5060.
try{
 $errs=@()
 $samples=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 3 -ErrorAction Continue -ErrorVariable +errs)
 foreach($snapshot in $samples){
  foreach($sample in @($snapshot.CounterSamples)){
   if($null -ne $sample -and [string]$sample.Path -match '(?i)engtype_3d'){
    $sampleRows+=([string]$sample.Status)
   }
  }
 }
 $pdhStatusCounts=@($sampleRows | Group-Object | ForEach-Object{@{status=[string]$_.Name;count=[int]$_.Count}})
 $pdhErrorTypes=@($errs | Select-Object -First 8 | ForEach-Object{[string]$_.CategoryInfo.Reason})
}catch{$pdhErrorTypes+=('Collector error: '+$_.Exception.GetType().Name)}
$report=[ordered]@{
 mode='READ_ONLY_OWNER_PC_TASK_PDH_AND_LEDGER_DIAGNOSTICS'
 noLedgerWrite=$true;noTaskChange=$true;noGodotLaunch=$true;noScreenCapture=$true
 jobId=$JobId;expectedSourceSHA=$ExpectedSha
 currentLoginMatchesTaskPrincipal=($me -ieq $principal)
 taskState=[string]$task.State;taskActionCount=$actions.Count
 taskActionExecutableExists=$taskActionExecutableExists
 taskInstallScriptExists=$taskInstallScriptExists
 taskWorkerDirectoryExists=$taskWorkerDirectoryExists
 taskWorkerSha=$taskWorkerSha;taskWorkerHead=$taskWorkerHead
 taskWorkerHeadMatchesTaskSha=$taskWorkerHeadMatchesTaskSha
 localAppDataEnvironmentPresent=(-not [string]::IsNullOrWhiteSpace($envLocalAppData))
 localAppDataMatchesKnownFolder=([IO.Path]::GetFullPath($workerRootBase) -ieq [IO.Path]::GetFullPath($knownLocalAppData))
 workerRootMatchesKnownFolder=([IO.Path]::GetFullPath($root) -ieq [IO.Path]::GetFullPath($knownRoot))
 localLedgerExists=$ledgerPresent;localLedgerSha256=$ledgerSha
 localLedgerHasJob=$entryPresent;jobStatus=$status;ledgerParseErrors=$ledgerErrors
 localOriginalEvidenceFolderExists=$originalEvidenceExists
 localOriginalEvidenceFileCount=$originalEvidenceFileCount
 heartbeatExists=$heartbeatExists;heartbeatJobId=$heartbeatJobId;heartbeatStatus=$heartbeatStatus
 runtimeReceiptExists=$runtimeExists;runtimeWorkerSha=$runtimeWorkerSha;runtimeCurrentApprovedJob=$runtimeCurrentJob
 latestWorkerStdoutExists=($null -ne $latestStdout)
 latestWorkerStdoutPublishedMessage=$stdoutPublished
 latestWorkerStdoutLedgerReconciliationMessage=$stdoutLedgerReconciliation
 latestWorkerStdoutBlockedMessage=$stdoutBlocked
 latestWorkerStderrNonEmpty=($null -ne $latestStderr -and $latestStderr.Length -gt 0)
 systemWideGpu3dPdhStatusCounts=$pdhStatusCounts;systemWideGpuCounterErrors=$pdhErrorTypes
 status3221228486='PDH_INVALID_DATA (0xC0000BC6)'
 systemWidePdhDoesNotProveSamePidRtx3d=$true
}
$report | ConvertTo-Json -Depth 8
