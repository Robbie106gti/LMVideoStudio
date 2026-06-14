<#
.SYNOPSIS
  Verify an MSI was built without WiX ShortcutProperty AppUserModel.ID (Warning 1946).

.DESCRIPTION
  Parses the MsiShortcutProperty table. Any row with PropertyKey System.AppUserModel.ID
  causes install-time Warning 1946 on recent Windows builds. Our custom WiX template omits
  ShortcutProperty; AppUserModelID is set at runtime in lib.rs instead.

.EXAMPLE
  .\scripts\verify-msi-wix1946.ps1
  .\scripts\verify-msi-wix1946.ps1 -MsiPath path\to\LMVideoStudio_0.1.0_x64_en-US.msi
#>
param(
    [string]$MsiPath
)

$ErrorActionPreference = "Stop"

if (-not $MsiPath) {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $defaultDir = Join-Path $repoRoot "src\LMVideoStudio.Tauri\src-tauri\target\release\bundle\msi"
    if (-not (Test-Path $defaultDir)) {
        throw "No MSI path given and default folder missing: $defaultDir"
    }
    $MsiPath = @(Get-ChildItem $defaultDir -Filter *.msi -ErrorAction Stop |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1).FullName
}

if (-not (Test-Path -LiteralPath $MsiPath)) {
    throw "MSI not found: $MsiPath"
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    throw "python is required to inspect MSI tables (install Python 3.x or add to PATH)"
}

$pyScript = @'
import msilib
import sys

msi_path = sys.argv[1]
db = msilib.OpenDatabase(msi_path, msilib.MSIDBOPEN_READONLY)
view = db.OpenView("SELECT Shortcut_, PropertyKey, PropVariantValue FROM MsiShortcutProperty")
view.Execute(None)
rows = []
row = view.Fetch()
while row:
    rows.append((row.GetString(1), row.GetString(2), row.GetString(3)))
    row = view.Fetch()

for shortcut, key, value in rows:
    if key == "System.AppUserModel.ID":
        print(f"BAD:{shortcut}|{value}")
        sys.exit(2)

print(f"OK:{len(rows)}")
sys.exit(0)
'@

$result = $pyScript | & $python.Source - @($MsiPath) 2>&1
$exitCode = $LASTEXITCODE

Write-Host "=== verify-msi-wix1946 ===" -ForegroundColor Cyan
Write-Host "  MSI: $MsiPath"
$item = Get-Item -LiteralPath $MsiPath
Write-Host "  Built: $($item.LastWriteTime)"

if ($exitCode -eq 0) {
    Write-Host "  PASS: no System.AppUserModel.ID shortcut properties (Warning 1946 avoided)." -ForegroundColor Green
    exit 0
}

if ($exitCode -eq 2) {
    foreach ($line in @($result)) {
        if ($line -match '^BAD:(.+)\|(.+)$') {
            Write-Host "  FAIL: shortcut '$($Matches[1])' sets System.AppUserModel.ID = $($Matches[2])" -ForegroundColor Red
        }
    }
    Write-Host "  Rebuild with the custom WiX template (tauri.conf.json bundle.windows.wix.template)." -ForegroundColor Yellow
    Write-Host "  Stale MSIs under target/release/bundle/msi/ are not updated when tauri build fails." -ForegroundColor Yellow
    exit 2
}

Write-Host "  ERROR: could not inspect MSI: $result" -ForegroundColor Red
exit 1
