# SR26: PURE read-only parser for the original Node lease timestamp JSON token.
# Windows PowerShell 5.1 ConvertFrom-Json converts ISO Z strings into DateTime;
# converting that DateTime to [string] loses the Z/offset. Parse raw token first.
# No filesystem, task, process, ledger, or watcher action is performed here.
function Get-KLRawWatcherTimestamp {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)][string]$JsonText,
       [Parameter(Mandatory=$true)][ValidateSet('startedAt','at')][string]$PropertyName)
 # The existing single-instance writer creates flat JSON with exactly one
 # startedAt string. Forbid escaped values and multiple keys (fail closed).
 $pattern='"'+[regex]::Escape($PropertyName)+'"\s*:\s*"(?<stamp>[0-9TZ:+.\-]{1,64})"'
 $found=[regex]::Matches($JsonText,$pattern)
 if($found.Count -ne 1){throw 'LEASE_TIMESTAMP_RAW_TOKEN_MISSING_OR_DUPLICATE'}
 $stamp=[string]$found[0].Groups['stamp'].Value
 # Preserve both explicit offset and legacy ambiguous timestamps. This
 # helper NEVER supplies a missing offset or authorizes a lease transition.
 if($stamp -cnotmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)?$'){
  throw 'LEASE_TIMESTAMP_RAW_TOKEN_INVALID_FORMAT'
 }
 $parsed=[DateTimeOffset]::MinValue
 if(-not [DateTimeOffset]::TryParse($stamp,[Globalization.CultureInfo]::InvariantCulture,
   [Globalization.DateTimeStyles]::RoundtripKind,[ref]$parsed)){
  throw 'LEASE_TIMESTAMP_RAW_TOKEN_INVALID_DATE'
 }
 # Returning the exact original JSON string is essential: never round-trip
 # through [datetime] or ConvertFrom-Json for lease timezone classification.
 return $stamp
}

function Get-KLRawLeaseTimestamp {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)][string]$JsonText)
 return Get-KLRawWatcherTimestamp -JsonText $JsonText -PropertyName 'startedAt'
}
