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
$TauriSrcDir = Join-Path $TauriDir "src-tauri"
$TauriManifest = Join-Path $TauriSrcDir "tauri.conf.json"
$ClientDir = Join-Path $RepoRoot "src\LMVideoStudio.Client"
$Sln = Join-Path $RepoRoot "LMVideoStudio.sln"
$VerifyScript = Join-Path $RepoRoot "scripts\verify-sidecar-staging.ps1"
$VerifyMsiScript = Join-Path $RepoRoot "scripts\verify-msi-wix1946.ps1"
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

function Get-TauriBundleTargets([object]$TauriConfig) {
    $raw = $TauriConfig.bundle.targets
    if (-not $raw -or $raw -eq "all") { return @("msi", "nsis") }
    if ($raw -is [string]) { return @($raw) }
    return @($raw)
}

function Get-FreshBundleArtifacts {
    param(
        [string]$BundleRoot,
        [datetime]$Since
    )

    $artifacts = @{
        Msi  = @()
        Nsis = @()
    }
    if (-not (Test-Path $BundleRoot)) { return $artifacts }

    $artifacts.Msi = @(Get-ChildItem (Join-Path $BundleRoot "msi") -Filter *.msi -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -ge $Since })
    $artifacts.Nsis = @(Get-ChildItem (Join-Path $BundleRoot "nsis") -Filter *-setup.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -ge $Since })
    return $artifacts
}

function Get-TauriFailureKind {
    param(
        [string]$Log,
        [int]$ExitCode
    )

    if ($ExitCode -eq 0) { return $null }
    if ($Log -match 'failed to run.*light\.exe|LGHT\d+|WiX|Running light to produce') {
        return "msi-linker"
    }
    if ($Log -match 'updater|minisign|signing|signature') {
        return "updater-signing"
    }
    return "other"
}

function Initialize-TauriBundlePathJunctions {
    param(
        [string]$TauriSrcDir,
        [string]$RepoRoot
    )

    # WiX light.exe uses unresolved Source paths; ../../../sidecars/... exceeds MAX_PATH
    # for deep .venv files (LGHT0103). Short junctions under src-tauri/b/ keep paths under 260.
    $bundleRoot = Join-Path $TauriSrcDir "b"
    $repoLink = Join-Path $bundleRoot "r"
    $workerLink = Join-Path $bundleRoot "w"
    $workerTarget = Join-Path $RepoRoot "sidecars\lmvs_worker"

    if (-not (Test-Path $workerTarget)) {
        throw "Missing worker sidecar root for bundle junction: $workerTarget"
    }

    New-Item -ItemType Directory -Force -Path $bundleRoot | Out-Null

    foreach ($pair in @(
            @{ Link = $repoLink; Target = $RepoRoot; Label = "b/r" },
            @{ Link = $workerLink; Target = $workerTarget; Label = "b/w" }
        )) {
        $link = $pair.Link
        if (Test-Path -LiteralPath $link) {
            $item = Get-Item -LiteralPath $link -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                cmd /c "rmdir `"$link`"" | Out-Null
            } else {
                throw "Bundle path junction blocked by existing path (not a junction): $link"
            }
        }
        New-Item -ItemType Junction -Path $link -Target $pair.Target | Out-Null
        Write-Host "  junction $($pair.Label) -> $($pair.Target)" -ForegroundColor DarkGray
    }
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

Write-Step "Ensure self-contained Host sidecar"
Ensure-LmvsHostSidecar -RepoRoot $RepoRoot -OutputDir (Join-Path $RepoRoot "sidecars") | Out-Null

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
$verifyArgs = @{}
if ($AllowSpikeVenvFallback) { $verifyArgs['AllowSpikeVenvFallback'] = $true }
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

Write-Step "Stage Tauri bundle path junctions (WiX MAX_PATH)"
Initialize-TauriBundlePathJunctions -TauriSrcDir $TauriSrcDir -RepoRoot $RepoRoot

Write-Step "Stage Tauri external sidecars"
Stage-TauriExternalBins -TauriSrcDir $TauriSrcDir -SidecarsRoot (Join-Path $RepoRoot "sidecars")

$verifyArgs = @{ TauriSrcDir = $TauriSrcDir }
if ($AllowSpikeVenvFallback) { $verifyArgs['AllowSpikeVenvFallback'] = $true }
& $VerifyScript @verifyArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Tauri bundle (unsigned)"
Write-Host "  First run downloads Rust crates; allow several minutes." -ForegroundColor DarkGray
$bundleTargets = Get-TauriBundleTargets $tauri
$wantsMsi = $bundleTargets -contains "msi"
$wantsNsis = $bundleTargets -contains "nsis"
$bundleRoot = Join-Path $TauriSrcDir "target\release\bundle"
$buildStartedAt = $null
Push-Location $TauriDir
try {
    if (-not (Test-Path "node_modules")) { Install-Npm $TauriDir }
    $env:TAURI_DISABLE_UPDATER = "true"
    $buildStartedAt = Get-Date

    $tauriOutput = npm run tauri build 2>&1
    $tauriExit = $LASTEXITCODE
    $tauriLog = ($tauriOutput | Out-String)
    $tauriOutput | Write-Host

    $fresh = Get-FreshBundleArtifacts -BundleRoot $bundleRoot -Since $buildStartedAt
    $failureKind = Get-TauriFailureKind -Log $tauriLog -ExitCode $tauriExit
    $updaterDisabled = ($env:TAURI_DISABLE_UPDATER -eq "true")

    if ($tauriExit -ne 0) {
        switch ($failureKind) {
            "msi-linker" {
                Write-Host "  MSI bundling failed (WiX light.exe). NSIS may still have succeeded." -ForegroundColor Red
                if ($tauriLog -match 'LGHT0263|too large') {
                    Write-Host "  Hint: a bundled resource exceeds WiX/MSI 2 GiB file limit (exclude sidecars/lmvs_worker/hf_cache from bundle.resources)." -ForegroundColor Yellow
                }
                if ($tauriLog -match 'LGHT0103') {
                    Write-Host "  Hint: a bundled file path exceeds MAX_PATH (260); ensure build-installer created src-tauri/b/ junctions." -ForegroundColor Yellow
                }
            }
            "updater-signing" {
                if (-not $updaterDisabled -and ($fresh.Msi.Count + $fresh.Nsis.Count) -gt 0) {
                    Write-Host "  Tauri reported updater/signing issues; fresh installer bundles were still produced." -ForegroundColor Yellow
                } else {
                    Write-Host "  Tauri bundle failed during updater/signing." -ForegroundColor Red
                }
            }
            default {
                Write-Host "  Tauri bundle failed (exit $tauriExit)." -ForegroundColor Red
            }
        }

        $freshOk = ($wantsMsi -and $fresh.Msi.Count -gt 0) -or ($wantsNsis -and $fresh.Nsis.Count -gt 0)
        $msiMissing = $wantsMsi -and $fresh.Msi.Count -eq 0
        if ($msiMissing -or (-not $freshOk -and $tauriExit -ne 0)) {
            $staleMsi = @(Get-ChildItem (Join-Path $bundleRoot "msi") -Filter *.msi -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -lt $buildStartedAt })
            if ($msiMissing -and $staleMsi.Count -gt 0) {
                Write-Host "  Stale MSI left on disk (not rebuilt this run):" -ForegroundColor DarkYellow
                $staleMsi | ForEach-Object { Write-Host "    $($_.FullName)" -ForegroundColor DarkYellow }
                Write-Host "  Do not install stale MSIs - they may show WiX Warning 1946 (AppUserModel.ID)." -ForegroundColor DarkYellow
            }
            exit $tauriExit
        }
    }
} finally {
    Remove-Item Env:TAURI_DISABLE_UPDATER -ErrorAction SilentlyContinue
    Pop-Location
}

$bundleRoot = Join-Path $TauriDir "src-tauri\target\release\bundle"
$artifactSince = if ($buildStartedAt) { $buildStartedAt } else { (Get-Date).AddDays(-1) }
$fresh = Get-FreshBundleArtifacts -BundleRoot $bundleRoot -Since $artifactSince
$hasFreshArtifacts = ($fresh.Msi.Count + $fresh.Nsis.Count) -gt 0

if ($hasFreshArtifacts) {
    if ($fresh.Msi.Count -gt 0 -and (Test-Path $VerifyMsiScript)) {
        Write-Step "Verify MSI shortcuts (WiX 1946)"
        foreach ($msi in $fresh.Msi) {
            & $VerifyMsiScript -MsiPath $msi.FullName
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        }
    }

    Write-Step "Done"
    Write-Host "Installer artifacts from this build:" -ForegroundColor Green
    $fresh.Msi | ForEach-Object { Write-Host "  $($_.FullName)" }
    $fresh.Nsis | ForEach-Object { Write-Host "  $($_.FullName)" }
} else {
    Write-Step "Build finished with no fresh installer artifacts"
    Write-Host "  Expected output under: $bundleRoot" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "Install on a test VM, then verify Host (17170) and worker (8765) health endpoints." -ForegroundColor DarkGray
Write-Host "Signing: configure minisign pubkey in tauri.conf.json before release publish." -ForegroundColor Yellow
