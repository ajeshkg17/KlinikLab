# SR30 pure, read-only process-name category and parent/child clock helpers.
# No OS inspection, filesystem, process spawn/kill, task or ledger access.
function Get-KLSanitizedProcessKind {
 [CmdletBinding()]
 param([AllowEmptyString()][string]$ExecutableName)
 $name=[IO.Path]::GetFileName($ExecutableName)
 if($name -match '(?i)^node\.exe$'){return 'node'}
 if($name -match '(?i)^(powershell|pwsh)\.exe$'){return 'powershell'}
 if($name -match '(?i)^git\.exe$'){return 'git'}
 if($name -match '(?i)^(git-credential-manager|git-credential-manager-core|git-credential-wincred|git-remote-https|git-remote-http)\.exe$'){return 'git_helper'}
 if($name -match '(?i)^(godot.*|kliniklab.*)\.exe$'){return 'godot_or_exported_app'}
 if($name -match '(?i)^(cmd|conhost)\.exe$'){return 'console_host'}
 return 'other'
}
function Test-KLSafeProcessParentTime {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)][string]$ParentCreatedUTC,
       [Parameter(Mandatory=$true)][string]$ChildCreatedUTC)
 # SR29 helper is dot-sourced by caller; refuses offsetless inputs.
 $parent=Get-KLExplicitUtcInstant -Timestamp $ParentCreatedUTC
 $child=Get-KLExplicitUtcInstant -Timestamp $ChildCreatedUTC
 return ($child.UtcDateTime -ge $parent.UtcDateTime)
}
