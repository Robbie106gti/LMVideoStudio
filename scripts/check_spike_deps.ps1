<#
.SYNOPSIS
  Verify spike/worker venv guardrails: no torchao, ROCm torch present.
#>
param(
    [string]$VenvPython = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $VenvPython) {
    $VenvPython = Join-Path $RepoRoot "spike\.venv\Scripts\python.exe"
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "FAIL: venv not found at $VenvPython - run spike/scripts/setup_venv.ps1" -ForegroundColor Red
    exit 1
}

$ver = & $VenvPython --version 2>&1
Write-Host "Python: $ver"
if ($ver -notmatch "3\.12") {
    Write-Host "WARN: Expected Python 3.12 for ROCm 7.2.1 wheels" -ForegroundColor Yellow
}

$script = Join-Path $PSScriptRoot "check_spike_deps.py"
& $VenvPython $script
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "check_spike_deps: PASS" -ForegroundColor Green
exit 0
