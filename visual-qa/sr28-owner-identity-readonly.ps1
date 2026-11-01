# SR28: identity-aware, single-pass, read-only diagnostic of watcher owner
# and staged lease readability. No task/process/lease/ledger modifications.
# Does NOT establish quiescence and cannot authorize task refresh.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'sr28-owner-identity-core.ps1')
. (Join-Path $PSScriptRoot 'sr26-lease-raw-timestamp.ps1')
. (Join-Path $PSScriptRoot 'sr29-utc-correlation.ps1')
$out=[ordered]@{
 mode='SR28_OWNER_IDENTITY_AND_LEASE_ACCESS_STAGE_READ_ONLY'
 sampledAtUTC=[datetime]::UtcNow.ToString('o')
 identityProbeCompleted=$false
 identityErrorType=$null
 taskState=$null;taskActionCount=$null;taskWorkerSha=$null
 taskPrincipalSidResolved=$false;currentLoginSidResolved=$false
 currentLoginMatchesTaskPrincipal=$false
 localAppDataEnvironmentPresent=$false
 localAppDataKnownFolderPresent=$false
 localAppDataEnvironmentMatchesKnownFolder=$false
 matchingExactWatcherProcessCount=$null
 processInventoryCompleted=$false
 matchingWatcherProcesses=@()
 leaseInspectionAttempted=$false
 leaseExists=$null
 leaseMetadataReadable=$false
 leaseRawReadable=$false
 leaseJsonParseAccepted=$false
 leaseRawTimestampPreserved=$false
 leaseHashReadable=$false
 leaseHashNotRequiredForProcessIdentity=$true
 leasePid=$null;leaseStartedAt=$null;leaseJobPollerMatched=$false
 leasePidWorkerIdentityVerified=$false
 leaseReadErrorStages=@()
 classification='UNVERIFIED_OWNER_IDENTITY__HOLD'
 taskRefreshSafetyHold=$true
 taskRefreshAuthorized=$false
 watcherQuiescenceCertified=$false
 ledgerRepairAuthorized=$false
 noTaskOrProcessChange=$true
 noLedgerWrite=$true;noLeaseWrite=$true
 noGodotLaunch=$true;noNetwork=$true;noJobQueueChange=$true
}
try{
 $context=Get-KLOwnerTaskContext
 $out.identityProbeCompleted=$true
 foreach($key in @('taskState','taskActionCount','taskWorkerSha',
  'taskPrincipalSidResolved','currentLoginSidResolved','currentLoginMatchesTaskPrincipal',
  'localAppDataEnvironmentPresent','localAppDataKnownFolderPresent',
  'localAppDataEnvironmentMatchesKnownFolder')){
  $out[$key]=$context.$key
 }
}catch{
 $out.identityErrorType=$_.Exception.GetType().Name
 $out.classification='TASK_OR_IDENTITY_CANNOT_BE_READ__HOLD'
 $out|ConvertTo-Json -Depth 8
 return
}
# Process metadata are read-only. Do not emit raw command lines, user names,
# paths, owner SIDs, unrelated processes or credentials.
$matched=@()
try{
 $expected=if($context.taskWorkerDirInternal){
  Join-Path $context.taskWorkerDirInternal 'visual-qa\godot-worker.mjs'
 }else{''}
 $nodes=@(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop)
 foreach($proc in $nodes){
  $line=[string]$proc.CommandLine
  if($expected.Length -eq 0 -or $line.IndexOf($expected,[StringComparison]::OrdinalIgnoreCase) -lt 0 -or
   $line -notmatch '(?i)(?:^|\s)--watch(?:\s|$)'){continue}
  $creation=$null
  if($null -ne $proc.CreationDate){$creation=([datetime]$proc.CreationDate).ToUniversalTime().ToString('o')}
  $ownerRead=$false;$ownerMatchesTask=$false
  try{
   $ownerResult=Invoke-CimMethod -InputObject $proc -MethodName GetOwnerSid -ErrorAction Stop
   $ownerSid=[string]$ownerResult.Sid
   $ownerRead=($ownerSid -match '^S-1-[0-9]+(?:-[0-9]+)+$')
   $ownerMatchesTask=($ownerRead -and $context.taskPrincipalSidResolved -and
    [string]::Equals($ownerSid,$context.taskSidInternal,[StringComparison]::OrdinalIgnoreCase))
  }catch{}
  $matched+=@{pid=[int]$proc.ProcessId;createdUTC=$creation
   exactNodeWatchCommandVerified=$true
   processOwnerSidReadable=$ownerRead
   processOwnerMatchesTaskPrincipal=$ownerMatchesTask}
 }
 $out.processInventoryCompleted=$true
 $out.matchingWatcherProcesses=$matched
 $out.matchingExactWatcherProcessCount=@($matched).Count
}catch{
 $out.leaseReadErrorStages+=('PROCESS_INVENTORY_'+$_.Exception.GetType().Name)
}
# Refuse to inspect the owner's lease directory under the wrong current login.
# A non-owner cannot establish absence or liveness from its own LOCALAPPDATA.
if(-not $context.currentLoginMatchesTaskPrincipal){
 $out.classification='WRONG_LOGIN_NO_OWNER_LEASE_READ_ATTEMPT__HOLD'
 $out|ConvertTo-Json -Depth 8
 return
}
if(-not $context.localAppDataKnownFolderPresent -or
 ($context.localAppDataEnvironmentPresent -and -not $context.localAppDataEnvironmentMatchesKnownFolder)){
 $out.classification='OWNER_LOGIN_ROOT_UNCERTAIN_NO_LEASE_READ__HOLD'
 $out|ConvertTo-Json -Depth 8
 return
}
$out.leaseInspectionAttempted=$true
$leasePath=Join-Path $context.knownRootInternal 'godot-worker-active.lock'
try{$out.leaseExists=Test-Path -LiteralPath $leasePath -PathType Leaf -ErrorAction Stop}
catch{$out.leaseReadErrorStages+=('PRESENCE_'+$_.Exception.GetType().Name)}
if($out.leaseExists -ne $true){
 $out.classification='OWNER_LEASE_MISSING_OR_UNREADABLE__HOLD'
 $out|ConvertTo-Json -Depth 8
 return
}
# Treat lease metadata, Get-Content and Get-FileHash as separate stages:
# a live Node fh may restrict sharing to one read API. Hash failures must not
# hide a successful *raw timestamp* read or claim that the owner SID is wrong.
try{
 $meta=Get-Item -LiteralPath $leasePath -ErrorAction Stop
 $out.leaseMetadataReadable=$true
 $out.leaseLastWriteUTC=$meta.LastWriteTimeUtc.ToString('o')
}catch{$out.leaseReadErrorStages+=('METADATA_'+$_.Exception.GetType().Name)}
$raw=$null;$lease=$null
try{
 $raw=Get-Content -LiteralPath $leasePath -Raw -ErrorAction Stop
 $out.leaseRawReadable=$true
}catch{$out.leaseReadErrorStages+=('RAW_'+$_.Exception.GetType().Name)}
if($out.leaseRawReadable){
 try{
  $lease=$raw|ConvertFrom-Json -ErrorAction Stop
  $out.leaseJsonParseAccepted=$true
 }catch{$out.leaseReadErrorStages+=('JSON_'+$_.Exception.GetType().Name)}
 try{
  $out.leaseStartedAt=Get-KLRawLeaseTimestamp -JsonText $raw
  $out.leaseRawTimestampPreserved=$true
 }catch{$out.leaseReadErrorStages+=('TIMESTAMP_'+$_.Exception.GetType().Name)}
}
if($out.leaseJsonParseAccepted){
 try{$out.leasePid=[int]$lease.pid
  $out.leaseJobPollerMatched=([string]$lease.jobPoller -ceq 'visual-qa/godot-worker.mjs')
 }catch{$out.leaseReadErrorStages+=('FIELDS_'+$_.Exception.GetType().Name)}
}
# Optional: never block other read stages on Get-FileHash sharing/ACL behavior.
try{
 $sum=Get-FileHash -LiteralPath $leasePath -Algorithm SHA256 -ErrorAction Stop
 $out.leaseHashReadable=($sum.Hash -match '^[a-fA-F0-9]{64}$')
}catch{$out.leaseReadErrorStages+=('HASH_'+$_.Exception.GetType().Name)}
if($out.leasePid -gt 0 -and $out.leaseRawTimestampPreserved -and $out.leaseJobPollerMatched){
 $candidate=@($matched|Where-Object{$_.pid -eq $out.leasePid})
 if($candidate.Count -eq 1 -and $candidate[0].processOwnerSidReadable -and
  $candidate[0].processOwnerMatchesTaskPrincipal){
  # SR29: compare BOTH explicit-offset ISO timestamps in UTC. A
  # [datetime] cast of an existing Z string reinterpreted local time on
  # the owner PC, falsely shifting the lease delta by exactly one hour.
  try{
   $clock=Get-KLLeaseProcessUtcCorrelation -LeaseStartedAt ([string]$out.leaseStartedAt) -ProcessCreatedUTC ([string]$candidate[0].createdUTC)
   $out.leasePidWorkerIdentityVerified=[bool]$clock.createdAtOrBeforeLeaseWithinBound
   $out.leaseStartDeltaSeconds=$clock.deltaRoundedSeconds
   $out.leaseClockComparedExplicitUtcInstants=[bool]$clock.onlyUtcInstantsCompared
  }catch{
   $out.leaseReadErrorStages+=('CORRELATION_'+$_.Exception.GetType().Name)
  } }
}
$out.classification=if($out.leasePidWorkerIdentityVerified -and $out.leaseHashReadable){
 'OWNER_LEASE_IDENTITY_VERIFIED__LIVE_WATCHER_HOLD'
}elseif($out.leasePidWorkerIdentityVerified){
 'OWNER_LEASE_IDENTITY_VERIFIED_HASH_UNREADABLE__HOLD'
}else{
 'OWNER_LEASE_OR_PROCESS_IDENTITY_INCOMPLETE__HOLD'
}
$out|ConvertTo-Json -Depth 8
