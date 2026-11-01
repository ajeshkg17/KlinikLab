# SR29: pure offline dual-engine regression for SR28's one-hour UTC creation
# string re-interpretation. No real task, watcher, lease, ledger or process IO.
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$helper=Join-Path $repo 'visual-qa/sr29-utc-correlation.ps1'
$probe=Join-Path $repo 'visual-qa/sr28-owner-identity-readonly.ps1'
foreach($file in @($helper,$probe)){
 $errors=$null;$tokens=$null
 [Management.Automation.Language.Parser]::ParseFile($file,[ref]$tokens,[ref]$errors)|Out-Null
 if(@($errors).Count -gt 0){throw ('SR29_SCRIPT_PARSE_ERROR '+[IO.Path]::GetFileName($file))}
}
. $helper
function Assert-SR29Correlation([string]$lease,[string]$created,[double]$expected){
 $answer=Get-KLLeaseProcessUtcCorrelation -LeaseStartedAt $lease -ProcessCreatedUTC $created
 if([math]::Abs($answer.deltaSeconds-$expected) -gt 0.0000001){
  throw ('SR29_UTC_DELTA_MISMATCH '+$answer.deltaSeconds+' expected '+$expected)
 }
 if(-not $answer.createdAtOrBeforeLeaseWithinBound -or
  -not $answer.bothInputsHaveExplicitOffsets -or -not $answer.onlyUtcInstantsCompared){
  throw 'SR29_EXPLICIT_UTC_IDENTITY_NOT_VERIFIED'
 }
 if([math]::Abs($answer.deltaRoundedSeconds-0.054) -gt 0.000001){
  throw 'SR29_UTC_MILLISECOND_ROUNDING_CHANGED'
 }
}
# Owner exact original raw timestamps (not synthetic rounded timestamps):
$leaseZ='2026-11-01T12:56:29.736Z'
$createdZ='2026-11-01T12:56:29.6817300Z'
Assert-SR29Correlation $leaseZ $createdZ 0.05427
# Explicit +01:00 is equivalent to UTC, NOT a reason to shift -3600 s.
Assert-SR29Correlation '2026-11-01T13:56:29.736+01:00' '2026-11-01T13:56:29.6817300+01:00' 0.05427
Assert-SR29Correlation $leaseZ '2026-11-01T13:56:29.6817300+01:00' 0.05427
Assert-SR29Correlation '2026-11-01T13:56:29.736+01:00' $createdZ 0.05427
# A genuine -3599.946 s mismatch must be rejected rather than normalized away.
$bad=Get-KLLeaseProcessUtcCorrelation -LeaseStartedAt $leaseZ -ProcessCreatedUTC '2026-11-01T13:56:29.6817300Z'
if($bad.createdAtOrBeforeLeaseWithinBound -or
 [math]::Abs($bad.deltaRoundedSeconds-(-3599.946)) -gt 0.001){
 throw 'SR29_FALSE_UTC_CREATION_MISMATCH_ACCEPTED'
}
# Never infer the local timezone on an offset-less timestamp.
foreach($value in @('2026-11-01T12:56:29.6817300',
 '2026-11-01T12:56:29.6817300+25:00',
 '2026-11-01T12:56:99.6817300Z',
 '11/01/2026 12:56:29')){
 $rejected=$false
 try{$null=Get-KLLeaseProcessUtcCorrelation -LeaseStartedAt $leaseZ -ProcessCreatedUTC $value}
 catch{$rejected=$true}
 if(-not $rejected){throw 'SR29_INVALID_CREATION_TIMESTAMP_ACCEPTED'}
}
# Contract: the actual SR28 caller uses the helper, with no [datetime] Z
# string cast or subtraction of an unspecified-kind DateTime.
$source=[IO.File]::ReadAllText($probe)
foreach($required in @('sr29-utc-correlation.ps1','Get-KLLeaseProcessUtcCorrelation',
 'leaseClockComparedExplicitUtcInstants',
 'leasePidWorkerIdentityVerified=[bool]$clock.createdAtOrBeforeLeaseWithinBound',
 'taskRefreshSafetyHold=$true','taskRefreshAuthorized=$false')){
 if(-not $source.Contains($required)){throw ('SR29_SR28_CALLER_MISSING '+$required)}
}
if($source.Contains('$created=[datetime]$candidate[0].createdUTC') -or
 $source.Contains('($stamp.UtcDateTime-$created).TotalSeconds')){
 throw 'SR29_SR28_LEGACY_DATETIME_ZONE_LOSS_STILL_PRESENT'
}
Write-Host ('SR29_UTC_OFFSET_AND_OWNER_CLOCK_CORRELATION_PASS engine='+$PSVersionTable.PSVersion.ToString())
