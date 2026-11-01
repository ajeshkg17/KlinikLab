# Invoke this from Windows PowerShell 5.1 and (separately) PowerShell 7.
# Parse ONLY, no scheduled-task changes, network, watcher, or Godot.
param([string]$InstallerPath = (Join-Path $PSScriptRoot '..\visual-qa\install-godot-pc-watcher.ps1'))
$ErrorActionPreference='Stop'
$file=[System.IO.Path]::GetFullPath($InstallerPath)
if(-not [System.IO.File]::Exists($file)){throw "Installer missing: $file"}
$tokens=$null
$parseErrors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile(
  $file,[ref]$tokens,[ref]$parseErrors)
if($null -eq $ast){throw 'PowerShell AST missing'}
if(@($parseErrors).Count -gt 0){
 $details=@($parseErrors|ForEach-Object{
  "line $($_.Extent.StartLineNumber), column $($_.Extent.StartColumnNumber): $($_.Message)"
 }) -join '; '
 throw "INSTALLER_PARSE_FAILED PS $($PSVersionTable.PSVersion) : $details"
}
$source=[IO.File]::ReadAllText($file)
foreach($expected in @('Register-ScheduledTask','-RegisterAtLogon','-RedirectStandardOutput',
 '-RedirectStandardError','-ExpectedWorkerSha','-MultipleInstances IgnoreNew')){
 if(-not $source.Contains($expected)){throw "Expected pinned installer contract missing: $expected"}
}
Write-Output "INSTALLER_PARSE_OK PS=$($PSVersionTable.PSVersion) FILE=$file"
