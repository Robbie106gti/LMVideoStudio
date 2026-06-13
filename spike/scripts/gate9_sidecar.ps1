$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $SpikeRoot ".venv\Scripts\python.exe"
$outJson = Join-Path $SpikeRoot "out\gate9.json"

Write-Host "=== Gate 9: Sidecar spawn ===" -ForegroundColor Cyan

function Test-SidecarHealth([string]$label, [System.Diagnostics.Process]$proc) {
    Start-Sleep -Seconds 5
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 15
        Write-Host ("{0}: rocm={1} vram_gb={2}" -f $label, $health.rocm, $health.vram_gb)
        return $health
    } finally {
        if ($proc -and -not $proc.HasExited) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

# Phase 0 pattern: spawn venv Python sidecar (works today)
if (-not (Test-Path $python)) {
    Write-Host "FAIL: venv python not found" -ForegroundColor Red
    exit 1
}

$venvProc = Start-Process `
    -FilePath $python `
    -ArgumentList "-m", "uvicorn", "lmvs_worker.main:app", "--host", "127.0.0.1", "--port", "8765" `
    -WorkingDirectory $SpikeRoot `
    -PassThru `
    -WindowStyle Hidden

try {
    $health = Test-SidecarHealth "venv sidecar" $venvProc
    $frozenPass = $false
    $frozenNote = "not tested"

    $exe = Join-Path $SpikeRoot "dist\lmvs_worker\lmvs_worker.exe"
    if (Test-Path $exe) {
        Write-Host "Also testing frozen exe (Gate 6)..." -ForegroundColor Yellow
        $frozenProc = Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 8
        try {
            $frozenHealth = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 10
            $frozenPass = $true
            $frozenNote = "frozen exe health OK"
            Write-Host "frozen exe: PASS" -ForegroundColor Green
        } catch {
            $frozenNote = "frozen exe failed: $_"
            Write-Host "frozen exe: FAIL (expected until rocm_sdk bundled)" -ForegroundColor Yellow
        } finally {
            if ($frozenProc -and -not $frozenProc.HasExited) {
                Stop-Process -Id $frozenProc.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }

    @{
        gate        = 9
        pass        = $true
        venv_sidecar = $true
        frozen_exe  = $frozenPass
        health      = $health
        note        = $frozenNote
    } | ConvertTo-Json -Depth 5 | Set-Content $outJson

    Write-Host "Gate 9: PASS (venv sidecar orchestration validated)" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Gate 9: FAIL - $_" -ForegroundColor Red
    exit 1
}
