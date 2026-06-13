<#
.SYNOPSIS
  Run LMVideoStudio automated tests (fast by default).

.EXAMPLE
  .\scripts\test.ps1
  .\scripts\test.ps1 -Smoke
  .\scripts\test.ps1 -Full
  .\scripts\test.ps1 -NoBuild
#>
param(
    [switch]$Smoke,
    [switch]$Full,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$TestsRoot = Join-Path $RepoRoot "tests"
$Sln = Join-Path $RepoRoot "LMVideoStudio.sln"

Push-Location $RepoRoot
try {
    if (-not $NoBuild) {
        Write-Host "Building solution (Release) ..." -ForegroundColor Cyan
        if (Test-Path $Sln) {
            dotnet build $Sln -c Release
        } else {
            dotnet build $TestsRoot -c Release
        }
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }

    Write-Host "Running dotnet test (Release) ..." -ForegroundColor Cyan
    if (Test-Path $Sln) {
        dotnet test $Sln -c Release --no-build --verbosity normal
    } else {
        dotnet test $TestsRoot -c Release --no-build --verbosity normal
    }
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    if ($Full -or $Smoke) {
        $smokeScript = Join-Path $RepoRoot "scripts\bootstrap_smoke.ps1"
        if (-not (Test-Path $smokeScript)) {
            throw "Missing $smokeScript"
        }

        Write-Host "Running bootstrap smoke (-SkipWarmup) ..." -ForegroundColor Cyan
        & $smokeScript -SkipWarmup
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    } else {
        Write-Host "Fast mode: skipped GPU/smoke (use -Smoke or -Full)." -ForegroundColor DarkGray
    }

    Write-Host "All tests passed." -ForegroundColor Green
    exit 0
}
finally {
    Pop-Location
}
