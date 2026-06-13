<#
.SYNOPSIS
  macOS arm64 build entry point — documents cross-platform flow from Windows or runs on macOS.

.DESCRIPTION
  On macOS: delegates to scripts/build-macos.sh (sidecars, Host osx-arm64 publish, Tauri .dmg).
  On Windows: prints prerequisites and points to docs/MACOS-PORT.md (use -DryRun in CI).

.EXAMPLE
  ./scripts/build-macos.ps1 -DryRun
  ./scripts/build-macos.ps1
#>
param(
    [switch]$DryRun,
    [switch]$SkipSidecars,
    [switch]$SkipVenvCopy,
    [switch]$AllowSpikeVenvFallback
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BashScript = Join-Path $RepoRoot "scripts\build-macos.sh"

Write-Host "LMVideoStudio macOS arm64 build" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host ""

if ($IsMacOS -or ((Test-Path "/usr/bin/uname") -and ((uname) -eq "Darwin"))) {
    if (-not (Test-Path $BashScript)) {
        throw "Missing $BashScript"
    }
    $args = @()
    if ($DryRun) { $args += "--dry-run" }
    if ($SkipSidecars) { $args += "--skip-sidecars" }
    if ($SkipVenvCopy) { $args += "--skip-venv-copy" }
    if ($AllowSpikeVenvFallback) { $args += "--allow-spike-venv-fallback" }
    & bash $BashScript @args
    exit $LASTEXITCODE
}

Write-Host "Windows agent detected — full .dmg build requires an Apple Silicon Mac or macos-latest CI." -ForegroundColor Yellow
Write-Host ""
Write-Host "On an M-series Mac:"
Write-Host "  chmod +x scripts/*.sh"
Write-Host "  ./scripts/build-macos.sh"
Write-Host ""
Write-Host "Sidecar layout (darwin-arm64):"
Write-Host "  sidecars/LMVideoStudio.Host          (dotnet publish -r osx-arm64 --self-contained)"
Write-Host "  sidecars/lmvs_worker/.venv/bin/python (MPS torch via setup-python-macos.sh)"
Write-Host "  sidecars/lmvs_worker/run_worker.sh   (dev) + run_worker-aarch64-apple-darwin (Tauri externalBin)"
Write-Host ""
Write-Host "Tauri overlay: src/LMVideoStudio.Tauri/src-tauri/tauri.macos.conf.json"
Write-Host "CI: .github/workflows/macos-build.yml"
Write-Host "Docs: docs/MACOS-PORT.md"
Write-Host ""

if ($DryRun) {
    exit 0
}

exit 0
