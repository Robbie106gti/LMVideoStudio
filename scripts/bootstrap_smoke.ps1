<#
.SYNOPSIS
  Gate 10 - simulate first-run bootstrap pieces (preflight, models, sidecars, optional warmup).
  Documents steps for Phase 0 Setup Wizard automation.

.EXAMPLE
  .\scripts\bootstrap_smoke.ps1
  .\scripts\bootstrap_smoke.ps1 -SkipWarmup
#>
param(
    [switch]$SkipWarmup,
    [switch]$Json
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SpikeRoot = Join-Path $RepoRoot "spike"
$outDir = Join-Path $SpikeRoot "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$steps = @()

function Add-Step([string]$id, [bool]$ok, [string]$detail = "") {
    $script:steps += [pscustomobject]@{ id = $id; ok = $ok; detail = $detail }
}

Write-Host "=== Gate 10: Bootstrap smoke ===" -ForegroundColor Cyan

# 1 Preflight
& (Join-Path $SpikeRoot "scripts\gate0_preflight.ps1") | Out-Null
Add-Step "preflight" ($LASTEXITCODE -eq 0)

# 2 Model catalog
& (Join-Path $RepoRoot "scripts\sync_models.ps1") -Check | Out-Null
$modelOk = ($LASTEXITCODE -eq 0)
Add-Step "model_catalog" $modelOk $(if ($modelOk) { "required models present" } else { "run sync_models.ps1 -Pull" })

# 3 Conflict scan
& (Join-Path $RepoRoot "scripts\detect_gpu_conflicts.ps1") | Out-Null
Add-Step "conflict_scan" $true "advisory only"

# 4 Sidecar spawn (venv worker)
& (Join-Path $SpikeRoot "scripts\gate9_sidecar.ps1") | Out-Null
Add-Step "sidecar_spawn" ($LASTEXITCODE -eq 0)

# 5 Deps guard
& (Join-Path $RepoRoot "scripts\check_spike_deps.ps1") | Out-Null
Add-Step "deps_check" ($LASTEXITCODE -eq 0)

# 6 Optional GPU warmup (short gen)
if (-not $SkipWarmup) {
    $py = Join-Path $SpikeRoot ".venv\Scripts\python.exe"
    if (Test-Path $py) {
        Write-Host "GPU warmup (512px, 10 steps)..." -ForegroundColor Yellow
        $warmup = & $py -c @"
import os, time
os.environ['LMVS_SD_MODEL'] = os.environ.get('LMVS_SD_MODEL', 'runwayml/stable-diffusion-v1-5')
import sys
sys.path.insert(0, r'$SpikeRoot')
from lib.pipelines import generate_image, unload_sd_pipeline
t0 = time.perf_counter()
img = generate_image('warmup test frame, simple gradient', width=512, height=512, steps=10, seed=0)
path = r'$outDir\gate10_warmup.png'
img.save(path)
unload_sd_pipeline()
print(f'OK {time.perf_counter()-t0:.1f}s -> {path}')
"@ 2>&1
        Write-Host $warmup
        Add-Step "gpu_warmup" ($LASTEXITCODE -eq 0) ($warmup | Select-Object -Last 1)
    } else {
        Add-Step "gpu_warmup" $false "venv missing"
    }
} else {
    Add-Step "gpu_warmup" $true "skipped"
}

$passed = ($steps | Where-Object { -not $_.ok }).Count -eq 0
$result = @{
    gate   = 10
    pass   = $passed
    steps  = $steps
    note   = "Manual UAC for Ollama install not simulated; run once on fresh profile and document"
}

$result | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $outDir "gate10.json")

if ($Json) {
    $result | ConvertTo-Json -Depth 5
}

if ($passed) {
    Write-Host "`nGate 10: PASS" -ForegroundColor Green
    exit 0
}

Write-Host "`nGate 10: FAIL - see spike/out/gate10.json" -ForegroundColor Red
$steps | Where-Object { -not $_.ok } | ForEach-Object { Write-Host ("  FAIL: {0} {1}" -f $_.id, $_.detail) -ForegroundColor Red }
exit 1
