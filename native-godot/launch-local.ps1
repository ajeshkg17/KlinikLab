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
    $godotCommand = Get-Command 'godot.exe' -ErrorAction SilentlyContinue
    if (-not $godotCommand) { $godotCommand = Get-Command 'godot' -ErrorAction SilentlyContinue }
    if ($godotCommand) { $GodotExecutable = $godotCommand.Source }
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

$launchArgs = @('--path', ('"{0}"' -f $OutputDirectory))
if ($OpenEditor) { $launchArgs += '--editor' }
Start-Process -FilePath $GodotExecutable -ArgumentList $launchArgs -WorkingDirectory $OutputDirectory | Out-Null

Write-Host "Started KlinikLab Godot 4.7.2 from source $sourceSha"
Write-Host "Build folder: $OutputDirectory"
Write-Host 'This local launch is for informal inspection; it does not establish watcher visual/GPU acceptance.'
