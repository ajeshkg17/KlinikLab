[CmdletBinding()]
param(
    [string]$GodotExecutable,
    [string]$OutputDirectory,
    [switch]$OpenEditor
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Get-RequiredCommand([string]$Name) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "Required command '$Name' was not found on PATH."
    }
    return $command.Source
}


# SR54: the source builder creates a NEW Godot project without .godot imports.
# Never start its actual CC0 PackedScene before this checked import succeeds.
function Invoke-GodotImport([string]$Executable, [string]$Project, [string]$LogDirectory) {
    $stdout = Join-Path $LogDirectory 'import.stdout.log'
    $stderr = Join-Path $LogDirectory 'import.stderr.log'
    $args = @('--headless', '--editor', '--path', ('"{0}"' -f $Project), '--import')
    $result = Start-Process -FilePath $Executable -ArgumentList $args -WorkingDirectory $Project -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    if ($null -eq $result -or $result.ExitCode -ne 0) {
        $exitCode = if ($null -eq $result) { 'no process' } else { [string]$result.ExitCode }
        $tail = if (Test-Path -LiteralPath $stderr) { (Get-Content -LiteralPath $stderr -Tail 20 | Out-String).Trim() } else { '' }
        throw "Godot import failed (exit $exitCode). Log: $stderr. $tail"
    }
    # An exit code alone is insufficient: the original owner-PC failure
    # was ResourceLoader rejecting an unimported whole-clinic GLB.
    $imported = Join-Path $Project '.godot\imported'
    $clinicScene = @(Get-ChildItem -LiteralPath $imported -File -Filter 'whole-clinic-starter-v1-godot.glb*' -ErrorAction SilentlyContinue)
    if ($clinicScene.Count -eq 0) {
        throw "Godot import returned zero but the whole-clinic PackedScene import is missing in '$imported'. Inspect $stdout and $stderr."
    }
    return $result.ExitCode
}

function Start-GodotDesktop([string]$Executable, [string]$Project, [string]$LogDirectory, [bool]$Editor) {
    $stdout = Join-Path $LogDirectory 'desktop.stdout.log'
    $stderr = Join-Path $LogDirectory 'desktop.stderr.log'
    $args = @('--path', ('"{0}"' -f $Project))
    if ($Editor) { $args += '--editor' }
    # This remains in the CALLER's Windows session. A restricted/private
    # desktop cannot be made visible merely by constructing a window handle.
    # Do not use -Wait, -WindowStyle Hidden, or owner-PC watcher/capture jobs.
    $process = Start-Process -FilePath $Executable -ArgumentList $args -WorkingDirectory $Project -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    if ($null -eq $process) { throw "Godot desktop launch returned no process. Logs: $stdout / $stderr" }
    Start-Sleep -Seconds 5
    $process.Refresh()
    if ($process.HasExited) {
        $tail = if (Test-Path -LiteralPath $stderr) { (Get-Content -LiteralPath $stderr -Tail 20 | Out-String).Trim() } else { '' }
        throw "Godot desktop exited during first five seconds (exit $($process.ExitCode), PID $($process.Id)). Logs: $stdout / $stderr. $tail"
    }
    return $process.Id
}

$git = Get-RequiredCommand 'git'
$node = Get-RequiredCommand 'node'
$nodeVersion = (& $node --version).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(?<major>\d+)\.') {
    throw "Could not read the Node.js version from '$node'."
}
if ([int]$Matches.major -lt 22) {
    throw "Node.js 22 or newer is required; found $nodeVersion."
}

if (-not $GodotExecutable) {
    $GodotExecutable = $env:KLINIKLAB_GODOT_EXE
}
if (-not $GodotExecutable) {
    # WinGet and standalone releases often put the exact VERSIONED name on
    # PATH instead of a "godot.exe" alias. Preserve strict --version checking.
    foreach ($name in @('Godot_v4.7.2-stable_win64.exe', 'Godot_v4.7.2-stable_win64_console.exe', 'godot.exe', 'godot')) {
        $godotCommand = Get-Command $name -ErrorAction SilentlyContinue
        if ($godotCommand) { $GodotExecutable = $godotCommand.Source; break }
    }
}
if (-not $GodotExecutable) {
    $wingetPackages = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    if (Test-Path -LiteralPath $wingetPackages) {
        $packageDirs = Get-ChildItem -LiteralPath $wingetPackages -Directory |
            Where-Object { $_.Name -like 'GodotEngine.GodotEngine_*' }
        foreach ($packageDir in $packageDirs) {
            $candidate = Join-Path $packageDir.FullName 'Godot_v4.7.2-stable_win64.exe'
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                $GodotExecutable = $candidate
                break
            }
        }
    }
}
if (-not $GodotExecutable -or -not (Test-Path -LiteralPath $GodotExecutable -PathType Leaf)) {
    throw "Godot 4.7.2 was not found. Set KLINIKLAB_GODOT_EXE or pass -GodotExecutable with its full path."
}

$godotVersion = (& $GodotExecutable --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $godotVersion -notmatch '^4\.7\.2([.+-]|$)') {
    throw "Expected Godot 4.7.2; '$GodotExecutable' reports '$godotVersion'."
}

$sourceSha = (& $git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceSha -notmatch '^[0-9a-f]{40}$') {
    throw 'Could not determine the exact KlinikLab source commit.'
}
$dirty = & $git -C $repoRoot status --porcelain --untracked-files=normal
if ($LASTEXITCODE -ne 0) { throw 'Could not check the source checkout status.' }
if ($dirty) {
    throw 'Commit or stash source changes before building so the displayed app matches its recorded source commit.'
}

if (-not $OutputDirectory) {
    $appData = [Environment]::GetFolderPath('LocalApplicationData')
    $uniqueRun = '{0}-{1}-{2}' -f $sourceSha.Substring(0, 12), (Get-Date -Format 'yyyyMMdd-HHmmss'), ([guid]::NewGuid().ToString('N'))
    $OutputDirectory = Join-Path $appData (Join-Path 'KlinikLabNativePreview' $uniqueRun)
}
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $OutputDirectory) {
    throw "Refusing to overwrite existing build output: $OutputDirectory"
}

Push-Location $repoRoot
try {
    & $node 'native-godot/build-app.mjs' "--source-dir=$repoRoot" "--expected-sha=$sourceSha" "--output=$OutputDirectory"
    if ($LASTEXITCODE -ne 0) { throw "KlinikLab native build failed with exit code $LASTEXITCODE." }
}
finally {
    Pop-Location
}

# These logs are NEW per-build diagnostics, never a capture job or owner-PC
# evidence ledger. Do not overwrite an existing build or previous evidence.
$logDirectory = Join-Path $OutputDirectory 'launcher-logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$manifest = @(
    "sourceSHA=$sourceSha",
    "godotVersion=$godotVersion",
    "godotExecutable=$GodotExecutable",
    "project=$OutputDirectory",
    "launchTimeUtc=$([DateTime]::UtcNow.ToString('o'))"
)
$manifest | Set-Content -LiteralPath (Join-Path $logDirectory 'launcher.txt') -Encoding UTF8

# Import MUST finish and provide the CC0 PackedScene before the app can launch.
$importExit = Invoke-GodotImport -Executable $GodotExecutable -Project $OutputDirectory -LogDirectory $logDirectory
Add-Content -LiteralPath (Join-Path $logDirectory 'launcher.txt') -Value "importExit=$importExit"

# An interactive user must run this launcher from their actual unrestricted
# desktop session. The launcher cannot grant desktop visibility/permissions.
$desktopPid = Start-GodotDesktop -Executable $GodotExecutable -Project $OutputDirectory -LogDirectory $logDirectory -Editor ([bool]$OpenEditor)
Add-Content -LiteralPath (Join-Path $logDirectory 'launcher.txt') -Value "desktopPid=$desktopPid"
Write-Host "Started KlinikLab Godot 4.7.2 (PID $desktopPid) from exact source $sourceSha"
Write-Host "Build folder: $OutputDirectory"
Write-Host "Fresh project import complete. Diagnostic logs: $logDirectory"
Write-Host 'The caller must be in the interactive desktop session; a restricted session can have invisible windows.'
Write-Host 'Engine/GPU pixels, DXGI LUID and visual acceptance require an independent exact-build review (currently NOT ACCEPTED).'

