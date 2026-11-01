# SR27: bounded, READ-ONLY observation of existing owner-PC watcher activity.
# No task/process control, no Git fetch, no ledger/lease/heartbeat writes.
# Two snapshots DO NOT establish durable idleness or authorize task refresh.
[CmdletBinding()]
param([ValidateRange(12,30)][int]$ObservationSeconds=12)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'sr26-lease-raw-timestamp.ps1')
$root=Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)) 'KlinikLabGodotWorker'
$leasePath=Join-Path $root 'godot-worker-active.lock'
$ledgerPath=Join-Path $root 'godot-ledger.json'
$taskName='KlinikLab-Godot-PC-Watcher'
function Get-KLUtcString($stamp){
 if($null -eq $stamp){return $null}
 return ([datetime]$stamp).ToUniversalTime().ToString('o')
}
function Get-KLWatchSnapshot {
 $observation=[ordered]@{
  sampledAtUTC=[DateTime]::UtcNow.ToString('o')
  taskState=$null;taskActionCount=0;taskWorkerSha=$null
  leaseExists=$false;leaseSha256=$null;leaseStartedAt=$null
  leaseProcessPid=$null;leaseIdentityVerified=$false
  processEnumerationComplete=$false;descendantInspectionComplete=$false
  descendantCount=0;descendants=@();relatedOtherProcessCount=0
  ledgerExists=$false;ledgerSHA256=$null;ledgerParseAccepted=$false
  ledgerNonterminalEntryCount=$null
  evidenceDirectoryCount=$null;evidenceLatestWriteUTC=$null
  errorCategories=@()
 }
 try{
  $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  $observation.taskState=[string]$task.State
  $observation.taskActionCount=@($task.Actions).Count
  $actionArgs=if($observation.taskActionCount -eq 1){[string]$task.Actions[0].Arguments}else{''}
  $workerDir=$null
  if($actionArgs -match '(?i)(?:^|\s)-WorkerDirectory\s+"([^"]+)"'){$workerDir=$Matches[1]}
  if($actionArgs -match '(?i)(?:^|\s)-ExpectedWorkerSha\s+([a-f0-9]{40})(?:\s|$)'){
   $observation.taskWorkerSha=$Matches[1]
  }
  $expectedScript=if($workerDir){Join-Path $workerDir 'visual-qa\godot-worker.mjs'}else{''}
 }catch{$observation.errorCategories+=('TASK_'+$_.Exception.GetType().Name);$expectedScript=''}
 try{
  if(Test-Path -LiteralPath $leasePath -PathType Leaf){
   $observation.leaseExists=$true
   $observation.leaseSha256=(Get-FileHash -LiteralPath $leasePath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
   $raw=Get-Content -LiteralPath $leasePath -Raw -ErrorAction Stop
   $lease=$raw|ConvertFrom-Json -ErrorAction Stop
   $observation.leaseStartedAt=Get-KLRawLeaseTimestamp -JsonText $raw
   $observation.leaseProcessPid=[int]$lease.pid
   if([string]$lease.jobPoller -cne 'visual-qa/godot-worker.mjs'){
    $observation.errorCategories+='LEASE_POLLER_MISMATCH'
   }
  }
 }catch{$observation.errorCategories+=('LEASE_'+$_.Exception.GetType().Name)}
 try{
  $all=@(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop)
  $observation.processEnumerationComplete=$true
  $owner=@($all|Where-Object{[int]$_.ProcessId -eq [int]$observation.leaseProcessPid})
  if($observation.leaseExists -and $owner.Count -eq 1){
   $p=$owner[0];$cmd=[string]$p.CommandLine
   $created=([datetime]$p.CreationDate).ToUniversalTime()
   $timestamp=[DateTimeOffset]::MinValue
   $parsed=([DateTimeOffset]::TryParse([string]$observation.leaseStartedAt,
     [Globalization.CultureInfo]::InvariantCulture,
     [Globalization.DateTimeStyles]::RoundtripKind,[ref]$timestamp))
   $difference=if($parsed){($timestamp.UtcDateTime-$created).TotalSeconds}else{$null}
   $observation.leaseIdentityVerified=([string]$p.Name -ieq 'node.exe' -and
    $expectedScript.Length -gt 0 -and
    $cmd.IndexOf($expectedScript,[StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $cmd -match '(?i)(?:^|\s)--watch(?:\s|$)' -and
    [string]$observation.leaseStartedAt -match '(?i)(?:Z|[+-][0-9]{2}:[0-9]{2})$' -and
    $null -ne $difference -and $difference -ge -5 -and $difference -le 180)
   $observation.leaseProcessCreatedUTC=$created.ToString('o')
   $observation.leaseProcessToRecordDeltaSeconds=if($null -ne $difference){[math]::Round($difference,3)}else{$null}
   # Walk all children recursively. Reject PID-reuse edges created before parent.
   $front=@($p);$seen=@([int]$p.ProcessId)
   while($front.Count -gt 0){
    $next=@()
    foreach($parent in $front){
     $parentTime=([datetime]$parent.CreationDate).ToUniversalTime()
     foreach($child in @($all|Where-Object{[int]$_.ParentProcessId -eq [int]$parent.ProcessId})){
      if([int]$child.ProcessId -in $seen){continue}
      $seen+=([int]$child.ProcessId)
      $kind='other'
      if([string]$child.Name -match '(?i)^(KlinikLab|Godot).*\.exe$'){$kind='godot_or_exported_app'}
      elseif([string]$child.Name -match '(?i)^(powershell|pwsh)\.exe$'){$kind='powershell'}
      elseif([string]$child.Name -ieq 'node.exe'){$kind='node'}
      $childTime=if($null -ne $child.CreationDate){([datetime]$child.CreationDate).ToUniversalTime()}else{$null}
      $lineagePlausible=($null -ne $childTime -and $childTime -ge $parentTime)
      $observation.descendants+=@{pid=[int]$child.ProcessId
       kind=$kind;createdUTC=if($null -ne $childTime){$childTime.ToString('o')}else{$null}
       lineagePlausible=$lineagePlausible}
      if($lineagePlausible){$next+=($child)}
     }
    }
    $front=@($next)
   }
   $observation.descendantInspectionComplete=$true
  }elseif($observation.leaseExists){$observation.errorCategories+='LEASE_PROCESS_NOT_UNIQUELY_IDENTIFIED'}
  # Detached/old capture processes cannot be ruled out by this PID tree.
  $observation.relatedOtherProcessCount=@($all|Where-Object{
   $_.Name -match '(?i)^(KlinikLab|Godot).*\.exe$' -and
   [int]$_.ProcessId -notin $seen
  }).Count
 }catch{$observation.errorCategories+=('PROCESS_'+$_.Exception.GetType().Name)}
 $observation.descendantCount=@($observation.descendants).Count
 try{
  if(Test-Path -LiteralPath $ledgerPath -PathType Leaf){
   $observation.ledgerExists=$true
   $observation.ledgerSHA256=(Get-FileHash -LiteralPath $ledgerPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
   $ledger=Get-Content -LiteralPath $ledgerPath -Raw -ErrorAction Stop|ConvertFrom-Json -ErrorAction Stop
   if($null -eq $ledger.completed){throw 'LEDGER_NO_COMPLETED'}
   $observation.ledgerParseAccepted=$true
   $observation.ledgerNonterminalEntryCount=@($ledger.completed.PSObject.Properties.Value|
    Where-Object{$_.status -in @('executing','publish-pending')}).Count
  }
 }catch{$observation.errorCategories+=('LEDGER_'+$_.Exception.GetType().Name)}
 try{
  $evidenceDir=Join-Path $root 'godot-evidence'
  $directories=@(Get-ChildItem -LiteralPath $evidenceDir -Directory -ErrorAction Stop)
  $observation.evidenceDirectoryCount=$directories.Count
  $latest=$null
  foreach($dir in $directories){
   $file=Get-ChildItem -LiteralPath $dir.FullName -File -Recurse -ErrorAction Stop|
    Sort-Object LastWriteTimeUtc -Descending|Select-Object -First 1
   if($null -ne $file -and ($null -eq $latest -or $file.LastWriteTimeUtc -gt $latest)){
    $latest=$file.LastWriteTimeUtc
   }
  }
  if($null -ne $latest){$observation.evidenceLatestWriteUTC=$latest.ToString('o')}
 }catch{$observation.errorCategories+=('EVIDENCE_'+$_.Exception.GetType().Name)}
 return [pscustomobject]$observation
}
$first=Get-KLWatchSnapshot
Start-Sleep -Seconds $ObservationSeconds
$second=Get-KLWatchSnapshot
$consistent=($first.leaseExists -and $second.leaseExists -and
 $first.leaseSha256 -ceq $second.leaseSha256 -and
 $first.leaseProcessPid -eq $second.leaseProcessPid -and
 $first.leaseIdentityVerified -and $second.leaseIdentityVerified -and
 $first.taskActionCount -eq 1 -and $second.taskActionCount -eq 1 -and
 $first.taskState -eq 'Ready' -and $second.taskState -eq 'Ready' -and
 $first.taskWorkerSha -ceq $second.taskWorkerSha -and
 $first.processEnumerationComplete -and $second.processEnumerationComplete -and
 $first.descendantInspectionComplete -and $second.descendantInspectionComplete -and
 $first.ledgerParseAccepted -and $second.ledgerParseAccepted -and
 $first.errorCategories.Count -eq 0 -and $second.errorCategories.Count -eq 0)
$activity=($first.descendantCount -gt 0 -or $second.descendantCount -gt 0 -or
 $first.relatedOtherProcessCount -gt 0 -or $second.relatedOtherProcessCount -gt 0 -or
 $first.ledgerNonterminalEntryCount -gt 0 -or $second.ledgerNonterminalEntryCount -gt 0 -or
 $first.ledgerSHA256 -cne $second.ledgerSHA256 -or
 $first.evidenceDirectoryCount -ne $second.evidenceDirectoryCount -or
 $first.evidenceLatestWriteUTC -cne $second.evidenceLatestWriteUTC)
$classification=if(-not $consistent){'UNVERIFIED_OR_CHANGED_STATE__FAIL_CLOSED'}elseif($activity){
 'CAPTURE_ACTIVITY_OR_UNKNOWN_PROCESS_OBSERVED__HOLD'
}else{'NO_CAPTURE_OBSERVED_IN_BOUNDED_WINDOW__NOT_QUIESCENCE_PROOF'}
# Fail-closed by construction, even after a quiet sampling window:
# The Node watcher still polls and can start a job after this probe exits.
[ordered]@{
 mode='SR27_BOUNDED_READ_ONLY_WATCHER_OBSERVATION'
 observationSeconds=$ObservationSeconds
 first=$first;second=$second
 observationStable=$consistent;activityOrUnknownSeen=$activity
 classification=$classification
 watcherQuiescenceCertified=$false
 taskRefreshSafetyHold=$true
 taskRefreshAuthorized=$false
 noLedgerWrite=$true;noLeaseWrite=$true;noHeartbeatWrite=$true
 noTaskOrProcessChange=$true;noGodotLaunch=$true;noNetwork=$true;noJobQueueChange=$true
 note='Live watcher lease is not safe-to-repoint. Snapshot absence is not a stop-the-world barrier.'
}|ConvertTo-Json -Depth 8
