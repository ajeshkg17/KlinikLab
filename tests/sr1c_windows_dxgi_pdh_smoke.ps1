# Hosted Windows interop smoke ONLY: no Godot, no foreground and no GPU acceptance.
$ErrorActionPreference='Stop'
$src=Join-Path $PSScriptRoot '..\visual-qa\sr1c-dxgi-luid.cs'
Add-Type -Path $src -ErrorAction Stop
$p='\\officegopi\gpu engine(pid_8852_luid_0x00000000_0x00013049_phys_0_eng_0_engtype_3d)\utilization percentage'
$luid=[KlinikLab.DxgiEvidence]::FromGpuEnginePath($p)
if($luid -ne '0x00000000_0x00013049'){
 throw "Windows GPU Engine LUID parser mismatch, actual $luid"
}
if([KlinikLab.DxgiEvidence]::FromGpuEnginePath('no_luid') -ne ''){
 throw 'Malformed GPU Engine sample was incorrectly assigned an LUID'
}
Write-Host "PASS: exact original job04 GPU Engine LUID normalized = $luid"
$adapters=@([KlinikLab.DxgiEvidence]::Enumerate())
if($adapters.Count -lt 1){throw 'DXGI returned zero adapters'}
foreach($adapter in $adapters){
 if($adapter.luid -notmatch '^0x[0-9a-f]{8}_0x[0-9a-f]{8}$'){
  throw "DXGI adapter LUID malformed: $($adapter.luid)"
 }
 Write-Host "DXGI adapter: $($adapter.name) LUID $($adapter.luid) vendor $($adapter.vendorId)"
}
Write-Host 'PASS: real native Windows IDXGIAdapter1.GetDesc1 enumerated independently'
try{
 $query=@(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -MaxSamples 3 -ErrorAction Stop)
 if($query.Count -lt 3){throw "Persistent Get-Counter PDH query returned only $($query.Count) timestamp snapshots"}
 $unique=@($query|ForEach-Object{$_.Timestamp.ToUniversalTime().ToString('o')}|Select-Object -Unique)
 if($unique.Count -ne 3){throw "Persistent PDH snapshots not temporally distinct: $($unique.Count)"}
 Write-Host 'PASS: single persistent PDH query produced three independent timestamped collection periods'
}catch{
 if($_.Exception.Message -match '(?i)counter.*not found|cannot find.*counter|counter set.*not|does not exist'){
  Write-Host "SKIP: hosted Windows runner has no real GPU Engine PDH counter provider: $($_.Exception.Message)"
 }else{throw}
}
