<#
.SYNOPSIS
  Build LMVideoStudio production installer bundle (no code signing).

.DESCRIPTION
  Produces Tauri NSIS/MSI artifacts under src/LMVideoStudio.Tauri/src-tauri/target/release/bundle/
  after building Host sidecars, Fable client, and Tauri app. Signing keys are placeholders only.

.EXAMPLE
  .\scripts\build-installer.ps1
  .\scripts\build-installer.ps1 -SkipSidecars
  .\scripts\build-installer.ps1 -SkipVenvCopy -AllowSpikeVenvFallback
#>
param(
    [switch]$SkipSidecars,
    [switch]$SkipVenvCopy,
    [switch]$AllowSpikeVenvFallback,
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "build-prereqs.ps1")

$RepoRoot = Split-Path -Parent $PSScriptRoot
$env:LMVS_REPO_ROOT = $RepoRoot

$TauriDir = Join-Path $RepoRoot "src\LMVideoStudio.Tauri"
$TauriManifest = Join-Path $TauriDir "src-tauri\tauri.conf.json"
$ClientDir = Join-Path $RepoRoot "src\LMVideoStudio.Client"
$Sln = Join-Path $RepoRoot "LMVideoStudio.sln"
$VerifyScript = Join-Path $RepoRoot "scripts\verify-sidecar-staging.ps1"
$WorkerStubRs = Join-Path $RepoRoot "scripts\run_worker_stub.rs"

if ($SkipVenvCopy -and -not $AllowSpikeVenvFallback) {
    $AllowSpikeVenvFallback = $true
}

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Install-Npm([string]$Dir) {
    Push-Location $Dir
    try {
        if (Test-Path "package-lock.json") {
            npm ci
        } else {
            npm install
        }
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally {
        Pop-Location
    }
}

function Get-RustHostTriple {
    $line = (rustc -Vv 2>$null) | Where-Object { $_ -match '^host:' } | Select-Object -First 1
    if ($line -match 'host:\s+(\S+)') { return $Matches[1] }
    return "x86_64-pc-windows-msvc"
}

function Stage-TauriExternalBins {
    param(
        [string]$TauriSrcDir,
        [string]$SidecarsRoot
    )

    if (-not (Test-Path $WorkerStubRs)) {
        throw "Missing worker stub source: $WorkerStubRs"
    }

    $triple = Get-RustHostTriple
    Write-Host "  target triple: $triple" -ForegroundColor DarkGray

    $destRoot = Join-Path $TauriSrcDir "sidecars"
    $hostSrc = Join-Path $SidecarsRoot "LMVideoStudio.Host.exe"
    if (-not (Test-Path $hostSrc)) {
        throw "Missing Host sidecar: $hostSrc (run .\scripts\build-sidecars.ps1 first)"
    }

    New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
    $hostDest = Join-Path $destRoot "LMVideoStudio.Host-$triple.exe"
    Copy-Item $hostSrc $hostDest -Force
    Write-Host "  staged: $hostDest"

    $workerDestDir = Join-Path $destRoot "lmvs_worker"
    New-Item -ItemType Directory -Force -Path $workerDestDir | Out-Null
    $workerDest = Join-Path $workerDestDir "run_worker-$triple.exe"

    & rustc $WorkerStubRs -O -o $workerDest
    if ($LASTEXITCODE -ne 0) { throw "rustc failed to build run_worker sidecar stub" }
    Write-Host "  staged: $workerDest"
}

Write-Step "Check build prerequisites"
Initialize-LmvsRustToolchainPath
Assert-LmvsBuildPrerequisites -RequireRust -RequireNode
Initialize-LmvsMsvcEnvironment
Write-LmvsToolVersions

Write-Step "Validate Tauri bundle config"
if (-not (Test-Path $TauriManifest)) {
    throw "Missing Tauri manifest: $TauriManifest"
}
$tauri = Get-Content $TauriManifest -Raw | ConvertFrom-Json
if (-not $tauri.bundle.active) {
    throw "Tauri bundle.active must be true for installer build"
}
Write-Host "  product: $($tauri.productName) v$($tauri.version)"
Write-Host "  externalBin: $($tauri.bundle.externalBin -join ', ')"

Write-Step "Build .NET solution ($Configuration)"
if (Test-Path $Sln) {
    dotnet build $Sln -c $Configuration
} else {
    dotnet build (Join-Path $RepoRoot "src\LMVideoStudio.Host\LMVideoStudio.Host.fsproj") -c $Configuration
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipSidecars) {
    Write-Step "Build sidecars (Host + worker)"
    $sidecarScript = Join-Path $RepoRoot "scripts\build-sidecars.ps1"
    if (-not (Test-Path $sidecarScript)) {
        throw "Missing $sidecarScript"
    }
    $sidecarArgs = @()
    if ($SkipVenvCopy) { $sidecarArgs += "-SkipVenvCopy" }
    & $sidecarScript @sidecarArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "Skipped sidecars (-SkipSidecars)" -ForegroundColor DarkGray
}

Write-Step "Verify sidecar layout"
$verifyArgs = @()
if ($AllowSpikeVenvFallback) { $verifyArgs += "-AllowSpikeVenvFallback" }
& $VerifyScript @verifyArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Fable compile + Vite production build"
Push-Location $ClientDir
try {
    if (-not (Test-Path "node_modules")) { Install-Npm $ClientDir }
    npm run fable
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

Write-Step "Stage Tauri external sidecars"
$TauriSrcDir = Join-Path $TauriDir "src-tauri"
Stage-TauriExternalBins -TauriSrcDir $TauriSrcDir -SidecarsRoot (Join-Path $RepoRoot "sidecars")

& $VerifyScript -TauriSrcDir $TauriSrcDir $(if ($AllowSpikeVenvFallback) { "-AllowSpikeVenvFallback" })
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Tauri bundle (unsigned)"
Write-Host "  First run downloads Rust crates; allow several minutes." -ForegroundColor DarkGray
Push-Location $TauriDir
try {
    if (-not (Test-Path "node_modules")) { Install-Npm $TauriDir }
    $env:TAURI_DISABLE_UPDATER = "true"
    npm run tauri build
    $tauriExit = $LASTEXITCODE
    $bundleRoot = Join-Path $TauriSrcDir "target\release\bundle"
    $hasBundle = (Test-Path $bundleRoot) -and @(Get-ChildItem $bundleRoot -Recurse -Include *.exe,*.msi -ErrorAction SilentlyContinue).Count -gt 0
    if ($tauriExit -ne 0 -and $hasBundle) {
        Write-Host "  Tauri reported updater signing failure; installer bundles were still produced." -ForegroundColor Yellow
    } elseif ($tauriExit -ne 0) {
        exit $tauriExit
    }
} finally {
    Remove-Item Env:TAURI_DISABLE_UPDATER -ErrorAction SilentlyContinue
    Pop-Location
}

$bundleRoot = Join-Path $TauriDir "src-tauri\target\release\bundle"
Write-Step "Done"
Write-Host "Installer artifacts (if build succeeded):" -ForegroundColor Green
Get-ChildItem $bundleRoot -Recurse -Include *-setup.exe,*.msi -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  $($_.FullName)"
}
if (-not (Test-Path $bundleRoot)) {
    Write-Host "  $bundleRoot" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "Install on a test VM, then verify Host (17170) and worker (8765) health endpoints." -ForegroundColor DarkGray
Write-Host "Signing: configure minisign pubkey in tauri.conf.json before release publish." -ForegroundColor Yellow
