<#
.SYNOPSIS
  Verify sidecar layout before Tauri installer build.

.EXAMPLE
  .\scripts\verify-sidecar-staging.ps1
  .\scripts\verify-sidecar-staging.ps1 -AllowSpikeVenvFallback
  .\scripts\verify-sidecar-staging.ps1 -TauriSrcDir src\LMVideoStudio.Tauri\src-tauri
#>
param(
    [switch]$AllowSpikeVenvFallback,
    [string]$TauriSrcDir = "",
    [int]$MinHostExeBytes = 5MB
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SidecarsDir = Join-Path $RepoRoot "sidecars"
$WorkerRoot = Join-Path $SidecarsDir "lmvs_worker"
$HostExe = Join-Path $SidecarsDir "LMVideoStudio.Host.exe"

$errors = @()
$warnings = @()

function Test-FileSize([string]$Path, [int]$MinBytes, [string]$Label) {
    if (-not (Test-Path $Path)) {
        $script:errors += "Missing $Label`: $Path"
        return
    }
    $len = (Get-Item $Path).Length
    if ($len -lt $MinBytes) {
        $script:errors += "$Label too small ($len bytes, expected >= $MinBytes): $Path"
    }
}

Write-Host "=== verify-sidecar-staging ===" -ForegroundColor Cyan

Test-FileSize $HostExe $MinHostExeBytes "Host sidecar (self-contained single-file publish)"

$workerPkg = Join-Path $WorkerRoot "lmvs_worker"
if (-not (Test-Path $workerPkg)) {
    $errors += "Missing Python worker package: $workerPkg"
}

$sidecarVenv = Join-Path $WorkerRoot ".venv\Scripts\python.exe"
$spikeVenv = Join-Path $RepoRoot "spike\.venv\Scripts\python.exe"
$hasSidecarVenv = Test-Path $sidecarVenv
$hasSpikeVenv = Test-Path $spikeVenv

if (-not $hasSidecarVenv) {
    if ($AllowSpikeVenvFallback -and $hasSpikeVenv) {
        $warnings += "Worker venv not in sidecar; build-fast will use spike\.venv at runtime (not for end-user installs)."
    } else {
        $errors += @(
            "Missing embedded worker venv: $sidecarVenv",
            "  Run: .\scripts\build-sidecars.ps1   (copies ~2GB spike .venv)",
            "  Or:  .\scripts\verify-sidecar-staging.ps1 -AllowSpikeVenvFallback   (dev only)"
        )
    }
} else {
    Write-Host "  worker venv: OK" -ForegroundColor DarkGray
}

$ffmpeg = Join-Path $WorkerRoot "bin\ffmpeg.exe"
if (-not (Test-Path $ffmpeg)) {
    $warnings += "FFmpeg not bundled in sidecar bin (Ken Burns export needs ffmpeg on PATH or FFMPEG_HOME during build-sidecars)."
} else {
    Write-Host "  ffmpeg: OK" -ForegroundColor DarkGray
}

# hf_cache and models/ are runtime-downloaded; excluded from Tauri bundle.resources (WiX 2 GiB per-file limit).
$hfCache = Join-Path $WorkerRoot "hf_cache"
if (Test-Path $hfCache) {
    Write-Host "  hf_cache: present locally (excluded from installer; models download on first use)" -ForegroundColor DarkGray
}
$modelsDir = Join-Path $WorkerRoot "models"
if (Test-Path $modelsDir) {
    Write-Host "  models/: present locally (excluded from installer bundle)" -ForegroundColor DarkGray
}

if ($TauriSrcDir) {
    $tauriSidecars = Join-Path $TauriSrcDir "sidecars"
    $hostStaged = Get-ChildItem -Path $tauriSidecars -Filter "LMVideoStudio.Host*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    $workerStaged = Get-ChildItem -Path (Join-Path $tauriSidecars "lmvs_worker") -Filter "run_worker*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

    if (-not $hostStaged) {
        $errors += "Tauri externalBin Host not staged under $tauriSidecars"
    } elseif ($hostStaged.Length -lt $MinHostExeBytes) {
        $errors += @(
            "Staged Host sidecar is a framework-dependent stub ($($hostStaged.Length) bytes, need >= $MinHostExeBytes).",
            "  Re-run: .\scripts\build-installer.ps1   (Ensure-LmvsHostSidecar publishes self-contained Host)"
        )
    }
    if (-not $workerStaged) {
        $errors += "Tauri externalBin run_worker not staged under $tauriSidecars\lmvs_worker"
    }
}

foreach ($w in $warnings) {
    Write-Host "WARNING: $w" -ForegroundColor Yellow
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Sidecar staging FAILED:" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "  $e" -ForegroundColor Red }
    exit 1
}

Write-Host "Sidecar staging OK." -ForegroundColor Green
exit 0
