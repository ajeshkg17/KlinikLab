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
$currentIdentity=[Security.Principal.WindowsIdentity]::GetCurrent()
$currentUserSid=if($null -ne $currentIdentity.User){$currentIdentity.User.Value}else{''}
$principal=[string]$task.Principal.UserId
$taskPrincipalSid=''
try{$taskPrincipalSid=([Security.Principal.SecurityIdentifier]::new($principal)).Value}catch{
 try{$taskPrincipalSid=([Security.Principal.NTAccount]::new($principal)).Translate([Security.Principal.SecurityIdentifier]).Value}catch{}
}
$taskPrincipalSidResolved=(-not [string]::IsNullOrWhiteSpace($taskPrincipalSid))
$currentLoginMatchesTaskPrincipal=($taskPrincipalSidResolved -and -not [string]::IsNullOrWhiteSpace($currentUserSid) -and $currentUserSid -ceq $taskPrincipalSid)
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
 (Test-Path -LiteralPath $taskWorkerDirectory -PathType Container))
$taskInstallScriptExists=($null -ne $taskInstallScript -and
 (Test-Path -LiteralPath $taskInstallScript -PathType Leaf))
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
$ledgerTopLevelKeys=@();$ledgerCompletedPropertyPresent=$false;$ledgerCompletedEntryCount=0
if($ledgerPresent){
 $ledgerSha=(Get-FileHash -LiteralPath $ledgerPath -Algorithm SHA256).Hash.ToLowerInvariant()
 try{
  $ledger=Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json -ErrorAction Stop
  $ledgerTopLevelKeys=@($ledger.PSObject.Properties.Name)
  $ledgerCompletedPropertyPresent=($null -ne $ledger.completed)
  if($null -ne $ledger.completed){
   $ledgerCompletedEntryCount=@($ledger.completed.PSObject.Properties).Count
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
# A bare Get-Process PID existence test is UNSAFE: Windows can recycle the PID.
# A Chrome renderer reused the stale job13 heartbeat PID. Only attribute liveness
# to the watcher after matching Node executable + exact task script + --watch,
# plus process creation UTC preceding the recorded heartbeat/lease timestamp.
# Never emit raw command lines or user-private paths to a public issue.
$expectedWatchScript=if($taskWorkerDirectoryExists){Join-Path $taskWorkerDirectory 'visual-qa\godot-worker.mjs'}else{''}
function Get-KLSanitizedWatcherProcess([int]$ProcessId,[string]$RecordAt,[bool]$RequireRecentStart){
 $item=[ordered]@{pid=$ProcessId;pidPresent=$false;identityVerified=$false
  executableIsNode=$false;scriptIsExactTaskWorker=$false;watchModeMatched=$false
  processCreatedUTC=$null;cimCreationDateKind=$null;recordedAtParsed=$false;createdBeforeRecordedAt=$false
  startNearRecordedAt=$false;reason='PID_NOT_PRESENT_OR_CIM_UNAVAILABLE'}
 if($ProcessId -le 0){return [pscustomobject]$item}
 try{
  $p=Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId = '+$ProcessId) -ErrorAction Stop
  if($null -eq $p){return [pscustomobject]$item}
  $item.pidPresent=$true
  $base=[IO.Path]::GetFileName([string]$p.ExecutablePath)
  if([string]::IsNullOrWhiteSpace($base)){$base=[string]$p.Name}
  $item.executableIsNode=($base -ieq 'node.exe')
  $cmd=[string]$p.CommandLine
  $item.scriptIsExactTaskWorker=($expectedWatchScript.Length -gt 0 -and
    $cmd.IndexOf($expectedWatchScript,[StringComparison]::OrdinalIgnoreCase) -ge 0)
  $item.watchModeMatched=($cmd -match '(?i)(?:^|\s)--watch(?:\s|$)')
  if($null -ne $p.CreationDate){
   $created=([datetime]$p.CreationDate).ToUniversalTime()
   $item.processCreatedUTC=$created.ToString('o')
   $item.cimCreationDateKind=[string]([datetime]$p.CreationDate).Kind
   $when=[DateTimeOffset]::MinValue
   if([DateTimeOffset]::TryParse($RecordAt,[Globalization.CultureInfo]::InvariantCulture,
       [Globalization.DateTimeStyles]::RoundtripKind,[ref]$when)){
    $item.recordedAtParsed=$true
    $item.createdBeforeRecordedAt=($created -le $when.UtcDateTime.AddSeconds(5))
    $elapsed=($when.UtcDateTime - $created).TotalSeconds
    $item.startNearRecordedAt=($elapsed -ge -5 -and $elapsed -le 180)
   }
  }
  $explicitZone=($RecordAt -match '(?i)(?:Z|[+-][0-9]{2}:[0-9]{2})$')
  $item.identityVerified=($item.executableIsNode -and $item.scriptIsExactTaskWorker -and
    $item.watchModeMatched -and $explicitZone -and $item.createdBeforeRecordedAt -and
    (-not $RequireRecentStart -or $item.startNearRecordedAt))
  $item.reason=if($item.identityVerified){'EXACT_NODE_WORKER_AND_PROCESS_TIME_MATCH'}else{'PID_REUSED_OR_WORKER_IDENTITY_UNVERIFIED'}
 }catch{$item.reason='CIM_PROCESS_QUERY_FAILED_CLOSED'}
 return [pscustomobject]$item
}
$heartbeatJobId=$null;$heartbeatStatus=$null;$heartbeatPid=$null;$heartbeatAt=$null
$heartbeatProcessAlive=$false;$heartbeatPidExists=$false;$heartbeatPidIdentity=$null
if($heartbeatExists){
 try{$hb=Get-Content -LiteralPath $heartPath -Raw | ConvertFrom-Json -ErrorAction Stop
  $heartbeatJobId=[string]$hb.jobId;$heartbeatStatus=[string]$hb.status
  $heartbeatPid=[int]$hb.pid;$heartbeatAt=[string]$hb.at
  $heartbeatPidIdentity=Get-KLSanitizedWatcherProcess $heartbeatPid $heartbeatAt $false
  $heartbeatPidExists=[bool]$heartbeatPidIdentity.pidPresent
  $heartbeatProcessAlive=[bool]$heartbeatPidIdentity.identityVerified
 }catch{}
}
# The worker lease is READ ONLY. A stale/mismatched lease is a hold, never
# permission to erase it or recreate the task.
$leaseFile=Join-Path $root 'godot-worker-active.lock'
$workerLeaseExists=Test-Path -LiteralPath $leaseFile -PathType Leaf
$workerLeasePid=$null;$workerLeaseStartedAt=$null;$workerLeaseIdentity=$null
$workerLeaseJobPollerMatched=$false;$workerLeaseParseError=$null
if($workerLeaseExists){
 try{
  $lease=Get-Content -LiteralPath $leaseFile -Raw | ConvertFrom-Json -ErrorAction Stop
  $workerLeasePid=[int]$lease.pid
  $workerLeaseStartedAt=[string]$lease.startedAt
  $workerLeaseJobPollerMatched=([string]$lease.jobPoller -ceq 'visual-qa/godot-worker.mjs')
  $workerLeaseIdentity=Get-KLSanitizedWatcherProcess $workerLeasePid $workerLeaseStartedAt $true
 }catch{$workerLeaseParseError=$_.Exception.GetType().Name}
}
# Classify live task-related processes without publishing command lines, paths
# or other users' process details. This is a safety inventory, not task control.
$matchingWatcherProcesses=@();$taskLauncherProcesses=@()
$processEnumerationComplete=$false;$nodeCommandLineUnavailableCount=0
try{
 $running=@(Get-CimInstance -ClassName Win32_Process -Filter "Name = 'node.exe' OR Name = 'powershell.exe' OR Name = 'pwsh.exe'" -ErrorAction Stop)
 $processEnumerationComplete=$true
 foreach($proc in $running){
  $cmd=[string]$proc.CommandLine
  $exe=[string]$proc.Name
  if($exe -ieq 'node.exe' -and [string]::IsNullOrWhiteSpace($cmd)){$nodeCommandLineUnavailableCount++;continue}
  $taskScript=($expectedWatchScript.Length -gt 0 -and
    $cmd.IndexOf($expectedWatchScript,[StringComparison]::OrdinalIgnoreCase) -ge 0)
  $launcher=($taskInstallScriptExists -and
    $cmd.IndexOf($taskInstallScript,[StringComparison]::OrdinalIgnoreCase) -ge 0)
  $createdString=if($null -ne $proc.CreationDate){([datetime]$proc.CreationDate).ToUniversalTime().ToString('o')}else{$null}
  if($taskScript -and $exe -ieq 'node.exe'){
   $matchingWatcherProcesses+=@{pid=[int]$proc.ProcessId;createdUTC=$createdString
     watchMode=($cmd -match '(?i)(?:^|\s)--watch(?:\s|$)')
     isHeartbeatPid=([int]$proc.ProcessId -eq $heartbeatPid)
     isLeasePid=([int]$proc.ProcessId -eq $workerLeasePid)}
  }elseif($launcher -and $exe -in @('powershell.exe','pwsh.exe')){
   $taskLauncherProcesses+=@{pid=[int]$proc.ProcessId;createdUTC=$createdString}
  }
 }
}catch{$processEnumerationComplete=$false}
$taskRefreshSafetyHold=($workerLeaseExists -or $matchingWatcherProcesses.Count -gt 0 -or
 $taskLauncherProcesses.Count -gt 0 -or -not $processEnumerationComplete -or
 $nodeCommandLineUnavailableCount -gt 0)

# Diagnose lease clock ambiguity without silently accepting a different zone.
# The producer writes toISOString() (UTC Z); older/malformed lease clocks may
# omit the zone. Compare both hypotheses and keep either outcome read-only.
function Get-KLClockCandidates([int]$ProcessId,[string]$RawTime){
 $out=[ordered]@{pid=$ProcessId;hasExplicitOffset=$false;processCreatedUTC=$null
  cimKind=$null;deltaAssumingUTCSeconds=$null;deltaAssumingLocalSeconds=$null
  deltaFromRoundtripParseSeconds=$null;creationCrossCheckSeconds=$null
  processLocated=$false;ambiguousZone=$false}
 $out.hasExplicitOffset=($RawTime -match '(?i)(?:Z|[+-][0-9]{2}:[0-9]{2})$')
 $out.ambiguousZone=(-not $out.hasExplicitOffset)
 try{
  $p=Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId = '+$ProcessId) -ErrorAction Stop
  if($null -eq $p){return [pscustomobject]$out}
  $out.processLocated=$true
  $stamp=[datetime]$p.CreationDate
  $out.cimKind=[string]$stamp.Kind
  $created=$stamp.ToUniversalTime()
  $out.processCreatedUTC=$created.ToString('o')
  try{$native=(Get-Process -Id $ProcessId -ErrorAction Stop).StartTime.ToUniversalTime()
    $out.creationCrossCheckSeconds=[math]::Round(($native-$created).TotalSeconds,3)}catch{}
  $parsed=[DateTimeOffset]::MinValue
  if([DateTimeOffset]::TryParse($RawTime,[Globalization.CultureInfo]::InvariantCulture,
   [Globalization.DateTimeStyles]::RoundtripKind,[ref]$parsed)){
   $out.deltaFromRoundtripParseSeconds=[math]::Round(($parsed.UtcDateTime-$created).TotalSeconds,3)
  }
  if(-not $out.hasExplicitOffset){
   $utc=[DateTimeOffset]::MinValue
   if([DateTimeOffset]::TryParse($RawTime,[Globalization.CultureInfo]::InvariantCulture,
    [Globalization.DateTimeStyles]::AssumeUniversal,[ref]$utc)){
    $out.deltaAssumingUTCSeconds=[math]::Round(($utc.UtcDateTime-$created).TotalSeconds,3)
   }
   $local=[DateTimeOffset]::MinValue
   if([DateTimeOffset]::TryParse($RawTime,[Globalization.CultureInfo]::InvariantCulture,
    [Globalization.DateTimeStyles]::AssumeLocal,[ref]$local)){
    $out.deltaAssumingLocalSeconds=[math]::Round(($local.UtcDateTime-$created).TotalSeconds,3)
   }
  }
 }catch{}
 return [pscustomobject]$out
}
$workerLeaseClock=$null;$workerLeaseFileCreatedUTC=$null;$workerLeaseFileModifiedUTC=$null
$watcherDirectChildren=@();$watcherChildInspectionComplete=$false
if($workerLeaseExists){
 try{
  $leaseMeta=Get-Item -LiteralPath $leaseFile -ErrorAction Stop
  $workerLeaseFileCreatedUTC=$leaseMeta.CreationTimeUtc.ToString('o')
  $workerLeaseFileModifiedUTC=$leaseMeta.LastWriteTimeUtc.ToString('o')
 }catch{}
 if($workerLeasePid -gt 0){
  $workerLeaseClock=Get-KLClockCandidates $workerLeasePid $workerLeaseStartedAt
  # Direct descendants only; absence does not establish that no capture is live.
  try{
   $children=@(Get-CimInstance -ClassName Win32_Process -Filter ('ParentProcessId = '+$workerLeasePid) -ErrorAction Stop)
   $watcherChildInspectionComplete=$true
   foreach($child in $children){
    $kind='other'
    if([string]$child.Name -match '(?i)^node[.]exe$'){$kind='node'}
    elseif([string]$child.Name -match '(?i)^(KlinikLab|Godot).*[.]exe$'){$kind='godot_or_exported_app'}
    elseif([string]$child.Name -match '(?i)^(powershell|pwsh)[.]exe$'){$kind='powershell'}
    $created=$null
    if($null -ne $child.CreationDate){$created=([datetime]$child.CreationDate).ToUniversalTime().ToString('o')}
    $watcherDirectChildren+=@{pid=[int]$child.ProcessId;kind=$kind;createdUTC=$created}
   }
  }catch{$watcherChildInspectionComplete=$false}
 }
}
$runtimeWorkerSha=$null;$runtimeCurrentJob=$null;$runtimeUpdatedUTC=$null
if($runtimeExists){
 try{$receipt=Get-Content -LiteralPath $runtimePath -Raw | ConvertFrom-Json -ErrorAction Stop
  $runtimeWorkerSha=[string]$receipt.workerGitSHA
  $runtimeCurrentJob=[string]$receipt.currentApprovedJob
  $runtimeUpdatedUTC=[string]$receipt.updatedUTC
 }catch{}
}
# Log inspection is summary-only: never emit raw logs, paths, tokens or credentials.
$latestStdout=$null;$latestStderr=$null
try{$latestStdout=Get-ChildItem -LiteralPath $root -Filter 'godot-watcher-*-stdout.log' -File |
 Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1}catch{}
try{$latestStderr=Get-ChildItem -LiteralPath $root -Filter 'godot-watcher-*-stderr.log' -File |
 Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1}catch{}
$latestStdoutWriteUtc=$null;$latestStderrWriteUtc=$null
if($null -ne $latestStdout){$latestStdoutWriteUtc=$latestStdout.LastWriteTimeUtc.ToString('o')}
if($null -ne $latestStderr){$latestStderrWriteUtc=$latestStderr.LastWriteTimeUtc.ToString('o')}
$stdoutPublished=$false;$stdoutLedgerReconciliation=$false;$stdoutExistingEvidenceReconciliation=$false
$stdoutRemoteReconciliation=$false;$stdoutBlocked=$false
if($null -ne $latestStdout){
 try{
  $tail=Get-Content -LiteralPath $latestStdout.FullName -Tail 300 -ErrorAction Stop
  $stdoutPublished=[bool](@($tail | Select-String -SimpleMatch 'Godot PC evidence published').Count -gt 0)
  $stdoutExistingEvidenceReconciliation=[bool](@($tail | Select-String -SimpleMatch 'existing-original-evidence-ledger-reconciliation-required').Count -gt 0)
  $stdoutRemoteReconciliation=[bool](@($tail | Select-String -SimpleMatch 'remote-original-published-ledger-reconciliation-required').Count -gt 0)
  $stdoutLedgerReconciliation=($stdoutExistingEvidenceReconciliation -or $stdoutRemoteReconciliation)
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
 currentLoginMatchesTaskPrincipal=$currentLoginMatchesTaskPrincipal
 taskPrincipalSidResolved=$taskPrincipalSidResolved
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
 ledgerTopLevelKeys=$ledgerTopLevelKeys;ledgerCompletedPropertyPresent=$ledgerCompletedPropertyPresent
 ledgerCompletedEntryCount=$ledgerCompletedEntryCount
 localLedgerHasJob=$entryPresent;jobStatus=$status;ledgerParseErrors=$ledgerErrors
 localOriginalEvidenceFolderExists=$originalEvidenceExists
 localOriginalEvidenceFileCount=$originalEvidenceFileCount
 heartbeatExists=$heartbeatExists;heartbeatJobId=$heartbeatJobId;heartbeatStatus=$heartbeatStatus
 heartbeatPid=$heartbeatPid;heartbeatAt=$heartbeatAt
 heartbeatPidExists=$heartbeatPidExists;heartbeatProcessAlive=$heartbeatProcessAlive
 heartbeatPidIdentity=$heartbeatPidIdentity
 workerLeaseExists=$workerLeaseExists;workerLeasePid=$workerLeasePid
 workerLeaseStartedAt=$workerLeaseStartedAt;workerLeaseJobPollerMatched=$workerLeaseJobPollerMatched
 workerLeaseIdentity=$workerLeaseIdentity;workerLeaseParseError=$workerLeaseParseError
 workerLeaseClock=$workerLeaseClock
 workerLeaseFileCreatedUTC=$workerLeaseFileCreatedUTC
 workerLeaseFileModifiedUTC=$workerLeaseFileModifiedUTC
 watcherDirectChildren=$watcherDirectChildren
 watcherChildInspectionComplete=$watcherChildInspectionComplete
 processEnumerationComplete=$processEnumerationComplete
 nodeCommandLineUnavailableCount=$nodeCommandLineUnavailableCount
 matchingWatcherProcesses=$matchingWatcherProcesses;taskLauncherProcesses=$taskLauncherProcesses
 taskRefreshSafetyHold=$taskRefreshSafetyHold
 localOriginalEvidenceWithoutTerminalLedger=($originalEvidenceExists -and -not $entryPresent)
 ledgerRepairAuthorized=$false
 runtimeReceiptExists=$runtimeExists;runtimeWorkerSha=$runtimeWorkerSha;runtimeCurrentApprovedJob=$runtimeCurrentJob;runtimeUpdatedUTC=$runtimeUpdatedUTC
 latestWorkerStdoutExists=($null -ne $latestStdout)
 latestWorkerStdoutLastWriteUTC=$latestStdoutWriteUtc
 latestWorkerStderrLastWriteUTC=$latestStderrWriteUtc
 latestWorkerStdoutPublishedMessage=$stdoutPublished
 latestWorkerStdoutLedgerReconciliationMessage=$stdoutLedgerReconciliation
 latestWorkerStdoutExistingEvidenceReconciliationMessage=$stdoutExistingEvidenceReconciliation
 latestWorkerStdoutRemotePublishedReconciliationMessage=$stdoutRemoteReconciliation
 latestWorkerStdoutBlockedMessage=$stdoutBlocked
 latestWorkerStderrNonEmpty=($null -ne $latestStderr -and $latestStderr.Length -gt 0)
 systemWideGpu3dPdhStatusCounts=$pdhStatusCounts;systemWideGpuCounterErrors=$pdhErrorTypes
 status3221228486='PDH_INVALID_DATA (0xC0000BC6)'
 systemWidePdhDoesNotProveSamePidRtx3d=$true
}
$report | ConvertTo-Json -Depth 8
