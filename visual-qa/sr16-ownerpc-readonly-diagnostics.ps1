# SR16: safe owner-login / scheduled-task identity + GPU PDH diagnostics only.
# This script NEVER launches Godot, changes the watcher task, repairs a ledger,
# records credentials or captures any screenshots. Job09 remains immutable.
[CmdletBinding()]
param([string]$JobId='pc-godot-exported-20261101-cc0-job09-ed3239')
$ErrorActionPreference='Stop'
if($JobId -notmatch '^pc-godot-exported-[a-zA-Z0-9-]+$'){throw 'Unsafe job ID'}
$root=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'KlinikLabGodotWorker'
$ledgerPath=Join-Path $root 'godot-ledger.json'
$heartPath=Join-Path $root 'godot-heartbeat.json'
$runtimePath=Join-Path $root 'godot-watcher-runtime.json'
$task=Get-ScheduledTask -TaskName 'KlinikLab-Godot-PC-Watcher' -ErrorAction Stop
$me=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal=[string]$task.Principal.UserId
$ledgerPresent=Test-Path -LiteralPath $ledgerPath -PathType Leaf
$entryPresent=$false;$status=$null;$ledgerSha=$null;$ledgerErrors=@()
if($ledgerPresent){
 $ledgerSha=(Get-FileHash -LiteralPath $ledgerPath -Algorithm SHA256).Hash.ToLowerInvariant()
 try{
  $ledger=Get-Content -LiteralPath $ledgerPath -Raw | ConvertFrom-Json -ErrorAction Stop
  $entry=$ledger.completed.PSObject.Properties[$JobId]
  $entryPresent=($null -ne $entry)
  if($entryPresent){$status=[string]$entry.Value.status}
 }catch{$ledgerErrors+=('Parse failure: '+$_.Exception.GetType().Name)}
}
$originalEvidenceDir=Join-Path (Join-Path $root 'godot-evidence') ($JobId+'-ed3239c85a')
$heartbeatExists=Test-Path -LiteralPath $heartPath -PathType Leaf
$runtimeExists=Test-Path -LiteralPath $runtimePath -PathType Leaf
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
 mode='READ_ONLY_OWNER_PC_TASK_AND_PDH_PREFLIGHT'
 job09NeverExecutedByThisScript=$true;noLedgerWrite=$true;noTaskChange=$true
 noGodotLaunch=$true;noScreenCapture=$true
 jobId=$JobId
 currentLoginMatchesTaskPrincipal=($me -ieq $principal)
 taskState=[string]$task.State
 taskActionCount=@($task.Actions).Count
 localLedgerExists=$ledgerPresent;localLedgerSha256=$ledgerSha
 localLedgerHasJob=$entryPresent;jobStatus=$status;ledgerParseErrors=$ledgerErrors
 localOriginalEvidenceFolderExists=(Test-Path -LiteralPath $originalEvidenceDir -PathType Container)
 heartbeatExists=$heartbeatExists;runtimeReceiptExists=$runtimeExists
 systemWideGpu3dPdhStatusCounts=$pdhStatusCounts;systemWideGpuCounterErrors=$pdhErrorTypes
 status3221228486='PDH_INVALID_DATA (0xC0000BC6)'
 systemWidePdhDoesNotProveSamePidRtx3d=$true
}
$report | ConvertTo-Json -Depth 8
