<#
.SYNOPSIS
  GPU E2E smoke: worker health + Stable Diffusion generation (no Host/Ollama).

.DESCRIPTION
  - Reuses an existing worker on :8765 when healthy, otherwise starts one from sidecar or spike venv
  - POST /image/generate; writes PNG to out/ and validates response + file
  - Profile smoke (default): 256x256, 8 steps, ~10s — fast sanity check
  - Profile stress (-Stress or -Profile stress): 768x768, 25 steps, 3 sequential gens — sustained GPU load
  - Skips gracefully when no GPU/CUDA/ROCm or worker venv (use -Force to fail instead)

.EXAMPLE
  .\scripts\gpu_e2e_smoke.ps1
  .\scripts\gpu_e2e_smoke.ps1 -Force
  .\scripts\gpu_e2e_smoke.ps1 -Stress
  .\scripts\gpu_e2e_smoke.ps1 -Profile stress
  .\scripts\gpu_e2e_smoke.ps1 -WorkerUrl http://127.0.0.1:8765 -Steps 8 -Width 256 -Height 256
#>
param(
    [string]$WorkerUrl = "http://127.0.0.1:8765",
    [ValidateSet("smoke", "stress")]
    [string]$Profile = "smoke",
    [switch]$Stress,
    [int]$Width = -1,
    [int]$Height = -1,
    [int]$Steps = -1,
    [int]$Generations = -1,
    [int]$Seed = 42,
    [int]$HealthTimeoutSec = 60,
    [int]$GenerateTimeoutSec = -1,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$env:LMVS_REPO_ROOT = $RepoRoot

if ($Stress) {
    $Profile = "stress"
}

$profileDefaults = @{
    smoke = @{
        Width = 256
        Height = 256
        Steps = 8
        Generations = 1
        OutStem = "gpu_e2e_smoke"
        GenerateTimeoutSec = 600
        Title = "GPU E2E smoke"
        PassLabel = "GPU E2E smoke passed."
    }
    stress = @{
        Width = 768
        Height = 768
        Steps = 25
        Generations = 3
        OutStem = "gpu_e2e_stress"
        GenerateTimeoutSec = 1800
        Title = "GPU E2E stress"
        PassLabel = "GPU E2E stress passed."
    }
}

$defaults = $profileDefaults[$Profile]
if ($Width -lt 0) { $Width = $defaults.Width }
if ($Height -lt 0) { $Height = $defaults.Height }
if ($Steps -lt 0) { $Steps = $defaults.Steps }
if ($Generations -lt 1) { $Generations = $defaults.Generations }
if ($GenerateTimeoutSec -lt 0) { $GenerateTimeoutSec = $defaults.GenerateTimeoutSec }

$OutDir = Join-Path $RepoRoot "out"
$OutStem = $defaults.OutStem
$RunTitle = $defaults.Title
$PassLabel = $defaults.PassLabel

$workerProcess = $null
$startedWorker = $false

function Write-Skip {
    param([string]$Message)
    Write-Host ""
    Write-Host "$RunTitle SKIPPED: $Message" -ForegroundColor Yellow
    Write-Host "  Prerequisites: spike\scripts\setup_venv.ps1 (or build-sidecars.ps1), sync_models.ps1 -Pull" -ForegroundColor DarkGray
    Write-Host "  Re-run with -Force to treat skip as failure." -ForegroundColor DarkGray
    exit 0
}

function Write-Fail {
    param([string]$Message)
    Write-Host ""
    Write-Host "$RunTitle FAILED: $Message" -ForegroundColor Red
    exit 1
}

function Get-WorkerPort {
    param([string]$Url)
    try {
        $uri = [Uri]$Url
        if ($uri.Port -gt 0) { return $uri.Port }
    } catch { }
    return 8765
}

function Test-WorkerPortListening {
    param([int]$Port)
    try {
        $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $listeners -and $listeners.Count -gt 0)
    } catch {
        $escapedPort = [regex]::Escape("$Port")
        $pattern = "^\s*TCP\s+\S+:$escapedPort\s+\S+\s+LISTENING\s+\d+\s*$"
        return [bool](netstat -ano | Where-Object { $_ -match $pattern })
    }
}

function Resolve-WorkerRuntime {
    $SpikeRoot = Join-Path $RepoRoot "spike"
    $PythonRoot = Join-Path $RepoRoot "python"
    $SidecarRoot = Join-Path $RepoRoot "sidecars\lmvs_worker"
    $SpikeWorker = Join-Path $SpikeRoot "lmvs_worker"

    function Get-WorkerWorkDir {
        if (Test-Path (Join-Path $PythonRoot "lmvs_worker")) { return $PythonRoot }
        if (Test-Path $SpikeWorker) { return $SpikeRoot }
        return $SidecarRoot
    }

    $workDir = Get-WorkerWorkDir

    $candidates = @(
        @{
            Python = Join-Path $SidecarRoot ".venv\Scripts\python.exe"
            WorkDir = $workDir
            Label = "sidecar venv"
        },
        @{
            Python = Join-Path $SpikeRoot ".venv\Scripts\python.exe"
            WorkDir = $workDir
            Label = "spike venv"
        },
        @{
            Python = Join-Path $PythonRoot ".venv\Scripts\python.exe"
            WorkDir = $workDir
            Label = "python venv"
        }
    )

    foreach ($entry in $candidates) {
        if (Test-Path $entry.Python) {
            return $entry
        }
    }

    return $null
}

function Test-TorchCudaAvailable {
    param([string]$Python)
    if (-not $Python -or -not (Test-Path $Python)) {
        return $false
    }

    $code = @"
import sys
try:
    import torch
    sys.exit(0 if torch.cuda.is_available() else 2)
except ImportError:
    sys.exit(1)
"@
    & $Python -c $code 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Wait-WorkerHealth {
    param(
        [string]$Url,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastError = $null

    while ((Get-Date) -lt $deadline) {
        try {
            return Invoke-RestMethod -Uri "$Url/health" -TimeoutSec 5
        } catch {
            $lastError = $_.Exception.Message
            Start-Sleep -Milliseconds 500
        }
    }

    throw "Worker health timeout after ${TimeoutSeconds}s ($lastError)"
}

function Assert-PngOutput {
    param(
        [string]$Path,
        [int]$MinBytes = 512
    )

    if (-not (Test-Path $Path)) {
        throw "Output image missing: $Path"
    }

    $info = Get-Item $Path
    if ($info.Length -lt $MinBytes) {
        throw ('Output image too small ({0} bytes): {1}' -f $info.Length, $Path)
    }

    $bytes = [IO.File]::ReadAllBytes($Path)
    $isPng = ($bytes.Length -ge 8) -and
        ($bytes[0] -eq 0x89) -and ($bytes[1] -eq 0x50) -and ($bytes[2] -eq 0x4E) -and ($bytes[3] -eq 0x47)
    if (-not $isPng) {
        throw "Output is not a PNG: $Path"
    }
}

function Format-DeviceLine {
    param($HealthOrDevice)
    $torchDev = $HealthOrDevice.torch_device
    if (-not $torchDev) { $torchDev = "?" }
    return ("device={0} torch_device={1} rocm={2} vram_gb={3}" -f
        $HealthOrDevice.device_name, $torchDev, $HealthOrDevice.rocm, $HealthOrDevice.vram_gb)
}

function Invoke-Generate {
    param(
        [string]$Url,
        [int]$GenWidth,
        [int]$GenHeight,
        [int]$GenSteps,
        [int]$GenSeed,
        [int]$TimeoutSec
    )

    $body = @{
        prompt = "gpu e2e $Profile test, cinematic landscape with detailed clouds and mountains"
        width  = $GenWidth
        height = $GenHeight
        steps  = $GenSteps
        seed   = $GenSeed
    } | ConvertTo-Json

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $gen = Invoke-RestMethod `
        -Uri "$Url/image/generate" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec $TimeoutSec
    $sw.Stop()

    if (-not $gen.image_base64) {
        throw "Generate response missing image_base64"
    }

    if ($gen.device) {
        $devLine = Format-DeviceLine $gen.device
        if ($gen.device.torch_device -and $gen.device.torch_device -eq "cpu") {
            throw "Worker generated on CPU (torch_device=cpu); expected cuda device"
        }
        if ($gen.device.rocm -eq $false) {
            throw "Worker reports rocm=false after generate"
        }
    }

    $bytes = [Convert]::FromBase64String($gen.image_base64)
    if ($bytes.Length -lt 512) {
        throw ('Decoded image too small ({0} bytes)' -f $bytes.Length)
    }

    return @{
        Bytes = $bytes
        Seconds = $sw.Elapsed.TotalSeconds
        Device = $gen.device
    }
}

try {
    Write-Host "=== $RunTitle ===" -ForegroundColor Cyan
    Write-Host ("Profile: {0} ({1}x{2}, {3} steps, {4} gen(s))" -f $Profile, $Width, $Height, $Steps, $Generations) -ForegroundColor DarkGray
    Write-Host "Worker: $WorkerUrl" -ForegroundColor DarkGray

    $port = Get-WorkerPort $WorkerUrl
    $workerAlreadyRunning = Test-WorkerPortListening -Port $port
    $runtime = Resolve-WorkerRuntime

    if ($workerAlreadyRunning) {
        Write-Host "Worker port :$port already listening - reusing existing process" -ForegroundColor DarkGray
        Write-Host "  (Restart worker if code changed since last start)" -ForegroundColor DarkGray
    } elseif (-not $runtime) {
        if ($Force) {
            Write-Fail "No worker venv found. Run spike\scripts\setup_venv.ps1 or .\scripts\build-sidecars.ps1"
        }
        Write-Skip "No worker venv found (sidecars\lmvs_worker\.venv or spike\.venv)."
    }

    if (-not $workerAlreadyRunning) {
        $hasGpu = Test-TorchCudaAvailable -Python $runtime.Python
        if (-not $hasGpu) {
            if ($Force) {
                Write-Fail "torch.cuda.is_available is false for $($runtime.Label) ($($runtime.Python))"
            }
            Write-Skip "No CUDA/ROCm GPU detected (torch.cuda.is_available is false)."
        }
        Write-Host ('Starting worker via {0} ...' -f $runtime.Label) -ForegroundColor Cyan
        $workerProcess = Start-Process `
            -FilePath $runtime.Python `
            -ArgumentList "-m", "uvicorn", "lmvs_worker.main:app", "--host", "127.0.0.1", "--port", "$port" `
            -WorkingDirectory $runtime.WorkDir `
            -PassThru `
            -WindowStyle Hidden
        $startedWorker = $true
    }

    Write-Host ('Waiting for worker health (timeout {0}s) ...' -f $HealthTimeoutSec) -ForegroundColor DarkGray
    $health = Wait-WorkerHealth -Url $WorkerUrl -TimeoutSeconds $HealthTimeoutSec
    Write-Host ("  {0}" -f (Format-DeviceLine $health)) -ForegroundColor Green

    if (-not $health.rocm) {
        if ($Force) {
            Write-Fail "Worker /health reports rocm=false (no GPU backend)."
        }
        Write-Skip "Worker reports no GPU backend (health.rocm=false)."
    }

    if ($health.torch_device -eq "cpu") {
        if ($Force) {
            Write-Fail "Worker /health reports torch_device=cpu."
        }
        Write-Skip "Worker reports torch_device=cpu (not using GPU)."
    }

    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

    $totalGenSeconds = 0.0
    for ($i = 1; $i -le $Generations; $i++) {
        $genSeed = $Seed + ($i - 1)
        $outImage = if ($Generations -eq 1) {
            Join-Path $OutDir "$OutStem.png"
        } else {
            Join-Path $OutDir ("{0}_{1}.png" -f $OutStem, $i)
        }

        $genLabel = 'POST /image/generate #{0}/{1} ({2}x{3}, {4} steps, seed {5})' -f $i, $Generations, $Width, $Height, $Steps, $genSeed
        Write-Host ('{0} ...' -f $genLabel) -ForegroundColor Cyan

        $result = Invoke-Generate -Url $WorkerUrl -GenWidth $Width -GenHeight $Height -GenSteps $Steps -GenSeed $genSeed -TimeoutSec $GenerateTimeoutSec
        [IO.File]::WriteAllBytes($outImage, $result.Bytes)
        Assert-PngOutput -Path $outImage
        $totalGenSeconds += $result.Seconds

        if ($result.Device) {
            Write-Host ("  device: {0}" -f (Format-DeviceLine $result.Device)) -ForegroundColor DarkGray
        }
        Write-Host ('  OK generate in {0:F1}s -> {1} ({2} bytes)' -f $result.Seconds, $outImage, $result.Bytes.Length) -ForegroundColor Green
    }

    if ($Generations -gt 1) {
        Write-Host ('  Total generate time: {0:F1}s across {1} run(s)' -f $totalGenSeconds, $Generations) -ForegroundColor Green
    }

    Write-Host ""
    Write-Host $PassLabel -ForegroundColor Green
    if ($Profile -eq "stress") {
        Write-Host "  Task Manager GPU Compute should spike during each generation (768x768 x25 steps)." -ForegroundColor DarkGray
        Write-Host "  Flat Compute at ~0% with VRAM loaded usually means the job was too small or the graph lags ROCm." -ForegroundColor DarkGray
    }
    exit 0
}
catch {
    if ($Force) {
        Write-Fail $_
    }
    Write-Host ""
    Write-Host ('{0} FAILED: {1}' -f $RunTitle, $_) -ForegroundColor Red
    exit 1
}
finally {
    if ($startedWorker -and $workerProcess -and -not $workerProcess.HasExited) {
        Write-Host ('Stopping worker started by smoke script (PID {0}) ...' -f $workerProcess.Id) -ForegroundColor DarkGray
        Stop-Process -Id $workerProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
