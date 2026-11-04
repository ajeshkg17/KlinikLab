# SR54: pure synthetic function tests on Windows PowerShell 5.1 and 7.
# Parse the launcher and test ONLY its function definitions with mocked processes.
# Never invoke launch-local.ps1, Godot, the owner-PC watcher or evidence jobs.
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot '..\native-godot\launch-local.ps1'
$source = Get-Content -LiteralPath $launcher -Raw
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if (@($parseErrors).Count -ne 0) { throw "SR54 PowerShell syntax invalid: $($parseErrors | Out-String)" }
$needed = @('Invoke-GodotImport', 'Start-GodotDesktop')
$definitions = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $needed -contains $node.Name
}, $true))
if ($definitions.Count -ne 2) { throw 'SR54 launcher import/desktop functions not found' }
foreach ($definition in $definitions) {
    Invoke-Expression $definition.Extent.Text
}

$script:mockImportExit = 0
$script:mockImportCreatesScene = $true
$script:mockDesktopExited = $false
$script:calls = @()
$script:waits = @()

function Start-Process {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory,
        [switch]$Wait,
        [switch]$PassThru,
        [string]$RedirectStandardOutput,
        [string]$RedirectStandardError
    )
    $script:calls += [pscustomobject]@{
        executable = $FilePath
        args = @($ArgumentList)
        folder = $WorkingDirectory
        waited = [bool]$Wait
        passThru = [bool]$PassThru
        stdout = $RedirectStandardOutput
        stderr = $RedirectStandardError
    }
    if ($ArgumentList -contains '--import') {
        if ($script:mockImportExit -eq 0 -and $script:mockImportCreatesScene) {
            $importDir = Join-Path $WorkingDirectory '.godot\imported'
            New-Item -ItemType Directory -Path $importDir -Force | Out-Null
            Set-Content -LiteralPath (Join-Path $importDir 'whole-clinic-starter-v1-godot.glb-synthetic.scn') -Value 'synthetic mock marker'
        }
        return [pscustomobject]@{ ExitCode = $script:mockImportExit; Id = 4201 }
    }
    $p = [pscustomobject]@{ ExitCode = 4; Id = 4202; HasExited = $script:mockDesktopExited }
    $p | Add-Member -MemberType ScriptMethod -Name Refresh -Value {} -PassThru
}

function Start-Sleep {
    param([int]$Seconds)
    $script:waits += $Seconds
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw "SR54 regression: $Message" }
}

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('kliniklab-sr54-launcher-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
try {
    $project = Join-Path $testRoot 'project with spaces'
    $logs = Join-Path $project 'launcher-logs'
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    Assert-True ((Invoke-GodotImport 'mock-godot.exe' $project $logs) -eq 0) 'import should exit 0'
    Assert-True ($script:calls.Count -eq 1) 'import must start exactly one process'
    $call = $script:calls[0]
    Assert-True ($call.waited -and $call.passThru) 'import must wait and check exit status'
    Assert-True ($call.args -contains '--headless' -and $call.args -contains '--editor' -and $call.args -contains '--import') 'import flags missing'
    Assert-True ($call.args -contains ('"' + $project + '"')) 'quoted path with spaces lost'
    Assert-True ($call.stdout.EndsWith('import.stdout.log') -and $call.stderr.EndsWith('import.stderr.log')) 'import logs not redirected'

    $failed = Join-Path $testRoot 'failed import'
    $failedLogs = Join-Path $failed 'launcher-logs'
    New-Item -ItemType Directory -Path $failedLogs -Force | Out-Null
    $script:mockImportExit = 4
    $failedAsRequired = $false
    try { Invoke-GodotImport 'mock-godot.exe' $failed $failedLogs | Out-Null }
    catch { $failedAsRequired = $_.Exception.Message.Contains('exit 4') }
    Assert-True $failedAsRequired 'import exit 4 must be fail-closed'

    $script:mockImportExit = 0
    $script:mockImportCreatesScene = $false
    $missing = Join-Path $testRoot 'zero exit but missing GLB'
    $missingLogs = Join-Path $missing 'launcher-logs'
    New-Item -ItemType Directory -Path $missingLogs -Force | Out-Null
    $missingBlocked = $false
    try { Invoke-GodotImport 'mock-godot.exe' $missing $missingLogs | Out-Null }
    catch { $missingBlocked = $_.Exception.Message.Contains('PackedScene') }
    Assert-True $missingBlocked 'zero import exit with missing whole-clinic scene must fail'

    $script:mockDesktopExited = $false
    $pidResult = Start-GodotDesktop 'mock-godot.exe' $project $logs $false
    Assert-True ($pidResult -eq 4202) 'live desktop process ID missing'
    Assert-True ($script:waits -contains 5) 'five-second early-exit observation missing'
    $desktopCall = $script:calls[$script:calls.Count - 1]
    Assert-True (-not $desktopCall.waited -and $desktopCall.passThru) 'desktop must not block until application exits'
    Assert-True ($desktopCall.args -contains '--path' -and -not ($desktopCall.args -contains '--headless')) 'desktop must be interactive, not headless'
    Assert-True ($desktopCall.stdout.EndsWith('desktop.stdout.log') -and $desktopCall.stderr.EndsWith('desktop.stderr.log')) 'desktop logs not redirected'

    $script:mockDesktopExited = $true
    $earlyExitBlocked = $false
    try { Start-GodotDesktop 'mock-godot.exe' $project $logs $false | Out-Null }
    catch { $earlyExitBlocked = $_.Exception.Message.Contains('first five seconds') -and $_.Exception.Message.Contains('exit 4') }
    Assert-True $earlyExitBlocked 'early desktop exit 4 must raise a diagnostic error'

    Write-Output 'SR54_WINPS_LAUNCH_IMPORT_AND_EARLY_EXIT_PASS mocked import success/failure/missing GLB, five-second live and exit-4 detection; no Godot or owner-PC execution'
}
finally {
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
