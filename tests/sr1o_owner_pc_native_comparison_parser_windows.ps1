# WinPS5.1 and pwsh7 non-executing parser contract for one-shot owner runner.
$ErrorActionPreference='Stop'
$target=Join-Path (Split-Path -Parent $PSScriptRoot) 'visual-qa\sr1o-owner-pc-native-comparison-once.ps1'
if(-not(Test-Path -LiteralPath $target)){throw 'Approved comparison script missing'}
$tokens=$null;$errors=$null
[System.Management.Automation.Language.Parser]::ParseFile($target,[ref]$tokens,[ref]$errors)|Out-Null
if($errors.Count){
 foreach($e in $errors){Write-Host ('PARSE_ERROR '+$e.Extent.StartLineNumber+':'+$e.Message)}
 throw 'Whole-clinic owner-PC orchestrator PowerShell parsing failed'
}
Write-Host ('NATIVE_SCRIPT_PARSE_OK PS '+$PSVersionTable.PSVersion.ToString())
