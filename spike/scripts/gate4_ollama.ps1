$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
Set-Location $SpikeRoot

Write-Host "=== Gate 4: Ollama ===" -ForegroundColor Cyan

$pass = $true
$notes = @()

# Check if Ollama is running
try {
    $tags = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
    Write-Host "Ollama API reachable" -ForegroundColor Green
} catch {
    Write-Host "FAIL: Ollama not reachable at localhost:11434" -ForegroundColor Red
    Write-Host "Install from https://ollama.com and ensure tray app is running"
    $pass = $false
    $notes += "Ollama API unreachable"
}

# Pull models if missing (non-fatal if already present)
$models = @("llama3.1:latest")
foreach ($m in $models) {
    Write-Host "Ensuring model: $m"
    try {
        & ollama pull $m 2>&1 | ForEach-Object { Write-Host $_ }
    } catch {
        Write-Host "WARN: ollama pull $m : $_" -ForegroundColor Yellow
    }
}

if ($pass) {
    $body = @{
        model  = "llama3.1:latest"
        prompt = "Say OK in one word"
        stream = $false
    } | ConvertTo-Json

    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
        Write-Host ("Chat response: {0}" -f $resp.response.Trim())
        if (-not $resp.response) {
            $pass = $false
            $notes += "Empty chat response"
        }
    } catch {
        Write-Host "FAIL: Chat test failed: $_" -ForegroundColor Red
        $pass = $false
        $notes += "Chat failed: $_"
    }
}

$result = @{
    gate      = 4
    pass      = $pass
    notes     = ($notes -join "; ")
    timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
$result | ConvertTo-Json | Set-Content "$SpikeRoot\out\gate4.json"

if ($pass) {
    Write-Host "`nGate 4: PASS" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nGate 4: FAIL" -ForegroundColor Red
    exit 1
}
