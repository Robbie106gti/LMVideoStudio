$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
Set-Location $SpikeRoot

$python = "$SpikeRoot\.venv\Scripts\python.exe"

function Run-Gate($name, $script) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    & $script
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Stopped at $name (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Run-Gate "Gate 0" { & "$PSScriptRoot\gate0_preflight.ps1" }

if (-not (Test-Path $python)) {
    Write-Host "No venv — running setup_venv.ps1 (long)..." -ForegroundColor Yellow
    & "$PSScriptRoot\setup_venv.ps1"
}

Run-Gate "Gate 1" { & $python "$PSScriptRoot\gate1_torch.py" }
Run-Gate "Gate 2" { & $python "$PSScriptRoot\gate2_generate.py" }
Run-Gate "Gate 3" { & $python "$PSScriptRoot\gate3_upscale.py" }

# Gate 4 optional but recommended
& "$PSScriptRoot\gate4_ollama.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Gate 4 failed (optional) — continuing" -ForegroundColor Yellow
}

Run-Gate "Gate 5" { & "$PSScriptRoot\gate5_worker.ps1" }
Run-Gate "Gate 6" { & "$SpikeRoot\lmvs_worker\build.ps1" }
Run-Gate "Gate 7" { & $python "$PSScriptRoot\gate7_sequence.py" }

& "$PSScriptRoot\gate8_ffmpeg.ps1"
& "$PSScriptRoot\gate9_sidecar.ps1"

Write-Host "`nAll critical gates complete. Update docs/SPIKE-RESULTS.md from spike/out/*.json" -ForegroundColor Green
