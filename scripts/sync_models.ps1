<#
.SYNOPSIS
  Sync LMVideoStudio model catalog (Lemonade by default, explicit Ollama fallback, Hugging Face, and file weights).

.EXAMPLE
  .\scripts\sync_models.ps1 -Check          # report missing / drift only
  .\scripts\sync_models.ps1 -Pull          # download missing models
  .\scripts\sync_models.ps1 -Pull -Update  # refresh configured provider models + HF cache
#>
param(
    [switch]$Check,
    [switch]$Pull,
    [switch]$Update,
    [switch]$LocalAiOnly,
    [ValidateSet("lemonade", "ollama")]
    [string]$ModelProvider
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $RepoRoot "config\models.manifest.json"

if (-not (Test-Path $ManifestPath)) {
    Write-Error "Missing manifest: $ManifestPath"
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$issues = @()
$warnings = @()
$actions = @()

if (-not $ModelProvider) {
    $ModelProvider = if ($env:LMVS_LOCAL_AI_PROVIDER) {
        $env:LMVS_LOCAL_AI_PROVIDER.ToLowerInvariant()
    } else {
        $manifest.default_local_ai_provider
    }
}

if ($ModelProvider -notin @("lemonade", "ollama")) {
    Write-Error "Unsupported local AI provider '$ModelProvider'. Expected 'lemonade' or 'ollama'."
}

$defaultBaseUrl = if ($ModelProvider -eq "lemonade") { "http://127.0.0.1:13305" } else { "http://127.0.0.1:11434" }
$baseUrl = if ($env:LMVS_LOCAL_AI_BASE_URL) { $env:LMVS_LOCAL_AI_BASE_URL.TrimEnd('/') } else { $defaultBaseUrl }

function Get-LocalAiModels {
    try {
        if ($ModelProvider -eq "lemonade") {
            $health = Invoke-RestMethod -Uri "$baseUrl/api/v1/health" -TimeoutSec 5
            if ($health.status -ne "ok") { throw "Lemonade health response did not report status 'ok'" }
            $catalog = Invoke-RestMethod -Uri "$baseUrl/api/v1/models" -TimeoutSec 10
            $installed = @($catalog.data | Where-Object { $_.downloaded -ne $false } | ForEach-Object { $_.id })
        } else {
            $tags = Invoke-RestMethod -Uri "$baseUrl/api/tags" -TimeoutSec 5
            $installed = @($tags.models | ForEach-Object { if ($_.name) { $_.name } else { $_.model } })
        }

        return [pscustomobject]@{
            InstalledNames = $installed
        }
    } catch {
        return [pscustomobject]@{ InstalledNames = @(); Error = $_.Exception.Message }
    }
}

function Install-LocalAiModel([string]$model) {
    if ($ModelProvider -eq "lemonade") {
        $payload = @{ model_name = $model; stream = $false } | ConvertTo-Json -Compress
        $result = Invoke-RestMethod -Uri "$baseUrl/api/v1/pull" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 3600
        if ($result.status -eq "error") { throw $result.message }
    } else {
        $ollama = Get-Command ollama -ErrorAction SilentlyContinue
        if (-not $ollama) { throw "Ollama CLI is required to pull '$model'" }
        & $ollama.Source pull $model
        if ($LASTEXITCODE -ne 0) { throw "ollama pull failed for '$model'" }
    }
}

Write-Host "=== LMVideoStudio model sync ===" -ForegroundColor Cyan
Write-Host "Manifest: $ManifestPath`n"
Write-Host "Local AI: $ModelProvider ($baseUrl)`n"

$providerStatus = Get-LocalAiModels
$providerEntries = if ($env:LMVS_LOCAL_AI_MODEL) {
    @([pscustomobject]@{
        id = "configured-model"
        model = $env:LMVS_LOCAL_AI_MODEL
        required = $true
        update_policy = "configured"
    })
} else {
    @($manifest.$ModelProvider)
}

foreach ($entry in $providerEntries) {
    $name = $entry.model
    if ($providerStatus.Error) {
        Write-Host "[$ModelProvider] $($entry.id): API unreachable ($($providerStatus.Error))" -ForegroundColor Yellow
        $issues += "$ModelProvider unreachable for $($entry.id)"
        continue
    }

    if ($providerStatus.InstalledNames -contains $name) {
        Write-Host "[$ModelProvider] $($entry.id): OK ($name)" -ForegroundColor Green
    } else {
        $required = ($entry.required -ne $false)
        if ($required) {
            Write-Host "[$ModelProvider] $($entry.id): MISSING ($name)" -ForegroundColor Red
            $issues += "Missing $ModelProvider model: $name"
        } else {
            Write-Host "[$ModelProvider] $($entry.id): optional missing ($name)" -ForegroundColor Yellow
            $warnings += "Optional $ModelProvider model not installed: $name"
        }
        if ($Pull) {
            Write-Host "  -> $ModelProvider pull $name"
            Install-LocalAiModel $name
            $actions += "Pulled $name"
        }
    }

    if ($Update -and $Pull) {
        Write-Host "  -> checking provider update for $name"
        Install-LocalAiModel $name
        $actions += "Updated $name"
    }
}

if ($LocalAiOnly) {
    Write-Host ""
    if ($issues.Count -eq 0) {
        Write-Host "Configured local AI models are present." -ForegroundColor Green
    } else {
        Write-Host "Local AI issues ($($issues.Count)):" -ForegroundColor Yellow
        $issues | ForEach-Object { Write-Host "  - $_" }
    }

    if ($Check -and $issues.Count -gt 0) { exit 1 }
    if ($Pull -and $actions.Count -gt 0) {
        Write-Host "Completed: $($actions -join '; ')" -ForegroundColor Green
    }
} else {

$python = Join-Path $RepoRoot "spike\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = (Get-Command python -ErrorAction SilentlyContinue).Source
}

foreach ($entry in $manifest.huggingface) {
    $repo = $entry.repo_id
    $rev = $entry.revision
    Write-Host "[HF] $($entry.id): $repo @ $rev"
    if (-not $python) {
        $issues += "Python not found for HF check: $($entry.id)"
        continue
    }
    $checkScript = @"
repo = '$repo'
try:
    from huggingface_hub import model_info
    info = model_info(repo)
    print('OK', repo, 'revision', info.sha[:12])
except Exception as e:
    print('MISSING', repo, str(e))
"@
    $hfStatus = & $python -c $checkScript 2>&1
    Write-Host "  $hfStatus"
    if ($hfStatus -match "^MISSING") {
        if ($entry.required -ne $false) {
            $issues += "Missing HF repo: $repo"
        } else {
            $warnings += "Optional HF repo missing: $repo"
        }
        if ($Pull) {
            $pullScript = "from huggingface_hub import snapshot_download; snapshot_download('$repo', revision='$rev')"
            & $python -c $pullScript
            $actions += "Downloaded HF $repo"
        }
    }
}

foreach ($entry in $manifest.files) {
    $path = Join-Path $RepoRoot ($entry.path -replace '/', '\')
    if (Test-Path $path) {
        $mb = [math]::Round((Get-Item $path).Length / 1MB, 1)
        Write-Host "[File] $($entry.id): OK ($mb MB)" -ForegroundColor Green
    } else {
        Write-Host "[File] $($entry.id): MISSING ($path)" -ForegroundColor Red
        if ($entry.required -ne $false) {
            $issues += "Missing file: $($entry.path)"
        } else {
            $warnings += "Optional file missing: $($entry.path)"
        }
        if ($Pull -and $entry.url) {
            New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
            Invoke-WebRequest -Uri $entry.url -OutFile $path
            $actions += "Downloaded $($entry.path)"
        }
    }
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "All required models present." -ForegroundColor Green
} else {
    Write-Host "Issues ($($issues.Count)):" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" }
}

if ($warnings.Count -gt 0) {
    Write-Host "Optional ($($warnings.Count)):" -ForegroundColor DarkGray
    $warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor DarkGray }
}

if (-not $Check -and -not $Pull) {
    Write-Host "`nUse -Check to exit non-zero on required issues, or -Pull to download missing models."
}

if ($Check -and $issues.Count -gt 0) { exit 1 }
if ($Pull -and $actions.Count -gt 0) {
    Write-Host "`nCompleted: $($actions -join '; ')" -ForegroundColor Green
}

}
