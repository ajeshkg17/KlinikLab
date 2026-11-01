$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
foreach($file in @('visual-qa/sr28-owner-identity-core.ps1','visual-qa/sr28-owner-identity-readonly.ps1','visual-qa/sr27-ownerpc-observe-only.ps1')){
 $tokens=$null;$errors=$null
 [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $repo $file),[ref]$tokens,[ref]$errors)|Out-Null
 if(@($errors).Count -gt 0){throw ('SR28_PARSE_FAILED '+$file)}
}
. (Join-Path $repo 'visual-qa/sr28-owner-identity-core.ps1')
$same=Test-KLOwnerIdentityMatch -TaskSid 'S-1-5-21-100-200-300-1001' -LoginSid 'S-1-5-21-100-200-300-1001'
$diff=Test-KLOwnerIdentityMatch -TaskSid 'S-1-5-21-100-200-300-1001' -LoginSid 'S-1-5-21-100-200-300-1002'
$unknown=Test-KLOwnerIdentityMatch -TaskSid '' -LoginSid 'S-1-5-21-100-200-300-1002'
if(-not $same.currentLoginMatchesTaskPrincipal -or $diff.currentLoginMatchesTaskPrincipal -or $unknown.currentLoginMatchesTaskPrincipal){throw 'SR28_IDENTITY_GATE_FAILED'}
Write-Host ('SR28_WINPS_IDENTITY_GATE_PASS engine='+$PSVersionTable.PSVersion.ToString())
