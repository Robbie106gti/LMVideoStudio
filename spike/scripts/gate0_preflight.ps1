$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
Set-Location $SpikeRoot

Write-Host "=== Gate 0: Preflight ===" -ForegroundColor Cyan

$pass = $true
$notes = @()

$os = Get-CimInstance Win32_OperatingSystem
$isWin11 = $os.Caption -match "Windows 11"
Write-Host ("Windows: {0}" -f $os.Caption)
if (-not $isWin11) {
    Write-Host "WARN: Expected Windows 11" -ForegroundColor Yellow
    $notes += "Not Windows 11: $($os.Caption)"
}

$gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "AMD|Radeon" }
foreach ($gpu in $gpus) {
    Write-Host ("GPU: {0} | Driver: {1}" -f $gpu.Name, $gpu.DriverVersion)
}
$has9070 = $gpus | Where-Object { $_.Name -match "9070" }
if ($has9070) {
    Write-Host "PASS: 9070-series GPU detected" -ForegroundColor Green
} else {
    Write-Host "WARN: 9070 XT not found by name - verify manually" -ForegroundColor Yellow
    $notes += "9070 not detected by name"
}

$driver = ($gpus | Select-Object -First 1).DriverVersion
if ($driver) {
    try {
        $ver = [version]$driver
        $min = [version]"26.2.2.0"
        if ($ver -ge $min) {
            Write-Host "PASS: Driver $driver (26.2.2+)" -ForegroundColor Green
        } else {
            Write-Host "FAIL: Driver $driver below 26.2.2" -ForegroundColor Red
            $pass = $false
            $notes += "Driver too old: $driver"
        }
    } catch {
        Write-Host "WARN: Could not parse driver version: $driver" -ForegroundColor Yellow
    }
}

$drive = (Get-Item $SpikeRoot).PSDrive.Name
$freeGb = [math]::Round((Get-PSDrive $drive).Free / 1GB, 1)
Write-Host "Free disk on ${drive}: ${freeGb} GB"
if ($freeGb -lt 30) {
    Write-Host "FAIL: Need at least 30 GB free" -ForegroundColor Red
    $pass = $false
    $notes += "Only ${freeGb} GB free"
} else {
    Write-Host "PASS: Disk space OK" -ForegroundColor Green
}

$py312 = & py -3.12 --version 2>&1
Write-Host "Python: $py312"
if ($py312 -notmatch "3\.12") {
    Write-Host "FAIL: Python 3.12 required for ROCm 7.2.1 wheels" -ForegroundColor Red
    $pass = $false
    $notes += "Python 3.12 not found"
} else {
    Write-Host "PASS: Python 3.12 available" -ForegroundColor Green
}

$outDir = Join-Path $SpikeRoot "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$result = @{
    gate      = 0
    pass      = $pass
    notes     = ($notes -join "; ")
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}
$result | ConvertTo-Json | Set-Content (Join-Path $outDir "gate0.json")

if ($pass) {
    Write-Host ""
    Write-Host "Gate 0: PASS" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Gate 0: FAIL - fix environment before Gate 1" -ForegroundColor Red
exit 1
