<#
.SYNOPSIS
  Shared build prerequisite checks for LMVideoStudio installer/sidecar scripts.

.DESCRIPTION
  Dot-source from build-installer.ps1 or build-sidecars.ps1:
    . (Join-Path $PSScriptRoot "build-prereqs.ps1")
#>

function Test-LmvsCommandExists([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Initialize-LmvsRustToolchainPath {
    if ((Test-LmvsCommandExists "rustc") -and (Test-LmvsCommandExists "cargo")) {
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

function Initialize-LmvsMsvcEnvironment {
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

function Assert-LmvsBuildPrerequisites {
    param(
        [switch]$RequireRust,
        [switch]$RequireNode
    )

    $missing = @()

    if (-not (Test-LmvsCommandExists "dotnet")) {
        $missing += "dotnet SDK 8.x - https://dotnet.microsoft.com/download/dotnet/8.0"
    } else {
        $dotnetVer = (dotnet --version 2>$null)
        if ($dotnetVer -notmatch '^8\.') {
            Write-Host "WARNING: dotnet $dotnetVer found; LMVideoStudio targets .NET 8 (8.x recommended)." -ForegroundColor Yellow
        }
    }

    if ($RequireNode -and -not (Test-LmvsCommandExists "npm")) {
        $missing += "Node.js/npm - https://nodejs.org/ (LTS 20+ recommended)"
    }

    if ($RequireRust) {
        if (-not (Test-LmvsCommandExists "rustc") -or -not (Test-LmvsCommandExists "cargo")) {
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
    }

    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "Missing build prerequisites:" -ForegroundColor Red
        foreach ($line in $missing) { Write-Host "  $line" -ForegroundColor Red }
        Write-Host ""
        throw "Install the tools above, then re-run the build script."
    }
}

function Write-LmvsToolVersions {
    if (Test-LmvsCommandExists "dotnet") { Write-Host "  dotnet: $(dotnet --version)" }
    if (Test-LmvsCommandExists "npm") { Write-Host "  npm:    $(npm --version)" }
    if (Test-LmvsCommandExists "rustc") { Write-Host "  rustc:  $(rustc --version)" }
    if (Test-LmvsCommandExists "cargo") { Write-Host "  cargo:  $(cargo --version)" }
}

function Publish-LmvsHostSidecar {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [Parameter(Mandatory = $true)][string]$OutputDir,
        [string]$RuntimeId = "win-x64",
        [int]$MinBytes = 5MB
    )

    $srcRoot = Join-Path $RepoRoot "src"
    if (-not (Test-Path $srcRoot)) {
        throw "src/ not present — cannot publish Host sidecar"
    }

    $proj = Get-ChildItem -Path $srcRoot -Recurse -Filter "*Host*.fsproj" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $proj) {
        throw "No *Host*.fsproj under src/ — cannot publish Host sidecar"
    }

    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    $publishDir = Join-Path $OutputDir "host_publish"
    if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }

    Write-Host "Publishing Host (self-contained single-file): $($proj.FullName)" -ForegroundColor Cyan
    & dotnet publish $proj.FullName -c Release -r $RuntimeId -o $publishDir `
        --self-contained true `
        -p:PublishSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet publish failed with exit code $LASTEXITCODE"
    }

    $exe = Get-ChildItem -Path $publishDir -Filter "LMVideoStudio.Host.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $exe) {
        $exe = Get-ChildItem -Path $publishDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    if (-not $exe) {
        throw "Host publish succeeded but no .exe in $publishDir"
    }

    $hostDest = Join-Path $OutputDir $exe.Name
    Copy-Item $exe.FullName $hostDest -Force
    if ($exe.Length -lt $MinBytes) {
        throw "Host publish produced a $($exe.Length) byte executable; expected >= $MinBytes for self-contained single-file (not dotnet build output)."
    }

    Write-Host "Host executable: $hostDest ($([math]::Round($exe.Length / 1MB, 1)) MB)" -ForegroundColor Green
    return $hostDest
}

function Ensure-LmvsHostSidecar {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [string]$OutputDir = "",
        [int]$MinBytes = 5MB
    )

    if (-not $OutputDir) {
        $OutputDir = Join-Path $RepoRoot "sidecars"
    }

    $hostExe = Join-Path $OutputDir "LMVideoStudio.Host.exe"
    if ((Test-Path $hostExe) -and (Get-Item $hostExe).Length -ge $MinBytes) {
        Write-Host "  Host sidecar OK: $hostExe ($([math]::Round((Get-Item $hostExe).Length / 1MB, 1)) MB)" -ForegroundColor DarkGray
        return $hostExe
    }

    if (Test-Path $hostExe) {
        Write-Host "  Replacing framework-dependent Host stub ($((Get-Item $hostExe).Length) bytes) with self-contained publish..." -ForegroundColor Yellow
    }

    return Publish-LmvsHostSidecar -RepoRoot $RepoRoot -OutputDir $OutputDir -MinBytes $MinBytes
}
