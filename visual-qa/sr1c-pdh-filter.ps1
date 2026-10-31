# Pure classification of Windows PDH GPU Engine snapshots; no hardware required.
# Used by the native owner-PC collector and by focused synthetic Windows regressions.
function ConvertTo-KLGodotGpu3DRows {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory=$true)][object[]]$Snapshots,
  [Parameter(Mandatory=$true)][int]$GodotPid,
  [Parameter(Mandatory=$true)][scriptblock]$GetEngineLuid
 )
 if($GodotPid -le 0){throw 'Godot PID must be positive'}
 $rows=New-Object 'System.Collections.Generic.List[object]'
 $periods=New-Object 'System.Collections.Generic.List[object]'
 $index=0
 foreach($snapshot in $Snapshots){
  if($null -eq $snapshot){continue}
  $index++
  if($null -eq $snapshot.Timestamp){throw 'PDH snapshot timestamp missing'}
  $stamp=([DateTime]$snapshot.Timestamp).ToUniversalTime().ToString('o')
  $periods.Add([PSCustomObject]@{collectionIndex=$index;utc=$stamp})
  foreach($c in @($snapshot.CounterSamples)){
   if($null -eq $c){continue}
   $counterPath=[string]$c.Path
   if($counterPath -notmatch ('(?i)pid_'+$GodotPid+'_') -or
    $counterPath -notmatch '(?i)engtype_3d'){continue}
   $statusName=[string]$c.Status
   $statusValid=($statusName -eq 'ValidData' -or $statusName -eq '0')
   $finite=$false;$v=$null
   try{
    $n=[double]$c.CookedValue
    if(-not [double]::IsNaN($n) -and -not [double]::IsInfinity($n)){
     $finite=$true;$v=$n
    }
   }catch{}
   $luid=[string](& $GetEngineLuid $counterPath)
   $usable=($statusValid -and $finite -and $null -ne $v -and
    $v -ge 0 -and $v -le 100 -and -not [string]::IsNullOrWhiteSpace($luid))
   $rows.Add([PSCustomObject]@{
    utc=$stamp;collectionIndex=$index;godotPid=$GodotPid
    counterPath=$counterPath;engineLuid=$luid
    status=$statusName;statusValid=[bool]$statusValid
    rawCookedValue=[string]$c.CookedValue
    utilizationPercent=$v;finite=[bool]$finite;usable=[bool]$usable
   })
  }
 }
 return [PSCustomObject]@{
  rows=@($rows.ToArray());periods=@($periods.ToArray())
  validRows=@($rows.ToArray()|Where-Object{$_.usable})
  invalidRows=@($rows.ToArray()|Where-Object{-not $_.usable})
 }
}
