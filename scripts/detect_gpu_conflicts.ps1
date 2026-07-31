<#
.SYNOPSIS
  Advisory scan for processes that may compete with LMVideoStudio GPU / local AI work.
  Exit 0 always unless -Strict and blocking conflicts found.

.EXAMPLE
  .\scripts\detect_gpu_conflicts.ps1
  .\scripts\detect_gpu_conflicts.ps1 -Json | Set-Content out\conflicts.json
#>
param(
    [switch]$Json,
    [switch]$Strict
)

$ErrorActionPreference = "SilentlyContinue"

$knownGpuApps = @(
    @{ Name = "LM Studio"; ProcessNames = @("LM Studio", "lmstudio") }
    @{ Name = "ComfyUI"; ProcessNames = @("ComfyUI") }
    @{ Name = "Stable Diffusion WebUI"; ProcessNames = @("webui", "stable-diffusion-webui") }
    @{ Name = "Blender"; ProcessNames = @("blender") }
    @{ Name = "UnrealEditor"; ProcessNames = @("UnrealEditor") }
    @{ Name = "Unity"; ProcessNames = @("Unity") }
)

$gamePatterns = @(
    "steam", "EpicGamesLauncher", "RiotClientServices", "Battle.net"
)

$conflicts = @()
$warnings = @()

foreach ($entry in $knownGpuApps) {
    foreach ($procName in $entry.ProcessNames) {
        $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
        if ($procs) {
            $conflicts += [pscustomobject]@{
                kind    = "known_gpu_app"
                name    = $entry.Name
                process = $procName
                count   = $procs.Count
                hint    = $entry.Hint
                severity = "advisory"
            }
        }
    }
}

foreach ($pattern in $gamePatterns) {
    $procs = Get-Process -Name $pattern -ErrorAction SilentlyContinue
    if ($procs) {
        $conflicts += [pscustomobject]@{
            kind     = "game_or_launcher"
            name     = $pattern
            process  = ($procs | Select-Object -First 1).ProcessName
            count    = $procs.Count
            severity = "advisory"
        }
    }
}

$localAiProvider = if ($env:LMVS_LOCAL_AI_PROVIDER) { $env:LMVS_LOCAL_AI_PROVIDER.ToLowerInvariant() } else { "lemonade" }
$localAiDefaultUrl = if ($localAiProvider -eq "ollama") { "http://127.0.0.1:11434" } else { "http://127.0.0.1:13305" }
$localAiBaseUrl = if ($env:LMVS_LOCAL_AI_BASE_URL) { $env:LMVS_LOCAL_AI_BASE_URL.TrimEnd('/') } else { $localAiDefaultUrl }

try {
    if ($localAiProvider -eq "lemonade") {
        $health = Invoke-RestMethod -Uri "$localAiBaseUrl/api/v1/health" -TimeoutSec 3
        $loaded = @($health.all_models_loaded)

        if ($loaded.Count -gt 0) {
            $warnings += [pscustomobject]@{
                kind     = "local_ai_models_loaded"
                name     = ($loaded | ForEach-Object { $_.model_name }) -join ", "
                severity = "advisory"
                message  = "Lemonade already has model(s) loaded and may be using GPU memory"
            }
        }
    } elseif ($localAiProvider -eq "ollama") {
        $running = Invoke-RestMethod -Uri "$localAiBaseUrl/api/ps" -TimeoutSec 3
        $loaded = @($running.models)

        if ($loaded.Count -gt 0) {
            $warnings += [pscustomobject]@{
                kind     = "local_ai_models_loaded"
                name     = ($loaded | ForEach-Object { $_.name }) -join ", "
                severity = "advisory"
                message  = "Ollama already has model(s) loaded and may be using GPU memory"
            }
        }
    } else {
        throw "Unsupported LMVS_LOCAL_AI_PROVIDER '$localAiProvider'"
    }
} catch {
    $warnings += [pscustomobject]@{
        kind     = "local_ai_unreachable"
        severity = "info"
        message  = "$localAiProvider not running yet (OK before bootstrap)"
    }
}

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 2
    if ($health.models_loaded.sd -or $health.models_loaded.esrgan) {
        $warnings += [pscustomobject]@{
            kind     = "worker_models_loaded"
            severity = "info"
            message  = "Python worker already has models loaded"
        }
    }
} catch {
    # worker not running
}

$drive = (Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -eq "C" } | Select-Object -First 1)
if ($drive -and ($drive.Free / 1GB) -lt 10) {
    $conflicts += [pscustomobject]@{
        kind     = "low_disk"
        name     = "C:"
        freeGb   = [math]::Round($drive.Free / 1GB, 1)
        severity = "warning"
    }
}

$result = [pscustomobject]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    advisory  = $true
    conflicts = $conflicts
    warnings  = $warnings
    summary   = if ($conflicts.Count -eq 0) { "No blocking conflicts detected" } else { "$($conflicts.Count) advisory conflict(s)" }
}

if ($Json) {
    $result | ConvertTo-Json -Depth 6
} else {
    Write-Host "=== LMVideoStudio GPU conflict scan (advisory) ===" -ForegroundColor Cyan
    if ($conflicts.Count -eq 0) {
        Write-Host "No known competing GPU apps detected." -ForegroundColor Green
    } else {
        foreach ($c in $conflicts) {
            Write-Host ("[{0}] {1} ({2})" -f $c.severity, $c.name, $c.process) -ForegroundColor Yellow
        }
    }
    foreach ($w in $warnings) {
        Write-Host ("[info] {0}" -f $w.message) -ForegroundColor DarkGray
    }
}

if ($Strict -and ($conflicts | Where-Object { $_.severity -eq "blocking" })) {
    exit 1
}
exit 0
