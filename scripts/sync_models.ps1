<#
.SYNOPSIS
  Sync LMVideoStudio model catalog (Ollama + Hugging Face + file weights).

.EXAMPLE
  .\scripts\sync_models.ps1 -Check          # report missing / drift only
  .\scripts\sync_models.ps1 -Pull          # download missing models
  .\scripts\sync_models.ps1 -Pull -Update  # pull latest Ollama tags + refresh HF cache
#>
param(
    [switch]$Check,
    [switch]$Pull,
    [switch]$Update
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

function Test-OllamaModel([string]$model) {
    try {
        $tags = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
        $installed = $tags.models | ForEach-Object { $_.name }
        return [pscustomobject]@{
            Installed = ($installed -contains $model)
            InstalledNames = $installed
        }
    } catch {
        return [pscustomobject]@{ Installed = $false; Error = $_.Exception.Message }
    }
}

Write-Host "=== LMVideoStudio model sync ===" -ForegroundColor Cyan
Write-Host "Manifest: $ManifestPath`n"

foreach ($entry in $manifest.ollama) {
    $name = $entry.model
    $status = Test-OllamaModel $name
    if ($status.Error) {
        Write-Host "[Ollama] $($entry.id): API unreachable ($($status.Error))" -ForegroundColor Yellow
        $issues += "Ollama unreachable for $($entry.id)"
        continue
    }
    if ($status.Installed) {
        Write-Host "[Ollama] $($entry.id): OK ($name)" -ForegroundColor Green
    } else {
        $required = ($entry.required -ne $false)
        if ($required) {
            Write-Host "[Ollama] $($entry.id): MISSING ($name)" -ForegroundColor Red
            $issues += "Missing Ollama model: $name"
        } else {
            Write-Host "[Ollama] $($entry.id): optional missing ($name)" -ForegroundColor Yellow
            $warnings += "Optional Ollama model not installed: $name"
        }
        if ($Pull) {
            Write-Host "  -> ollama pull $name"
            & ollama pull $name
            $actions += "Pulled $name"
        }
    }
    if ($Update -and $Pull -and $entry.update_policy -eq "track_latest_tag") {
        Write-Host "  -> checking tag update for $name"
        & ollama pull $name
        $actions += "Updated $name"
    }
}

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
from huggingface_hub import scan_cache_dir, model_info
repo = '$repo'
try:
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
