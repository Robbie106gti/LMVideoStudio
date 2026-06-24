<#
.SYNOPSIS
  Phase 0 sidecar build - materialize sidecars/lmvs_worker from promoted python/ or spike.

.DESCRIPTION
  - Copies worker source (python/lmvs_worker + lib, else spike)
  - Copies spike .venv into the sidecar (large, one-time unless -Force)
  - Bundles ffmpeg/ffprobe into sidecars/lmvs_worker/bin when found on PATH or FFMPEG_HOME
  - Publishes F# Host to sidecars/ when src/*Host*.fsproj exists

.EXAMPLE
  .\scripts\build-sidecars.ps1
  .\scripts\build-sidecars.ps1 -SkipVenvCopy
  .\scripts\build-sidecars.ps1 -Force
#>
param(
    [switch]$SkipVenvCopy,
    [switch]$SkipHostPublish,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "build-prereqs.ps1")

$RepoRoot = Split-Path -Parent $PSScriptRoot
$SidecarRoot = Join-Path $RepoRoot "sidecars\lmvs_worker"
$SidecarsDir = Join-Path $RepoRoot "sidecars"
$SpikeRoot = Join-Path $RepoRoot "spike"
$PythonRoot = Join-Path $RepoRoot "python"
$SpikeVenv = Join-Path $SpikeRoot ".venv"
$SpikeWorker = Join-Path $SpikeRoot "lmvs_worker"
$SpikeLib = Join-Path $SpikeRoot "lib"

function Resolve-WorkerSources {
    $worker = if (Test-Path (Join-Path $PythonRoot "lmvs_worker")) {
        Join-Path $PythonRoot "lmvs_worker"
    } else {
        $SpikeWorker
    }
    $lib = if (Test-Path (Join-Path $PythonRoot "lib")) {
        Join-Path $PythonRoot "lib"
    } else {
        $SpikeLib
    }
    return @{ Worker = $worker; Lib = $lib }
}

function Copy-Tree([string]$Source, [string]$Dest) {
    if (-not (Test-Path $Source)) {
        throw "Missing source: $Source"
    }
    if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
    $null = New-Item -ItemType Directory -Force -Path $Dest
    Get-ChildItem $Source -Recurse -File | Where-Object { $_.FullName -notmatch '__pycache__' } | ForEach-Object {
        $rel = $_.FullName.Substring($Source.Length).TrimStart('\')
        $target = Join-Path $Dest $rel
        $parent = Split-Path $target -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        Copy-Item $_.FullName $target -Force
    }
}

function Copy-FfmpegBundle([string]$BinDest) {
    $names = @("ffmpeg.exe", "ffprobe.exe")
    $candidates = [System.Collections.Generic.List[string]]::new()
    $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        $candidates.Add($cmd.Source)
        $candidates.Add((Join-Path (Split-Path $cmd.Source -Parent) "ffprobe.exe"))
    }
    if ($env:FFMPEG_HOME) {
        $candidates.Add((Join-Path $env:FFMPEG_HOME "bin\ffmpeg.exe"))
        $candidates.Add((Join-Path $env:FFMPEG_HOME "ffmpeg.exe"))
        $candidates.Add((Join-Path $env:FFMPEG_HOME "bin\ffprobe.exe"))
    }
    $seen = @{}
    $copied = 0
    New-Item -ItemType Directory -Force -Path $BinDest | Out-Null
    foreach ($path in $candidates) {
        if (-not $path -or -not (Test-Path $path)) { continue }
        $leaf = Split-Path $path -Leaf
        if ($leaf -notin $names) { continue }
        if ($seen.ContainsKey($leaf)) { continue }
        $seen[$leaf] = $true
        Copy-Item $path (Join-Path $BinDest $leaf) -Force
        Write-Host "Bundled $leaf -> $BinDest"
        $copied++
    }
    if ($copied -eq 0) {
        Write-Host "FFmpeg not found on PATH or FFMPEG_HOME - skip bundle (install for Ken Burns export)" -ForegroundColor Yellow
    }
    return $copied
}

Write-Host "=== build-sidecars (Phase 0) ===" -ForegroundColor Cyan

Assert-LmvsBuildPrerequisites

if (-not (Test-Path $SpikeVenv)) {
    Write-Host "Spike venv missing - run spike/scripts/setup_venv.ps1 first" -ForegroundColor Red
    exit 1
}

$sources = Resolve-WorkerSources
New-Item -ItemType Directory -Force -Path $SidecarRoot | Out-Null
New-Item -ItemType Directory -Force -Path $SidecarsDir | Out-Null

foreach ($pair in @(
        @{ Name = "lmvs_worker"; Path = $sources.Worker },
        @{ Name = "lib"; Path = $sources.Lib }
    )) {
    $dest = Join-Path $SidecarRoot $pair.Name
    if ((Test-Path $dest) -and -not $Force) {
        Write-Host "Exists: $dest (use -Force to refresh)" -ForegroundColor DarkGray
    } else {
        Copy-Tree $pair.Path $dest
        Write-Host "Copied $($pair.Name) -> $dest"
    }
}

# Optional weights (spike/models or python/models)
foreach ($modelsSrc in @(
        (Join-Path $PythonRoot "models"),
        (Join-Path $SpikeRoot "models")
    )) {
    if (Test-Path $modelsSrc) {
        Copy-Item $modelsSrc (Join-Path $SidecarRoot "models") -Recurse -Force -ErrorAction SilentlyContinue
        break
    }
}

# requirements hint for repair flows
$reqSrc = Join-Path $PythonRoot "requirements-worker.txt"
if (-not (Test-Path $reqSrc)) { $reqSrc = Join-Path $SpikeRoot "requirements-spike.txt" }
if (Test-Path $reqSrc) {
    Copy-Item $reqSrc (Join-Path $SidecarRoot "requirements-worker.txt") -Force
}

if (-not $SkipVenvCopy) {
    $venvDest = Join-Path $SidecarRoot ".venv"
    if ((Test-Path $venvDest) -and -not $Force) {
        Write-Host "Venv exists (~2GB): $venvDest - use -Force to recopy" -ForegroundColor Yellow
    } else {
        Write-Host "Copying spike venv into sidecar (large, one-time)..." -ForegroundColor Yellow
        if (Test-Path $venvDest) { Remove-Item $venvDest -Recurse -Force }
        Copy-Item $SpikeVenv $venvDest -Recurse -Force
        Write-Host "Venv copied to $venvDest"
    }
}

$binDir = Join-Path $SidecarRoot "bin"
Copy-FfmpegBundle $binDir | Out-Null

$launch = @"
@echo off
cd /d "%~dp0"
set "PATH=%~dp0bin;%PATH%"
set "PYTHON=%~dp0.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=%~dp0..\..\spike\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo ERROR: No worker venv found.
  echo   Option A: .\scripts\build-sidecars.ps1   ^(copies spike .venv into sidecars\lmvs_worker^)
  echo   Option B: spike\scripts\setup_venv.ps1   ^(then re-run build-sidecars or use spike venv^)
  exit /b 1
)
"%PYTHON%" -m uvicorn lmvs_worker.main:app --host 127.0.0.1 --port 8765
"@
Set-Content -Path (Join-Path $SidecarRoot "run_worker.cmd") -Value $launch -Encoding ASCII

if (-not $SkipHostPublish) {
    try {
        Ensure-LmvsHostSidecar -RepoRoot $RepoRoot -OutputDir $SidecarsDir | Out-Null
    } catch {
        Write-Host "Host publish skipped/failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

$verifyScript = Join-Path $PSScriptRoot "verify-sidecar-staging.ps1"
$verifyArgs = @{}
if ($SkipVenvCopy) { $verifyArgs['AllowSpikeVenvFallback'] = $true }
& $verifyScript @verifyArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Sidecar ready at: $SidecarRoot" -ForegroundColor Green
Write-Host "Test: cd sidecars\lmvs_worker && run_worker.cmd"
