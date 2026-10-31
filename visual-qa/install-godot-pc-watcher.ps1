# Install a per-user, interactive-logon GitHub Godot watcher.
# Only the owner invokes -RegisterAtLogon (modifies a local Scheduled Task).
# -Run is a pinned, long-lived worker; it never opens Godot on the visible desktop.
[CmdletBinding(DefaultParameterSetName='Run')]
param(
 [Parameter(Mandatory=$true)][string]$WorkerDirectory,
 [Parameter(Mandatory=$true)][string]$ExpectedWorkerSha,
 [Parameter(Mandatory=$true)][string]$GodotExe,
 [Parameter(Mandatory=$true)][string]$NodeExe,
 [Parameter(ParameterSetName='Register')][switch]$RegisterAtLogon
)
$ErrorActionPreference='Stop'
$TaskName='KlinikLab-Godot-PC-Watcher'
foreach($part in @($WorkerDirectory,$ExpectedWorkerSha,$GodotExe,$NodeExe)){
 if($part -match '[\x00-\x1f"]'){throw 'Arguments cannot contain quotes or control characters'}
}
if($ExpectedWorkerSha -cnotmatch '^[0-9a-f]{40}$'){throw 'Full pinned 40-hex watcher SHA required'}
foreach($file in @($WorkerDirectory,$GodotExe,$NodeExe)){
 if(-not(Test-Path -LiteralPath $file)){throw 'Required local path does not exist: '+$file}
}
$worker=Join-Path $WorkerDirectory 'visual-qa\godot-worker.mjs'
if(-not(Test-Path -LiteralPath $worker)){throw 'Missing known dedicated Godot worker'}
$head=(& git -C $WorkerDirectory rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $head -cne $ExpectedWorkerSha){throw 'Worker directory HEAD differs from approved watcher SHA'}
$dirty=(& git -C $WorkerDirectory status --porcelain --untracked-files=no)
if($LASTEXITCODE -ne 0 -or $dirty){throw 'Approved watcher checkout has modified tracked files'}
$godotName=[IO.Path]::GetFileName($GodotExe)
if($godotName -notmatch '4\.7\.2'){throw 'Expected installed Godot 4.7.2 Windows GUI binary'}
if([IO.Path]::GetFileName($NodeExe) -notmatch '^node(\.exe)?$'){throw 'Expected real Node executable'}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
if(-not $identity){throw 'Interactive Windows user identity unavailable'}
if($RegisterAtLogon){
 $scriptFile=$PSCommandPath
 $exec=Join-Path $PSHOME 'powershell.exe'
 if(-not(Test-Path -LiteralPath $exec)){
  $exec=(Get-Command powershell.exe -ErrorAction Stop).Source
 }
 $taskArguments='-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -WorkerDirectory "{1}" -ExpectedWorkerSha {2} -GodotExe "{3}" -NodeExe "{4}"' -f $scriptFile,$WorkerDirectory,$ExpectedWorkerSha,$GodotExe,$NodeExe
 $action=New-ScheduledTaskAction -Execute $exec -Argument $taskArguments
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $identity
 $principal=New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
 $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
 Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
 Write-Host "Registered interactive-logon task: $TaskName (user $identity, pinned $ExpectedWorkerSha)"
 Write-Host "Start now: Start-ScheduledTask -TaskName '$TaskName'"
 Write-Host "Verify: Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
 return
}
$root=Join-Path $env:LOCALAPPDATA 'KlinikLabGodotWorker'
if(-not(Test-Path $root)){New-Item -ItemType Directory -Force -Path $root|Out-Null}
$env:KLINIKLAB_GODOT_EXE=$GodotExe
$env:GIT_TERMINAL_PROMPT='0'
# Old "node --watch 2>&1 | ForEach-Object" with ErrorActionPreference=Stop
# risks turning Get-Counter stderr into terminating PowerShell ErrorRecords.
# Native stdout/stderr now go DIRECTLY to unique files, never a pipeline.
$stamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-fff')
$stdout=Join-Path $root ("godot-watcher-$stamp-stdout.log")
$stderr=Join-Path $root ("godot-watcher-$stamp-stderr.log")
$startNote=Join-Path $root ("godot-watcher-$stamp-start.json")
[IO.File]::WriteAllText($startNote,
 ((@{startedUTC=[DateTime]::UtcNow.ToString('o');workerSha=$ExpectedWorkerSha;
    stdout=$stdout;stderr=$stderr;mode='--watch';fullAppMigrated=$false}
   |ConvertTo-Json)+[Environment]::NewLine),
 (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Godot watcher log files: $stdout ; $stderr"
$native=Start-Process -FilePath $NodeExe -ArgumentList @($worker,'--watch') -PassThru -Wait -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr
if($native.ExitCode -ne 0){
 throw "Godot watcher process exit $($native.ExitCode); preserve logs $stdout and $stderr; never rerun attempted job IDs"
}
