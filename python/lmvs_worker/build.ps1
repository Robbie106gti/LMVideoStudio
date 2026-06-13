$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
Set-Location $SpikeRoot

$python = Join-Path $SpikeRoot ".venv\Scripts\python.exe"
$pyi = Join-Path $SpikeRoot ".venv\Scripts\pyinstaller.exe"

Write-Host "=== Gate 6: PyInstaller freeze ===" -ForegroundColor Cyan

& $pyi `
    --name lmvs_worker `
    --onedir `
    --clean `
    --noconfirm `
    --paths $SpikeRoot `
    --collect-all torch `
    --collect-all rocm_sdk `
    --collect-all rocm_sdk_core `
    --collect-all rocm_sdk_devel `
    --collect-all rocm_sdk_libraries_custom `
    --collect-all diffusers `
    --collect-all transformers `
    --hidden-import rocm_sdk `
    --hidden-import rocm_sdk_core `
    --hidden-import rocm_sdk_devel `
    --hidden-import rocm_sdk_libraries_custom `
    --add-data "$SpikeRoot\models;models" `
    --hidden-import uvicorn.logging `
    --hidden-import uvicorn.loops `
    --hidden-import uvicorn.loops.auto `
    --hidden-import uvicorn.protocols `
    --hidden-import uvicorn.protocols.http `
    --hidden-import uvicorn.protocols.http.auto `
    --hidden-import uvicorn.lifespan `
    --hidden-import uvicorn.lifespan.on `
    (Join-Path $SpikeRoot "lmvs_worker\main.py")

$exe = Join-Path $SpikeRoot "dist\lmvs_worker\lmvs_worker.exe"
if (-not (Test-Path $exe)) {
    Write-Host "FAIL: $exe not found" -ForegroundColor Red
    exit 1
}

$bundleDir = Join-Path $SpikeRoot "dist\lmvs_worker"
$sizeMb = [math]::Round((Get-ChildItem $bundleDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 0)
Write-Host "Bundle size: ~${sizeMb} MB"

$proc = Start-Process -FilePath $exe -WorkingDirectory $bundleDir -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 10
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 30
    Write-Host ("Frozen /health: rocm={0}" -f $health.rocm)
    @{ gate = 6; pass = $true; exe = $exe; size_mb = $sizeMb } | ConvertTo-Json | Set-Content (Join-Path $SpikeRoot "out\gate6.json")
    Write-Host "Gate 6: PASS" -ForegroundColor Green
} catch {
    Write-Host "Gate 6: FAIL - $_" -ForegroundColor Red
    Write-Host "Try running exe manually from dist\lmvs_worker for DLL errors"
    exit 1
} finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}
