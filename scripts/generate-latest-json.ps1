<#
.SYNOPSIS
  Generate Tauri updater latest.json skeleton for GitHub Releases.
#>
param(
    [string]$Version = "0.1.0",
    [string]$OutPath = "",
    [string]$Repo = "Robbie106gti/LMVideoStudio"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutPath) {
    $OutPath = Join-Path $RepoRoot "out\latest.json"
}

$nsisDir = Join-Path $RepoRoot "src\LMVideoStudio.Tauri\src-tauri\target\release\bundle\nsis"
$installer = Get-ChildItem -Path $nsisDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

$downloadUrl = if ($installer) {
    "https://github.com/$Repo/releases/download/v$Version/$($installer.Name)"
} else {
    "https://github.com/$Repo/releases/download/v$Version/LMVideoStudio_${Version}_x64-setup.exe"
}

$payload = [ordered]@{
    version   = $Version
    notes     = "LMVideoStudio release v$Version"
    pub_date  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = "REPLACE_WITH_MINISIGN_SIGNATURE"
            url       = $downloadUrl
        }
    }
}

$dir = Split-Path -Parent $OutPath
if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$payload | ConvertTo-Json -Depth 6 | Set-Content -Path $OutPath -Encoding UTF8
Write-Host "Wrote $OutPath" -ForegroundColor Green
