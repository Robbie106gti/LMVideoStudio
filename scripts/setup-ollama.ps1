<#
.SYNOPSIS
  Bootstrap Ollama for LMVideoStudio — verify API, pull manifest models.

.EXAMPLE
  .\scripts\setup-ollama.ps1
  .\scripts\setup-ollama.ps1 -PullOnly
#>
param(
    [switch]$PullOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== setup-ollama ===" -ForegroundColor Cyan

$reachable = $false
try {
    $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
    $reachable = $true
    Write-Host "Ollama API reachable at localhost:11434" -ForegroundColor Green
} catch {
    Write-Host "Ollama not reachable at localhost:11434" -ForegroundColor Yellow
    $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollamaCmd) {
        Write-Host "ollama CLI found — ensure the tray app is running (https://ollama.com)" -ForegroundColor Yellow
    } else {
        Write-Host "Install Ollama from https://ollama.com and restart this bootstrap" -ForegroundColor Red
        if (-not $PullOnly) { exit 1 }
    }
}

$syncScript = Join-Path $RepoRoot "scripts\sync_models.ps1"
if (-not (Test-Path $syncScript)) {
    Write-Error "Missing $syncScript"
}

if ($reachable -or $PullOnly) {
    Write-Host "Syncing Ollama models from manifest..." -ForegroundColor Cyan
    & $syncScript -Pull
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Model sync reported issues (exit $LASTEXITCODE)" -ForegroundColor Yellow
    }
} else {
    & $syncScript -Check
}

Write-Host "setup-ollama complete" -ForegroundColor Green
