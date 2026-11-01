# SR27: offline static Windows PowerShell 5.1 / PowerShell 7 parser gate.
# Does not execute diagnostic, task actions, watcher, Godot or owner-PC paths.
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
foreach($relative in @('visual-qa/sr27-ownerpc-observe-only.ps1',
 'visual-qa/sr26-lease-raw-timestamp.ps1')){
 $p=Join-Path $repo $relative
 $tokens=$null;$errors=$null
 [System.Management.Automation.Language.Parser]::ParseFile($p,[ref]$tokens,[ref]$errors)|Out-Null
 if(@($errors).Count -gt 0){throw ('SR27 PowerShell parse failed: '+$relative)}
}
$src=[IO.File]::ReadAllText((Join-Path $repo 'visual-qa/sr27-ownerpc-observe-only.ps1'))
foreach($str in @('taskRefreshSafetyHold=$true','taskRefreshAuthorized=$false',
 'watcherQuiescenceCertified=$false','noLedgerWrite=$true','noLeaseWrite=$true',
 'noTaskOrProcessChange=$true','noGodotLaunch=$true',
 'NO_CAPTURE_OBSERVED_IN_BOUNDED_WINDOW__NOT_QUIESCENCE_PROOF')){
 if(-not $src.Contains($str)){throw ('SR27 missing mandatory read-only gate: '+$str)}
}
foreach($forbidden in @('Start-Process','Stop-Process','Stop-ScheduledTask',
 'Start-ScheduledTask','Set-ScheduledTask','Register-ScheduledTask','Remove-Item',
 'Set-Content','Add-Content','New-Item','Invoke-RestMethod')){
 if([regex]::IsMatch($src,'(?i)\b'+[regex]::Escape($forbidden)+'\b')){
  throw ('SR27 unsafe command mentioned in executable probe: '+$forbidden)
 }
}
Write-Host ('SR27_READ_ONLY_WATCHER_PROBE_PARSE_PASS engine='+$PSVersionTable.PSVersion.ToString())
