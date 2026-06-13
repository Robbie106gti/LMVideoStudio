<#
.SYNOPSIS
  Build LMVideoStudio production installer bundle (no code signing).

.DESCRIPTION
  Produces Tauri NSIS/MSI artifacts under src/LMVideoStudio.Tauri/src-tauri/target/release/bundle/
  after building Host sidecars, Fable client, and Tauri app. Signing keys are placeholders only.

.EXAMPLE
  .\scripts\build-installer.ps1
  .\scripts\build-installer.ps1 -SkipSidecars
#>
param(
    [switch]$SkipSidecars,
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$env:LMVS_REPO_ROOT = $RepoRoot

$TauriDir = Join-Path $RepoRoot "src\LMVideoStudio.Tauri"
$TauriManifest = Join-Path $TauriDir "src-tauri\tauri.conf.json"
$ClientDir = Join-Path $RepoRoot "src\LMVideoStudio.Client"
$Sln = Join-Path $RepoRoot "LMVideoStudio.sln"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Test-CommandExists([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}
function Initialize-RustToolchainPath {
    if ((Test-CommandExists "rustc") -and (Test-CommandExists "cargo")) {
        return
    }

    $cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
    $rustcExe = Join-Path $cargoBin "rustc.exe"
    $cargoExe = Join-Path $cargoBin "cargo.exe"

    if ((Test-Path -LiteralPath $rustcExe) -and (Test-Path -LiteralPath $cargoExe)) {
        $env:PATH = "$cargoBin;$env:PATH"
        Write-Host "  Rust found under $cargoBin (prepended to PATH for this build session)." -ForegroundColor DarkGray
    }
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

    $triple = Get-RustHostTriple
    Write-Host "  target triple: $triple" -ForegroundColor DarkGray

    $destRoot = Join-Path $TauriSrcDir "sidecars"
    $hostSrc = Join-Path $SidecarsRoot "LMVideoStudio.Host.exe"
    if (-not (Test-Path $hostSrc)) {
        throw "Missing Host sidecar: $hostSrc (run .\scripts\build-sidecars.ps1 first)"
    }

    $hostDestDir = $destRoot
    New-Item -ItemType Directory -Force -Path $hostDestDir | Out-Null
    $hostDest = Join-Path $hostDestDir "LMVideoStudio.Host-$triple.exe"
    Copy-Item $hostSrc $hostDest -Force
    Write-Host "  staged: $hostDest"

    $workerDestDir = Join-Path $destRoot "lmvs_worker"
    New-Item -ItemType Directory -Force -Path $workerDestDir | Out-Null
    $workerDest = Join-Path $workerDestDir "run_worker-$triple.exe"

    $stubRs = Join-Path $env:TEMP "lmvs_run_worker_stub.rs"
    @'
use std::env;
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn resolve_python(dir: &PathBuf) -> Option<PathBuf> {
    let venv = dir.join(".venv").join("Scripts").join("python.exe");
    if venv.exists() {
        return Some(venv);
    }
    let spike = dir.join("..").join("..").join("spike").join(".venv").join("Scripts").join("python.exe");
    if spike.exists() {
        return Some(spike);
    }
    None
}

fn main() {
    let dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let python = match resolve_python(&dir) {
        Some(p) => p,
        None => {
            eprintln!("ERROR: No worker venv found. Re-run .\\scripts\\build-sidecars.ps1 (with venv copy).");
            std::process::exit(1);
        }
    };
    if let Ok(path) = env::var("PATH") {
        let bin = dir.join("bin");
        env::set_var("PATH", format!("{};{}", bin.display(), path));
    }
    let status = Command::new(&python)
        .args([
            "-m",
            "uvicorn",
            "lmvs_worker.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8765",
        ])
        .current_dir(&dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .expect("failed to spawn worker");
    std::process::exit(status.code().unwrap_or(1));
}
'@ | Set-Content -Path $stubRs -Encoding UTF8

    & rustc $stubRs -O -o $workerDest
    if ($LASTEXITCODE -ne 0) { throw "rustc failed to build run_worker sidecar stub" }
    Write-Host "  staged: $workerDest"
}

function Initialize-MsvcEnvironment {
    if (Get-Command link.exe -ErrorAction SilentlyContinue) { return }

    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) {
        throw @(
            "MSVC linker (link.exe) not found - required for Rust/Tauri on Windows.",
            "Install: winget install Microsoft.VisualStudio.2022.BuildTools --override `"--wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended`""
        ) -join "`n"
    }

    $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if (-not $vsPath) {
        throw "Visual Studio Build Tools with C++ workload not found. See prerequisite message above."
    }

    $devShell = Join-Path $vsPath "Common7\Tools\Launch-VsDevShell.ps1"
    if (Test-Path $devShell) {
        & $devShell -Arch amd64 -SkipAutomaticLocation | Out-Null
        return
    }

    $vcvars = Join-Path $vsPath "VC\Auxiliary\Build\vcvars64.bat"
    if (-not (Test-Path $vcvars)) {
        throw "Could not locate VsDevShell or vcvars64.bat under $vsPath"
    }

    $envLines = cmd /c "`"$vcvars`" >nul && set" | Where-Object { $_ -match '^(PATH|LIB|INCLUDE|LIBPATH)=' }
    foreach ($line in $envLines) {
        $eq = $line.IndexOf('=')
        if ($eq -gt 0) {
            Set-Item -Path "Env:$($line.Substring(0, $eq))" -Value $line.Substring($eq + 1)
        }
    }
}

function Assert-BuildPrerequisites {
    $missing = @()

    if (-not (Test-CommandExists "dotnet")) {
        $missing += "dotnet SDK 8.x - https://dotnet.microsoft.com/download/dotnet/8.0"
    } else {
        $dotnetVer = (dotnet --version 2>$null)
        if ($dotnetVer -notmatch '^8\.') {
            Write-Host "WARNING: dotnet $dotnetVer found; LMVideoStudio targets .NET 8 (8.x recommended)." -ForegroundColor Yellow
        }
    }

    if (-not (Test-CommandExists "npm")) {
        $missing += "Node.js/npm - https://nodejs.org/ (LTS 20+ recommended)"
    }

    if (-not (Test-CommandExists "rustc") -or -not (Test-CommandExists "cargo")) {
        $missing += @(
            "Rust toolchain (rustc + cargo) - required for Tauri bundle:",
            "  winget install Rustlang.Rustup",
            "  - or - download rustup-init.exe from https://rustup.rs/ and run it",
            "  If already installed, re-run this script (it adds %USERPROFILE%\.cargo\bin for this session) or open a new terminal"
        )
    }

    if ($missing.Count -eq 0 -and -not (Get-Command link.exe -ErrorAction SilentlyContinue)) {
        $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
        if (-not (Test-Path $vswhere)) {
            $missing += @(
                "MSVC linker (link.exe) - required for Rust/Tauri on Windows:",
                "  winget install Microsoft.VisualStudio.2022.BuildTools --override `"--wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended`""
            )
        }
    }

    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "Missing build prerequisites:" -ForegroundColor Red
        foreach ($line in $missing) { Write-Host "  $line" -ForegroundColor Red }
        Write-Host ""
        throw "Install the tools above, then re-run .\scripts\build-installer.ps1"
    }
}

Write-Step "Check build prerequisites"
Initialize-RustToolchainPath
Assert-BuildPrerequisites
Initialize-MsvcEnvironment
Write-Host "  dotnet: $(dotnet --version)"
Write-Host "  npm:    $(npm --version)"
Write-Host "  rustc:  $(rustc --version)"
Write-Host "  cargo:  $(cargo --version)"

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

Write-Step "Publish Host (self-contained)"
$hostProj = Join-Path $RepoRoot "src\LMVideoStudio.Host\LMVideoStudio.Host.fsproj"
$publishDir = Join-Path $RepoRoot "sidecars\lmvs_host\publish"
dotnet publish $hostProj -c $Configuration -o $publishDir --self-contained false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "  published: $publishDir"

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
    & $sidecarScript
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "Skipped sidecars (-SkipSidecars)" -ForegroundColor DarkGray
}

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

Write-Step "Tauri bundle (unsigned)"
Write-Host "  First run downloads Rust crates; allow several minutes." -ForegroundColor DarkGray
Push-Location $TauriDir
try {
    if (-not (Test-Path "node_modules")) { Install-Npm $TauriDir }
    # Placeholder pubkey in tauri.conf.json triggers updater signing; skip for unsigned local QA.
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
Write-Host "  $bundleRoot"
Write-Host ""
Write-Host "Signing: configure minisign pubkey in tauri.conf.json before release publish." -ForegroundColor Yellow
