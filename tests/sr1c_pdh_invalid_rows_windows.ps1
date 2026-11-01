# Synthetic Windows PowerShell 5.1 regression for the EXACT classifier used by SR1C.
# Does not render Godot or verify any physical RTX process.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '..\visual-qa\sr1c-pdh-filter.ps1')
$pidToCheck=12472
$rtxLuid='0x00000000_0x00013049'
$otherLuid='0x00000000_0x00012b1e'
$rtx='\\pc\gpu engine(pid_'+$pidToCheck+'_luid_'+$rtxLuid+'_phys_0_eng_0_engtype_3d)\utilization percentage'
$other='\\pc\gpu engine(pid_'+$pidToCheck+'_luid_'+$otherLuid+'_phys_0_eng_0_engtype_3d)\utilization percentage'
$wrongPid='\\pc\gpu engine(pid_5555_luid_'+$rtxLuid+'_phys_0_eng_0_engtype_3d)\utilization percentage'
$wrongEngine='\\pc\gpu engine(pid_'+$pidToCheck+'_luid_'+$rtxLuid+'_phys_0_eng_0_engtype_copy)\utilization percentage'
$at=[DateTime]::SpecifyKind([DateTime]::Parse('2026-10-31T22:03:59Z'),[DateTimeKind]::Utc)
function sample($path,$value,$status){
 [PSCustomObject]@{Path=$path;CookedValue=$value;Status=$status}
}
$snapshots=@(
 [PSCustomObject]@{Timestamp=$at;CounterSamples=@((sample $rtx 1.31 0),(sample $rtx 78 'InvalidData'),(sample $wrongPid 45 0),(sample $wrongEngine 5 0))},
 [PSCustomObject]@{Timestamp=$at.AddSeconds(1);CounterSamples=@((sample $rtx 1.28 'ValidData'),(sample $rtx ([double]::NaN) 0),(sample $rtx -1 0))},
 [PSCustomObject]@{Timestamp=$at.AddSeconds(2);CounterSamples=@((sample $rtx 0.91 0),(sample $rtx 104 0),(sample $other 15 0))},
 [PSCustomObject]@{Timestamp=$at.AddSeconds(2);CounterSamples=@((sample $rtx 0.00 0))}
)
$parsed=ConvertTo-KLGodotGpu3DRows -Snapshots $snapshots -GodotPid $pidToCheck -GetEngineLuid {
 param($p)
 if($p -match '(?i)luid_(0x[0-9a-f]{8}_0x[0-9a-f]{8})'){return $Matches[1].ToLowerInvariant()}
 return ''
}
function assert($ok,$message){if(-not $ok){throw $message}}
assert ($parsed.periods.Count -eq 4) 'Expected all four retained snapshot indices'
assert ($parsed.rows.Count -eq 9) 'Expected nine Godot 3D rows, including invalid samples'
assert ($parsed.validRows.Count -eq 5) 'Only five valid status/finite/range/LUID Godot rows should remain'
assert ($parsed.invalidRows.Count -eq 4) 'Invalid status, NaN and out-of-range samples must not become evidence'
$positive=@($parsed.validRows|Where-Object{$_.utilizationPercent -gt 0.05})
assert ($positive.Count -eq 4) 'Three matching RTX rows and one other GPU should be positive'
$rtxPositive=@($positive|Where-Object{$_.engineLuid -eq $rtxLuid})
$unique=@($rtxPositive|Select-Object -ExpandProperty utc -Unique)
assert ($unique.Count -eq 3) 'Require three distinct UTC periods, not simply row count'
assert (@($parsed.rows|Where-Object{$_.godotPid -ne $pidToCheck}).Count -eq 0) 'Wrong PID leaked through'
assert (@($parsed.rows|Where-Object{$_.counterPath -match 'engtype_copy'}).Count -eq 0) 'Non-3D engine leaked through'
$allInvalid=@(
 [PSCustomObject]@{Timestamp=$at;CounterSamples=@((sample $rtx ([double]::NaN) 'InvalidData'))}
)
$blocked=ConvertTo-KLGodotGpu3DRows -Snapshots $allInvalid -GodotPid $pidToCheck -GetEngineLuid {param($p) $rtxLuid}
assert ($blocked.validRows.Count -eq 0 -and $blocked.invalidRows.Count -eq 1) 'All-invalid must fail closed'

$newData=@(
 [PSCustomObject]@{Timestamp=$at;CounterSamples=@(
  (sample $rtx 2.3 'NewData'),(sample $rtx 4.2 1),(sample $rtx 99 3221228486))}
)
$newResult=ConvertTo-KLGodotGpu3DRows -Snapshots $newData -GodotPid $pidToCheck -GetEngineLuid {param($p) $rtxLuid}
assert ($newResult.validRows.Count -eq 2) 'PDH NEW_DATA and status 1 are valid as specified by Microsoft'
assert ($newResult.invalidRows.Count -eq 1) '0xC0000BC6 PDH_INVALID_DATA must never prove GPU activity'

Write-Host 'PASS: exact Godot-PID 3D PDH status/finite/range/LUID filter tolerates invalid wildcard rows, retains rejected diagnostics and counts distinct UTC periods.'
