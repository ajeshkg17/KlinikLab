# SR30: pure owner-watch process kind/time regression, WinPS 5.1 AND PowerShell 7.
# Never query actual owner PC processes, tasks, leases or ledger.
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$files=@('visual-qa/sr29-utc-correlation.ps1',
 'visual-qa/sr30-process-lineage-core.ps1',
 'visual-qa/sr30-ownerpc-process-lineage-readonly.ps1')
foreach($relative in $files){
 $tokens=$null;$errors=$null
 [Management.Automation.Language.Parser]::ParseFile((Join-Path $repo $relative),[ref]$tokens,[ref]$errors)|Out-Null
 if(@($errors).Count -gt 0){throw ('SR30_PARSER_ERROR '+$relative)}
}
. (Join-Path $repo 'visual-qa/sr29-utc-correlation.ps1')
. (Join-Path $repo 'visual-qa/sr30-process-lineage-core.ps1')
$cases=@(
 @{exe='powershell.exe';expect='powershell'},
 @{exe='pwsh.exe';expect='powershell'},
 @{exe='git.exe';expect='git'},
 @{exe='git-credential-manager.exe';expect='git_helper'},
 @{exe='git-remote-https.exe';expect='git_helper'},
 @{exe='node.exe';expect='node'},
 @{exe='KlinikLab.exe';expect='godot_or_exported_app'},
 @{exe='Godot_v4.7.exe';expect='godot_or_exported_app'},
 @{exe='conhost.exe';expect='console_host'},
 @{exe='unknown.exe';expect='other'}
)
foreach($case in $cases){
 $kind=Get-KLSanitizedProcessKind -ExecutableName $case.exe
 if($kind -cne $case.expect){throw ('SR30_PROCESS_CATEGORY_WRONG '+$case.exe)}
}
$old='2026-11-01T12:56:29.6817300Z'
$new='2026-11-01T12:56:29.736Z'
if(-not (Test-KLSafeProcessParentTime -ParentCreatedUTC $old -ChildCreatedUTC $new)){
 throw 'SR30_VALID_CHILD_CREATION_REJECTED'
}
if(Test-KLSafeProcessParentTime -ParentCreatedUTC $new -ChildCreatedUTC $old){
 throw 'SR30_RECYCLED_PARENT_PID_ACCEPTED'
}
# Offset-aware child timestamp is equivalent; no local conversion.
if(-not (Test-KLSafeProcessParentTime -ParentCreatedUTC $old -ChildCreatedUTC '2026-11-01T13:56:29.736+01:00')){
 throw 'SR30_EQUIVALENT_TIMEZONE_REJECTED'
}
$rejected=$false
try{$null=Test-KLSafeProcessParentTime -ParentCreatedUTC $old -ChildCreatedUTC '2026-11-01T12:56:29'}
catch{$rejected=$true}
if(-not $rejected){throw 'SR30_TIMEZONELESS_CHILD_ACCEPTED'}
$real=[IO.File]::ReadAllText((Join-Path $repo 'visual-qa/sr30-ownerpc-process-lineage-readonly.ps1'))
foreach($marker in @('taskRefreshSafetyHold=$true','taskRefreshAuthorized=$false',
 'quiescenceCertified=$false','leaseReadAttempted=$false',
 'leaseHashAttempted=$false','ledgerReadAttempted=$false',
 'NO_DESCENDANTS_AT_THIS_INSTANT__NOT_QUIESCENCE',
 'POLLING_OR_OTHER_KNOWN_HELPERS_OBSERVED__NOT_QUIESCENCE')){
 if(-not $real.Contains($marker)){throw ('SR30_HOLD_CONTRACT_MISSING '+$marker)}
}
Write-Host ('SR30_PROCESS_LINEAGE_READONLY_SYNTHETIC_PASS engine='+$PSVersionTable.PSVersion.ToString())
