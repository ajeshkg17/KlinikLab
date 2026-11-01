# SR30: owner-PC SINGLE SNAPSHOT process ancestry inventory (read-only).
# Distinguishes routine watcher polling helpers from possible native app processes.
# Never opens the lease/ledger/evidence or changes tasks, processes or files.
# Snapshot cannot certify quiescence or justify transition.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'sr28-owner-identity-core.ps1')
. (Join-Path $PSScriptRoot 'sr29-utc-correlation.ps1')
. (Join-Path $PSScriptRoot 'sr30-process-lineage-core.ps1')
$report=[ordered]@{
 mode='SR30_SINGLE_SNAPSHOT_READ_ONLY_PROCESS_LINEAGE'
 sampledAtUTC=[DateTime]::UtcNow.ToString('o')
 taskState=$null;taskActionCount=$null;taskWorkerSha=$null
 currentLoginMatchesTaskPrincipal=$false
 localAppDataEnvironmentMatchesKnownFolder=$false
 identityProbeCompleted=$false;processEnumerationComplete=$false
 exactWatcherCount=$null;watcherProcessOwnerMatchesTaskPrincipal=$false
 watcherCreatedUTC=$null;watcherPid=$null
 descendantInspectionComplete=$false;descendantCount=$null
 descendants=@();processKinds=@()
 potentiallyNativeAppDescendantSeen=$false
 unknownOrUnverifiableDescendantSeen=$false
 leaseReadAttempted=$false;leaseHashAttempted=$false
 ledgerReadAttempted=$false;evidenceReadAttempted=$false
 quiescenceCertified=$false;taskRefreshSafetyHold=$true
 taskRefreshAuthorized=$false;ledgerRepairAuthorized=$false
 noTaskOrProcessChange=$true;noGodotLaunch=$true
 noFileMutation=$true;noNetwork=$true;noJobQueueChange=$true
 classification='UNVERIFIED_OWNER_CONTEXT__HOLD'
 errorCategories=@()
 limitations='Only one process snapshot; transient, exited or orphaned processes can be missed. A child PowerShell/Git process may be normal 10-second polling, but no sample proves idleness.'
}
try{
 $context=Get-KLOwnerTaskContext
 $report.identityProbeCompleted=$true
 $report.taskState=$context.taskState
 $report.taskActionCount=$context.taskActionCount
 $report.taskWorkerSha=$context.taskWorkerSha
 $report.currentLoginMatchesTaskPrincipal=$context.currentLoginMatchesTaskPrincipal
 $report.localAppDataEnvironmentMatchesKnownFolder=$context.localAppDataEnvironmentMatchesKnownFolder
}catch{
 $report.errorCategories+=('IDENTITY_'+$_.Exception.GetType().Name)
 $report.classification='TASK_OWNER_IDENTITY_UNREADABLE__HOLD'
 $report|ConvertTo-Json -Depth 8
 return
}
if(-not $context.currentLoginMatchesTaskPrincipal -or
 -not $context.localAppDataEnvironmentMatchesKnownFolder -or
 $context.taskActionCount -ne 1 -or $context.taskState -ne 'Ready' -or
 $context.taskWorkerSha -cne '033fb0520212fe696df02bf2a0c5aca12ad3e848' -or
 [string]::IsNullOrWhiteSpace($context.taskWorkerDirInternal)){
 $report.classification='NOT_EXACT_HISTORICAL_TASK_OWNER_CONTEXT__HOLD'
 $report|ConvertTo-Json -Depth 8
 return
}
# The only command-line read is an in-memory exact-match check; the raw
# command lines, user names, SID values and paths never appear in output.
try{
 $all=@(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop)
 $report.processEnumerationComplete=$true
 $script=Join-Path $context.taskWorkerDirInternal 'visual-qa\godot-worker.mjs'
 $matching=@()
 foreach($proc in $all){
  if([string]$proc.Name -ine 'node.exe'){continue}
  $cmd=[string]$proc.CommandLine
  if($cmd.IndexOf($script,[StringComparison]::OrdinalIgnoreCase) -ge 0 -and
   $cmd -match '(?i)(?:^|\s)--watch(?:\s|$)'){$matching+=,$proc}
 }
 $report.exactWatcherCount=$matching.Count
 if($matching.Count -ne 1){
  $report.classification='WATCHER_NOT_UNIQUELY_IDENTIFIED__HOLD'
  $report|ConvertTo-Json -Depth 8
  return
 }
 $watcher=$matching[0]
 $report.watcherPid=[int]$watcher.ProcessId
 if($null -eq $watcher.CreationDate){throw 'MISSING_WATCHER_CREATION_TIME'}
 $report.watcherCreatedUTC=([datetime]$watcher.CreationDate).ToUniversalTime().ToString('o')
 try{
  $sid=Invoke-CimMethod -InputObject $watcher -MethodName GetOwnerSid -ErrorAction Stop
  $report.watcherProcessOwnerMatchesTaskPrincipal=([string]$sid.Sid -ceq [string]$context.taskSidInternal)
 }catch{$report.errorCategories+=('WATCHER_OWNER_'+$_.Exception.GetType().Name)}
 if(-not $report.watcherProcessOwnerMatchesTaskPrincipal){
  $report.classification='WATCHER_OWNER_UNVERIFIED__HOLD'
  $report|ConvertTo-Json -Depth 8
  return
 }
 $front=@($watcher);$visited=@([int]$watcher.ProcessId)
 while($front.Count -gt 0){
  $following=@()
  foreach($parent in $front){
   if($null -eq $parent.CreationDate){throw 'MISSING_PARENT_CREATION_TIME'}
   $parentCreatedUTC=([datetime]$parent.CreationDate).ToUniversalTime().ToString('o')
   foreach($child in $all){
    if([int]$child.ParentProcessId -ne [int]$parent.ProcessId){continue}
    if([int]$child.ProcessId -in $visited){continue}
    $visited+=([int]$child.ProcessId)
    $kind=Get-KLSanitizedProcessKind -ExecutableName ([string]$child.Name)
    $createdUTC=$null;$plausible=$false
    if($null -ne $child.CreationDate){
     $createdUTC=([datetime]$child.CreationDate).ToUniversalTime().ToString('o')
     try{$plausible=Test-KLSafeProcessParentTime -ParentCreatedUTC $parentCreatedUTC -ChildCreatedUTC $createdUTC}
     catch{$report.errorCategories+=('CHILD_CLOCK_'+$_.Exception.GetType().Name)}
    }
    $ownerReadable=$false;$ownerMatches=$false
    try{
     $ownerResult=Invoke-CimMethod -InputObject $child -MethodName GetOwnerSid -ErrorAction Stop
     $ownerReadable=([string]$ownerResult.Sid -match '^S-1-[0-9]+(?:-[0-9]+)+$')
     $ownerMatches=($ownerReadable -and [string]$ownerResult.Sid -ceq [string]$context.taskSidInternal)
    }catch{}
    $report.descendants+=@{
     pid=[int]$child.ProcessId
     parentPid=[int]$parent.ProcessId
     kind=$kind
     createdUTC=$createdUTC
     lineageCreationTimePlausible=$plausible
     processOwnerSidReadable=$ownerReadable
     processOwnerMatchesTaskPrincipal=$ownerMatches
    }
    if($kind -eq 'godot_or_exported_app'){$report.potentiallyNativeAppDescendantSeen=$true}
    if($kind -eq 'other' -or -not $plausible -or -not $ownerMatches){
     $report.unknownOrUnverifiableDescendantSeen=$true
    }
    # A child with creation before its alleged parent could be stale PID
    # reuse. Report but do not treat the child as part of a valid subtree.
    if($plausible){$following+=,$child}
   }
  }
  $front=@($following)
 }
 $report.descendantInspectionComplete=$true
 $report.descendantCount=@($report.descendants).Count
 $report.processKinds=@($report.descendants|Group-Object kind|Sort-Object Name|
  ForEach-Object{@{kind=$_.Name;count=[int]$_.Count}})
 $report.classification=if($report.errorCategories.Count -gt 0 -or $report.unknownOrUnverifiableDescendantSeen){
  'UNVERIFIED_OR_UNKNOWN_DESCENDANTS__HOLD'
 }elseif($report.potentiallyNativeAppDescendantSeen){
  'NATIVE_APP_DESCENDANT_OBSERVED__HOLD'
 }elseif($report.descendantCount -gt 0){
  'POLLING_OR_OTHER_KNOWN_HELPERS_OBSERVED__NOT_QUIESCENCE'
 }else{
  'NO_DESCENDANTS_AT_THIS_INSTANT__NOT_QUIESCENCE'
 }
}catch{
 $report.errorCategories+=('PROCESS_'+$_.Exception.GetType().Name)
 $report.classification='PROCESS_INVENTORY_INCOMPLETE__HOLD'
}
$report|ConvertTo-Json -Depth 8
