# SR26 synthetic regression for BOTH native Windows PowerShell 5.1 and PS 7.
# No Task Scheduler, local AppData, real lock, worker, renderer, or network access.
$ErrorActionPreference='Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'visual-qa/sr26-lease-raw-timestamp.ps1')
function Assert-KL($ok,[string]$message){if(-not $ok){throw 'SR26_TEST_FAIL '+$message}}
$original='2026-11-01T12:56:29.736Z'
$workerStarted='2026-11-01T12:56:29.6817300Z'
$raw='{"pid":49344,"startedAt":"'+$original+'","jobPoller":"visual-qa/godot-worker.mjs"}'
$coerced=$raw | ConvertFrom-Json
# PowerShell versions differ in whether ConvertFrom-Json promotes to DateTime;
# the new parser must not depend on its property type or string formatting.
$actual=Get-KLRawLeaseTimestamp -JsonText $raw
Assert-KL ($actual -ceq $original) 'raw UTC token not preserved exactly'
Assert-KL ($actual -match 'Z$') 'lost Z UTC marker'
$processStamp=[DateTimeOffset]::Parse($workerStarted,[Globalization.CultureInfo]::InvariantCulture)
$leaseStamp=[DateTimeOffset]::Parse($actual,[Globalization.CultureInfo]::InvariantCulture)
$delta=($leaseStamp-$processStamp).TotalMilliseconds
Assert-KL ([math]::Abs($delta-54.27) -lt 0.001) '54.27 ms process/lease correlation changed'
$clock='{"pid":7,"at":"2026-11-01T12:56:29.736Z","status":"blocked"}'
Assert-KL ((Get-KLRawWatcherTimestamp -JsonText $clock -PropertyName 'at') -ceq $original) 'heartbeat Z not preserved'
$offset='2026-11-01T13:56:29.736+01:00'
$offsetRaw='{"startedAt":"'+$offset+'"}'
Assert-KL ((Get-KLRawLeaseTimestamp -JsonText $offsetRaw) -ceq $offset) 'explicit +01:00 lost'
Assert-KL (([DateTimeOffset]::Parse((Get-KLRawLeaseTimestamp -JsonText $offsetRaw))).UtcDateTime -eq $leaseStamp.UtcDateTime) 'offset conversion is wrong'
$noZone='2026-11-01T12:56:29.736'
$legacy='{"startedAt":"'+$noZone+'"}'
$ambiguous=Get-KLRawLeaseTimestamp -JsonText $legacy
Assert-KL ($ambiguous -ceq $noZone) 'legacy clock altered'
Assert-KL ($ambiguous -notmatch '(?i)(Z|[+-][0-9]{2}:[0-9]{2})$') 'legacy clock silently granted timezone'
foreach($bad in @(
 '{"startedAt":"2026-11-01T12:56:29.736Z","startedAt":"2026-11-01T12:56:29.736Z"}',
 '{"startedAt":"2026-11-01T99:56:29.736Z"}',
 '{"startedAt":"2026-11-01T12:56:29.736\\u005a"}',
 '{"other":"2026-11-01T12:56:29.736Z"}'
)){
 $rejected=$false
 try{$null=Get-KLRawLeaseTimestamp -JsonText $bad}catch{$rejected=$true}
 Assert-KL $rejected ('malformed/ambiguous raw token accepted: '+$bad)
}
Write-Host ('SR26_RAW_LEASE_UTC_CLOCK_PRESERVED_PASS engine='+$PSVersionTable.PSVersion.ToString()+' coercedType='+$coerced.startedAt.GetType().FullName+' deltaMs='+$delta)
