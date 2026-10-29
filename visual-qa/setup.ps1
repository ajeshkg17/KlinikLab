# Run in a normal PowerShell window (no administrator privileges necessary).
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Write-Host "KlinikLab checkout: $repo" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $repo '.git'))) { throw 'The worker must be installed in your existing GitHub checkout.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20 or newer is required: https://nodejs.org/' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required: https://git-scm.com/download/win' }
$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { throw 'Please install Node.js 20 or newer.' }
Write-Host 'Installing the Playwright library (Chrome is used; no extra browser download).' -ForegroundColor Cyan
Push-Location $PSScriptRoot
try {
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
  node worker.mjs --validate
  if ($LASTEXITCODE -ne 0) { throw 'Job validation failed.' }
} finally { Pop-Location }
Write-Host 'Setup successful. Start the watcher in a separate normal PowerShell window:' -ForegroundColor Green
Write-Host "Set-Location '$repo'"
Write-Host 'node .\visual-qa\worker.mjs'
Write-Host 'Leave that terminal open. The first job will start when the server on localhost:8787 is reachable.'