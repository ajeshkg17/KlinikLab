# Pure no-I/O origin authorization. Only missing job08 ledger is reconcilable;
# remote immutable original published job08 is REQUIRED in both cases.
function Assert-KLJob08OriginalPublicationGate {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory=$true)]$Ledger,
  [Parameter(Mandatory=$true)]$RemoteJob,
  [Parameter(Mandatory=$true)][string]$ExpectedSourceSha,
  [Parameter(Mandatory=$true)][string]$ExpectedWorkerSha
 )
 $old='pc-godot-clinic-20261101-job07'
 $job='pc-godot-clinic-20261101-job08'
 if($null -eq $Ledger.completed){throw 'No local completed-jobs ledger section'}
 $oldEntry=$Ledger.completed.PSObject.Properties[$old].Value
 if(-not $oldEntry -or $oldEntry.commit -cne $ExpectedSourceSha -or
  $oldEntry.status -cne 'published' -or $oldEntry.recoveryOnly -ne $true -or
  $oldEntry.result.reexecuted -ne $false -or
  $oldEntry.result.gpuProcessCorroborated -ne $false -or
  $oldEntry.result.overallStatus -cne 'EVIDENCE_INCOMPLETE'){
  throw 'Historical job07 not preserved as published recovery-only incomplete'}
 if($RemoteJob.jobId -cne $job -or $RemoteJob.sourceGitSHA -cne $ExpectedSourceSha -or
  $RemoteJob.workerGitSHA -cne $ExpectedWorkerSha -or
  $RemoteJob.overallStatus -cne 'EVIDENCE_INCOMPLETE' -or
  $RemoteJob.imageExists -ne $false -or $RemoteJob.angledImageExists -ne $false -or
  $RemoteJob.gpuProcessCorroborated -ne $false -or
  $RemoteJob.fullKlinikLabApplicationMigrated -ne $false -or
  $RemoteJob.nativeSceneMode -cne 'clinic-cases' -or
  [int]$RemoteJob.distinctRtx5060Gpu3DPeriods -lt 3 -or
  $RemoteJob.rtx5060DxgiLuid -notmatch '^0x[0-9a-fA-F]{8}_0x[0-9a-fA-F]{8}$'){
  throw 'Remote original job08 publication identity/source/RTX incomplete status mismatch'}
 $entry=$Ledger.completed.PSObject.Properties[$job].Value
 if($null -eq $entry){
  return 'LOCAL_JOB08_ENTRY_ABSENT_REMOTE_ORIGINAL_PUBLISHED'
 }
 if($entry.commit -cne $ExpectedSourceSha -or $entry.status -cne 'published' -or
   $entry.result.overallStatus -cne 'EVIDENCE_INCOMPLETE' -or
   $entry.result.workerGitSHA -cne $ExpectedWorkerSha -or
   $entry.result.imageExists -ne $false -or
   $entry.result.gpuProcessCorroborated -ne $false){
  throw 'Present job08 local ledger contradicts remote immutable original publication'}
 return 'LOCAL_JOB08_ENTRY_PRESENT_AND_REMOTE_ORIGINAL_PUBLISHED'
}
