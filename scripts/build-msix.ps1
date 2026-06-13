<#
.SYNOPSIS
  Build LMVideoStudio for Microsoft Store (offline MSI + optional MSIX).

.DESCRIPTION
  Uses tauri.microsoftstore.conf.json (disables GitHub updater, offline WebView2).
  Produces a Store-ready MSI under target/release/bundle/msi/.
  When tauri-windows-bundle or winapp CLI is available, also emits an MSIX package.

.EXAMPLE
  .\scripts\build-msix.ps1
  .\scripts\build-msix.ps1 -SkipSidecars
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
$env:LMVS_BUILD_FLAVOR = "microsoft-store"
$env:TAURI_DISABLE_UPDATER = "true"

$TauriDir = Join-Path $RepoRoot "src\LMVideoStudio.Tauri"
$TauriSrcDir = Join-Path $TauriDir "src-tauri"
$StoreConfig = Join-Path $TauriSrcDir "tauri.microsoftstore.conf.json"
$ClientDir = Join-Path $RepoRoot "src\LMVideoStudio.Client"
$Sln = Join-Path $RepoRoot "LMVideoStudio.sln"
$VerifyScript = Join-Path $RepoRoot "scripts\verify-sidecar-staging.ps1"
$WorkerStubRs = Join-Path $RepoRoot "scripts\run_worker_stub.rs"
$MsixOutDir = Join-Path $RepoRoot "out\store-msix"

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

function Try-PackMsix {
    param(
        [string]$TauriDir,
        [string]$BundleRoot
    )

    New-Item -ItemType Directory -Force -Path $MsixOutDir | Out-Null

    Push-Location $TauriDir
    try {
        $pkg = Get-Content (Join-Path $TauriDir "package.json") -Raw | ConvertFrom-Json
        if ($pkg.scripts.PSObject.Properties.Name -contains "tauri:windows:build") {
            Write-Host "  Running tauri-windows-bundle (tauri:windows:build) ..." -ForegroundColor DarkGray
            npm run tauri:windows:build
            if ($LASTEXITCODE -eq 0) {
                Get-ChildItem $TauriSrcDir -Recurse -Include *.msix,*.appx -ErrorAction SilentlyContinue |
                    ForEach-Object {
                        $dest = Join-Path $MsixOutDir $_.Name
                        Copy-Item $_.FullName $dest -Force
                        Write-Host "  MSIX: $dest" -ForegroundColor Green
                    }
                return $true
            }
            Write-Host "  tauri-windows-bundle failed; see docs/MICROSOFT-STORE.md" -ForegroundColor Yellow
        }
    } finally {
        Pop-Location
    }

    $winapp = Get-Command winapp -ErrorAction SilentlyContinue
    if ($winapp) {
        $stageDir = Join-Path $MsixOutDir "stage"
        $exe = Get-ChildItem $BundleRoot -Recurse -Filter "LMVideoStudio.exe" -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($exe) {
            New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
            Copy-Item $exe.FullName (Join-Path $stageDir $exe.Name) -Force
            $manifest = Join-Path $stageDir "Package.appxmanifest"
            if (-not (Test-Path $manifest)) {
                $genManifest = Join-Path $TauriSrcDir "gen\windows\Package.appxmanifest"
                if (Test-Path $genManifest) {
                    Copy-Item $genManifest $manifest -Force
                }
            }
            if (Test-Path $manifest) {
                Write-Host "  Running winapp pack:msix ..." -ForegroundColor DarkGray
                & winapp pack:msix $stageDir --output (Join-Path $MsixOutDir "LMVideoStudio.msix")
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  MSIX: $(Join-Path $MsixOutDir 'LMVideoStudio.msix')" -ForegroundColor Green
                    return $true
                }
            }
        }
    }

    Write-Host ""
    Write-Host "MSIX packaging skipped (optional tooling not configured)." -ForegroundColor Yellow
    Write-Host "  Option A: npx @choochmeque/tauri-windows-bundle init  (then re-run make build-msix)" -ForegroundColor DarkGray
    Write-Host "  Option B: winget install Microsoft.winappcli  (then add Package.appxmanifest under out/store-msix/stage/)" -ForegroundColor DarkGray
    Write-Host "  Store MSI (offline WebView2) is still valid for Partner Center EXE/MSI submission per Tauri docs." -ForegroundColor DarkGray
    return $false
}

Write-Step "Microsoft Store build (flavor: microsoft-store)"
Write-Host "  LMVS_BUILD_FLAVOR=$env:LMVS_BUILD_FLAVOR"
Write-Host "  TAURI_DISABLE_UPDATER=$env:TAURI_DISABLE_UPDATER"

if (-not (Test-Path $StoreConfig)) {
    throw "Missing store config: $StoreConfig"
}

Write-Step "Check build prerequisites"
Initialize-LmvsRustToolchainPath
Assert-LmvsBuildPrerequisites -RequireRust -RequireNode
Initialize-LmvsMsvcEnvironment
Write-LmvsToolVersions

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
Stage-TauriExternalBins -TauriSrcDir $TauriSrcDir -SidecarsRoot (Join-Path $RepoRoot "sidecars")

& $VerifyScript -TauriSrcDir $TauriSrcDir $(if ($AllowSpikeVenvFallback) { "-AllowSpikeVenvFallback" })
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Tauri bundle (microsoft-store config)"
Write-Host "  Config merge: tauri.microsoftstore.conf.json" -ForegroundColor DarkGray
Write-Host "  First run downloads Rust crates; allow several minutes." -ForegroundColor DarkGray
Push-Location $TauriDir
try {
    if (-not (Test-Path "node_modules")) { Install-Npm $TauriDir }
    npm run tauri build -- --config src-tauri/tauri.microsoftstore.conf.json
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

$bundleRoot = Join-Path $TauriSrcDir "target\release\bundle"
Write-Step "Optional MSIX packaging"
Try-PackMsix -TauriDir $TauriDir -BundleRoot $bundleRoot | Out-Null

Write-Step "Done"
Write-Host "Store artifacts:" -ForegroundColor Green
Get-ChildItem $bundleRoot -Recurse -Include *.msi -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  MSI: $($_.FullName)"
}
Get-ChildItem $MsixOutDir -Recurse -Include *.msix,*.appx -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  MSIX: $($_.FullName)"
}
Write-Host ""
Write-Host "Submit via Partner Center (MSIX packaged app or EXE/MSI link). See docs/MICROSOFT-STORE.md." -ForegroundColor DarkGray

Remove-Item Env:TAURI_DISABLE_UPDATER -ErrorAction SilentlyContinue
