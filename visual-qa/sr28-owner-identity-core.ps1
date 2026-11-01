# SR28: pure SID comparison + read-only Windows task/current-login context.
# No credentials, task mutation, process control, lease or ledger access.
function Test-KLOwnerIdentityMatch {
 [CmdletBinding()]
 param([AllowEmptyString()][string]$TaskSid,
       [AllowEmptyString()][string]$LoginSid)
 $validTask=($TaskSid -match '^S-1-[0-9]+(?:-[0-9]+)+$')
 $validLogin=($LoginSid -match '^S-1-[0-9]+(?:-[0-9]+)+$')
 return [pscustomobject]@{
  taskPrincipalSidResolved=$validTask
  currentLoginSidResolved=$validLogin
  currentLoginMatchesTaskPrincipal=($validTask -and $validLogin -and
   [string]::Equals($TaskSid,$LoginSid,[StringComparison]::OrdinalIgnoreCase))
 }
}
function Get-KLOwnerTaskContext {
 [CmdletBinding()]
 param([string]$TaskName='KlinikLab-Godot-PC-Watcher')
 $task=Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
 $id=[Security.Principal.WindowsIdentity]::GetCurrent()
 $current=if($null -ne $id.User){[string]$id.User.Value}else{''}
 $principal=[string]$task.Principal.UserId
 $taskSid=''
 try{$taskSid=([Security.Principal.SecurityIdentifier]::new($principal)).Value}catch{
  try{$taskSid=([Security.Principal.NTAccount]::new($principal)).
   Translate([Security.Principal.SecurityIdentifier]).Value}catch{}
 }
 $decision=Test-KLOwnerIdentityMatch -TaskSid $taskSid -LoginSid $current
 $actions=@($task.Actions)
 $workerDir=''
 $workerSha=''
 if($actions.Count -eq 1){
  $arguments=[string]$actions[0].Arguments
  if($arguments -match '(?i)(?:^|\s)-WorkerDirectory\s+"([^"]+)"'){$workerDir=$Matches[1]}
  if($arguments -match '(?i)(?:^|\s)-ExpectedWorkerSha\s+([a-f0-9]{40})(?:\s|$)'){$workerSha=$Matches[1]}
 }
 $envBase=[Environment]::GetEnvironmentVariable('LOCALAPPDATA','Process')
 $knownBase=[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
 $rootsComparable=(-not [string]::IsNullOrWhiteSpace($envBase) -and
  -not [string]::IsNullOrWhiteSpace($knownBase))
 $sameRoot=$false
 if($rootsComparable){
  try{$sameRoot=[IO.Path]::GetFullPath($envBase) -ieq [IO.Path]::GetFullPath($knownBase)}catch{}
 }
 return [pscustomobject]@{
  # Never publish current or task SID values, principal name or worker paths.
  taskState=[string]$task.State
  taskActionCount=$actions.Count
  taskWorkerSha=$workerSha
  taskWorkerDirInternal=$workerDir
  taskSidInternal=$taskSid
  currentSidInternal=$current
  taskPrincipalSidResolved=$decision.taskPrincipalSidResolved
  currentLoginSidResolved=$decision.currentLoginSidResolved
  currentLoginMatchesTaskPrincipal=$decision.currentLoginMatchesTaskPrincipal
  localAppDataEnvironmentPresent=(-not [string]::IsNullOrWhiteSpace($envBase))
  localAppDataKnownFolderPresent=(-not [string]::IsNullOrWhiteSpace($knownBase))
  localAppDataEnvironmentMatchesKnownFolder=$sameRoot
  knownRootInternal=if($knownBase){Join-Path $knownBase 'KlinikLabGodotWorker'}else{''}
 }
}
