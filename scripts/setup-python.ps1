<#
.SYNOPSIS
  Bootstrap Python ROCm worker venv for LMVideoStudio.

.EXAMPLE
  .\scripts\setup-python.ps1
  .\scripts\setup-python.ps1 -SkipSidecar
#>
param(
    [switch]$SkipSidecar
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SpikeRoot = Join-Path $RepoRoot "spike"
$VenvSetup = Join-Path $SpikeRoot "scripts\setup_venv.ps1"

Write-Host "=== setup-python ===" -ForegroundColor Cyan

if (-not (Test-Path $VenvSetup)) {
    Write-Error "Missing spike venv setup: $VenvSetup"
}

& $VenvSetup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$python = Join-Path $SpikeRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Error "Python venv not created at $python"
}

Write-Host "Python venv OK: $python" -ForegroundColor Green

$depsScript = Join-Path $RepoRoot "scripts\check_spike_deps.ps1"
if (Test-Path $depsScript) {
    & $depsScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Dependency check failed — review spike requirements" -ForegroundColor Yellow
    }
}

if (-not $SkipSidecar) {
    $sidecarScript = Join-Path $RepoRoot "scripts\build-sidecars.ps1"
    if (Test-Path $sidecarScript) {
        Write-Host "Materializing sidecar worker..." -ForegroundColor Cyan
        & $sidecarScript -SkipHostPublish
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Sidecar build failed (non-fatal for dev venv)" -ForegroundColor Yellow
        }
    }
}

Write-Host "setup-python complete" -ForegroundColor Green
