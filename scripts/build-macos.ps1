<#
.SYNOPSIS
  macOS arm64 installer skeleton — run on macOS or cross-compile when toolchain is ready.
#>
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "LMVideoStudio macOS port skeleton" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host ""
Write-Host "Steps when run on macOS arm64:"
Write-Host "  1. dotnet publish src/LMVideoStudio.Host -c Release -r osx-arm64 --self-contained"
Write-Host "  2. npm ci && npm run build (Client + Tauri)"
Write-Host "  3. cd src/LMVideoStudio.Tauri && npm run tauri build -- --target aarch64-apple-darwin"
Write-Host ""
Write-Host "See docs/MACOS-PORT.md for sidecar and MPS worker notes."

if ($DryRun) {
    exit 0
}

if ($IsMacOS -or (Test-Path "/usr/bin/uname" -and ((uname) -eq "Darwin"))) {
    Write-Host "macOS detected — full build not yet wired in CI; use manual steps above." -ForegroundColor Yellow
    exit 0
}

Write-Host "Run this script on macOS or use -DryRun from Windows CI." -ForegroundColor Yellow
exit 0
