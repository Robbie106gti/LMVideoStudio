<#
.SYNOPSIS
  Verify the configured LMVideoStudio local AI provider and sync its manifest models.

.DESCRIPTION
  Lemonade is the default provider. This script never installs provider software.
  Set LMVS_LOCAL_AI_PROVIDER=ollama for the temporary compatibility path.

.EXAMPLE
  .\scripts\setup-local-ai.ps1
  $env:LMVS_LOCAL_AI_PROVIDER='ollama'; .\scripts\setup-local-ai.ps1
#>
param(
    [switch]$PullOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $RepoRoot "config\models.manifest.json") -Raw | ConvertFrom-Json
$provider = if ($env:LMVS_LOCAL_AI_PROVIDER) { $env:LMVS_LOCAL_AI_PROVIDER.ToLowerInvariant() } else { $manifest.default_local_ai_provider }

if ($provider -notin @("lemonade", "ollama")) {
    Write-Error "Unsupported LMVS_LOCAL_AI_PROVIDER '$provider'. Expected 'lemonade' or 'ollama'."
}

$defaultBaseUrl = if ($provider -eq "lemonade") { "http://127.0.0.1:13305" } else { "http://127.0.0.1:11434" }
$baseUrl = if ($env:LMVS_LOCAL_AI_BASE_URL) { $env:LMVS_LOCAL_AI_BASE_URL.TrimEnd('/') } else { $defaultBaseUrl }
$healthPath = if ($provider -eq "lemonade") { "/api/v1/health" } else { "/api/tags" }

Write-Host "=== setup-local-ai ($provider) ===" -ForegroundColor Cyan

try {
    $health = Invoke-RestMethod -Uri "$baseUrl$healthPath" -TimeoutSec 5

    if ($provider -eq "lemonade" -and $health.status -ne "ok") {
        throw "Lemonade health response did not report status 'ok'"
    }

    Write-Host "$provider API reachable at $baseUrl" -ForegroundColor Green
} catch {
    Write-Host "$provider is not reachable at $baseUrl ($($_.Exception.Message))" -ForegroundColor Red
    if ($provider -eq "lemonade") {
        Write-Host "Install or launch Lemonade Server, then retry. LMVideoStudio does not install provider software." -ForegroundColor Yellow
    } else {
        Write-Host "The Ollama path is compatibility-only; launch Ollama or select Lemonade." -ForegroundColor Yellow
    }
    exit 1
}

$syncScript = Join-Path $RepoRoot "scripts\sync_models.ps1"
if (-not (Test-Path $syncScript)) {
    Write-Error "Missing $syncScript"
}

if ($PullOnly) {
    & $syncScript -Pull -LocalAiOnly -ModelProvider $provider
    $syncSucceeded = $?
} else {
    & $syncScript -Check -LocalAiOnly -ModelProvider $provider
    $syncSucceeded = $?
}

if (-not $syncSucceeded) {
    exit 1
}

Write-Host "setup-local-ai complete" -ForegroundColor Green
