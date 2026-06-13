$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
Set-Location $SpikeRoot

Write-Host "=== Setup: Python 3.12 venv + ROCm 7.2.1 + spike deps ===" -ForegroundColor Cyan

if (-not (Test-Path "$SpikeRoot\.venv")) {
    & py -3.12 -m venv "$SpikeRoot\.venv"
}

$python = "$SpikeRoot\.venv\Scripts\python.exe"
$pip = "$SpikeRoot\.venv\Scripts\pip.exe"

& $python -m pip install --upgrade pip wheel setuptools

Write-Host "Installing ROCm SDK wheels (this may take several minutes)..." -ForegroundColor Yellow
& $pip install --no-cache-dir `
    "https://repo.radeon.com/rocm/windows/rocm-rel-7.2.1/rocm_sdk_core-7.2.1-py3-none-win_amd64.whl" `
    "https://repo.radeon.com/rocm/windows/rocm-rel-7.2.1/rocm_sdk_devel-7.2.1-py3-none-win_amd64.whl" `
    "https://repo.radeon.com/rocm/windows/rocm-rel-7.2.1/rocm_sdk_libraries_custom-7.2.1-py3-none-win_amd64.whl" `
    "https://repo.radeon.com/rocm/windows/rocm-rel-7.2.1/rocm-7.2.1.tar.gz"

Write-Host "Installing PyTorch ROCm wheels..." -ForegroundColor Yellow
& $pip install --no-cache-dir `
    "https://repo.radeon.com/rocm/windows/rocm-rel-7.2.1/torch-2.9.1%2Brocm7.2.1-cp312-cp312-win_amd64.whl" `
    "https://repo.radeon.com/rocm/windows/rocm-rel-7.2.1/torchaudio-2.9.1%2Brocm7.2.1-cp312-cp312-win_amd64.whl" `
    "https://repo.radeon.com/rocm/windows/rocm-rel-7.2.1/torchvision-0.24.1%2Brocm7.2.1-cp312-cp312-win_amd64.whl"

Write-Host "Installing spike requirements (no torchao)..." -ForegroundColor Yellow
& $pip install -r "$SpikeRoot\requirements-spike.txt"

Write-Host "`nSetup complete. Activate with:" -ForegroundColor Green
Write-Host "  .\.venv\Scripts\Activate.ps1"
