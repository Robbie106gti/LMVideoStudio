$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
Set-Location $SpikeRoot

$python = Join-Path $SpikeRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "Run setup_venv.ps1 first" -ForegroundColor Red
    exit 1
}

Write-Host "=== Gate 5: FastAPI worker ===" -ForegroundColor Cyan

$worker = Start-Process `
    -FilePath $python `
    -ArgumentList "-m", "uvicorn", "lmvs_worker.main:app", "--host", "127.0.0.1", "--port", "8765" `
    -WorkingDirectory $SpikeRoot `
    -PassThru `
    -WindowStyle Hidden
Start-Sleep -Seconds 5

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 30
    Write-Host ("Health OK: rocm={0}" -f $health.rocm)

    $body = @{
        prompt = "storyboard sketch, mountain landscape at dawn"
        steps  = 15
        seed   = 1
    } | ConvertTo-Json

    $gen = Invoke-RestMethod -Uri "http://127.0.0.1:8765/image/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 600
    $bytes = [Convert]::FromBase64String($gen.image_base64)
    $out = Join-Path $SpikeRoot "out\gate5_generate.png"
    [IO.File]::WriteAllBytes($out, $bytes)
    Write-Host "Wrote $out"

    @{ gate = 5; pass = $true; output = $out } | ConvertTo-Json | Set-Content (Join-Path $SpikeRoot "out\gate5.json")
    Write-Host "Gate 5: PASS" -ForegroundColor Green
} catch {
    Write-Host "Gate 5: FAIL - $_" -ForegroundColor Red
    exit 1
} finally {
    if ($worker -and -not $worker.HasExited) {
        Stop-Process -Id $worker.Id -Force -ErrorAction SilentlyContinue
    }
}
