# SR29: PURE, explicit-zone DateTimeOffset correlation for the existing
# read-only owner-PC watcher identity diagnostic. Never convert an already
# UTC ISO string via [datetime] (WinPS 5.1 can re-interpret it as local time).
# No filesystem, process, task, ledger, network or watcher actions.
function Get-KLExplicitUtcInstant {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)][string]$Timestamp)
 if($Timestamp -cnotmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$'){
  throw 'SR29_TIMESTAMP_EXPLICIT_ZONE_REQUIRED'
 }
 $instant=[DateTimeOffset]::MinValue
 $ok=[DateTimeOffset]::TryParse($Timestamp,[Globalization.CultureInfo]::InvariantCulture,
  [Globalization.DateTimeStyles]::RoundtripKind,[ref]$instant)
 if(-not $ok){throw 'SR29_TIMESTAMP_INVALID_DATE'}
 return $instant
}
function Get-KLLeaseProcessUtcCorrelation {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)][string]$LeaseStartedAt,
       [Parameter(Mandatory=$true)][string]$ProcessCreatedUTC)
 $lease=Get-KLExplicitUtcInstant -Timestamp $LeaseStartedAt
 $created=Get-KLExplicitUtcInstant -Timestamp $ProcessCreatedUTC
 # Both operands are explicitly normalized to UTC from offset-aware instants.
 # No local-time assumption, [datetime] string coercion or implicit timezone.
 $seconds=($lease.UtcDateTime-$created.UtcDateTime).TotalSeconds
 return [pscustomobject]@{
  deltaSeconds=$seconds
  deltaRoundedSeconds=[math]::Round($seconds,3)
  createdAtOrBeforeLeaseWithinBound=($seconds -ge -5 -and $seconds -le 180)
  bothInputsHaveExplicitOffsets=$true
  onlyUtcInstantsCompared=$true
 }
}
