<#
.SYNOPSIS
  Start LMVideoStudio dev stack: Host, Worker, Fable client, and Vite.

.EXAMPLE
  .\scripts\dev.ps1
  .\scripts\dev.ps1 -SkipWorker
  .\scripts\dev.ps1 -SkipBrowser -NoFable
  .\scripts\dev.ps1 -SplitPanes
#>
param(
    [switch]$SkipWorker,
    [switch]$SkipBrowser,
    [switch]$NoFable,
    [switch]$SplitPanes,
    [switch]$Test
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$env:LMVS_REPO_ROOT = $RepoRoot

$HostPort = 17170
$WorkerPort = 8765
$ClientPort = 1420
$HostHealthUrl = "http://127.0.0.1:$HostPort/health"
$WorkerHealthUrl = "http://127.0.0.1:$WorkerPort/health"
$ClientUrl = "http://localhost:$ClientPort"

$HostProject = Join-Path $RepoRoot "src\LMVideoStudio.Host\LMVideoStudio.Host.fsproj"
$ClientDir = Join-Path $RepoRoot "src\LMVideoStudio.Client"
$WorkerDir = Join-Path $RepoRoot "sidecars\lmvs_worker"
$WorkerCmd = Join-Path $WorkerDir "run_worker.cmd"
$ClientJsDir = Join-Path $ClientDir "src-js"

function Write-DevHeader {
    Write-Host ""
    Write-Host "=== LMVideoStudio dev ===" -ForegroundColor Cyan
    Write-Host "Repo: $RepoRoot"
    Write-Host ""
}

function Escape-SingleQuotedPath {
    param([string]$Path)
    return ($Path -replace "'", "''")
}

function Get-PortListenerProcessIds {
    param([int]$Port)

    $pids = @()
    try {
        $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($listener in $listeners) {
            if ($listener.OwningProcess -and $listener.OwningProcess -ne 0) {
                $pids += [int]$listener.OwningProcess
            }
        }
    } catch {
        # Get-NetTCPConnection may be unavailable.
    }

    if ($pids.Count -eq 0) {
        $escapedPort = [regex]::Escape("$Port")
        $pattern = "^\s*TCP\s+\S+:$escapedPort\s+\S+\s+LISTENING\s+(\d+)\s*$"
        netstat -ano | ForEach-Object {
            if ($_ -match $pattern) {
                $pids += [int]$Matches[1]
            }
        }
    }

    return ($pids | Select-Object -Unique)
}

function Test-PortInUse {
    param([int]$Port)
    return ((Get-PortListenerProcessIds -Port $Port).Count -gt 0)
}

function Clear-StaleDevPorts {
    param([int[]]$Ports)

    $stopped = @()
    foreach ($port in $Ports) {
        foreach ($procId in (Get-PortListenerProcessIds -Port $port)) {
            if ($stopped -contains $procId) {
                continue
            }

            $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
            Write-Host "Stopping stale dev listener: $procName (PID $procId) on :$port" -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            $stopped += $procId
        }
    }

    if ($stopped.Count -gt 0) {
        Start-Sleep -Seconds 2
    }
}

function Ensure-DevPortsAvailable {
    # Host port: never auto-kill — another dev stack or Host may already be running.
    $hostPids = Get-PortListenerProcessIds -Port $HostPort
    if ($hostPids.Count -gt 0) {
        Write-Host "ERROR: Host port $HostPort is already in use — another LMVideoStudio Host may be running." -ForegroundColor Red
        foreach ($procId in $hostPids) {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            $name = if ($proc) { $proc.ProcessName } else { "unknown" }
            Write-Host "  PID $procId ($name) is listening on :$HostPort" -ForegroundColor Yellow
        }
        Write-Host "  Stop the existing dev stack (Ctrl+C in the other dev.ps1 terminal) before starting another." -ForegroundColor Yellow
        throw "Host port $HostPort already in use."
    }

    Clear-StaleDevPorts -Ports @($WorkerPort, $ClientPort)

    $conflicts = @()
    foreach ($entry in @(
        @{ Port = $WorkerPort; Name = "Worker" },
        @{ Port = $ClientPort; Name = "Client (Vite)" }
    )) {
        if (Test-PortInUse -Port $entry.Port) {
            $conflicts += "$($entry.Name) (:$($entry.Port))"
        }
    }

    if ($conflicts.Count -gt 0) {
        Write-Host "ERROR: Port(s) still in use:" -ForegroundColor Red
        foreach ($c in $conflicts) {
            Write-Host "  - $c" -ForegroundColor Red
        }
        throw "Dev ports are not available. Close the processes using these ports and retry."
    }
}

function New-DevPowerShellCommand {
    param(
        [string]$WorkingDirectory = $null,
        [hashtable]$Environment = @{},
        [string[]]$Statements
    )

    $body = @()
    foreach ($key in ($Environment.Keys | Sort-Object)) {
        $val = Escape-SingleQuotedPath $Environment[$key]
        $body += "`$env:${key}='$val'"
    }

    if ($WorkingDirectory) {
        $wd = Escape-SingleQuotedPath $WorkingDirectory
        $body += "Set-Location -LiteralPath '$wd'"
    }

    $body += $Statements
    $scriptText = $body -join "; "
    $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($scriptText))
    return "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand $encoded"
}

function Invoke-Concurrently {
    param([string[]]$ConcurrentArgs)

    $concurrentlyBin = Join-Path $RepoRoot "node_modules\.bin\concurrently.cmd"
    if (Test-Path $concurrentlyBin) {
        & $concurrentlyBin @ConcurrentArgs
    } else {
        & npx concurrently @ConcurrentArgs
    }

    return $LASTEXITCODE
}

function Wait-ForUrl {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 60,
        [string]$Label = $Url
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    Write-Host "Waiting for $Label ..." -ForegroundColor DarkGray

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Host "  OK: $Label" -ForegroundColor Green
                return $true
            }
        } catch {
            # Still starting.
        }
        Start-Sleep -Milliseconds 500
    }

    Write-Host "  TIMEOUT: $Label (after ${TimeoutSeconds}s)" -ForegroundColor Red
    return $false
}

function Needs-FableCompile {
    if (-not (Test-Path $ClientJsDir)) {
        return $true
    }

    $jsFiles = Get-ChildItem -Path $ClientJsDir -Filter "*.js" -Recurse -ErrorAction SilentlyContinue
    if (-not $jsFiles -or $jsFiles.Count -eq 0) {
        return $true
    }

    return $false
}

function Ensure-RootNpmDeps {
    Push-Location $RepoRoot
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing root npm dependencies (concurrently) ..." -ForegroundColor Yellow
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed at repo root."
            }
        }
    } finally {
        Pop-Location
    }
}

function Prepare-Client {
    if (-not (Test-Path $ClientDir)) {
        throw "Client directory not found: $ClientDir"
    }

    Push-Location $ClientDir
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing client npm dependencies ..." -ForegroundColor Yellow
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed."
            }
        }

        if (-not $NoFable) {
            if (Needs-FableCompile) {
                Write-Host "Running dotnet fable ..." -ForegroundColor Yellow
                dotnet fable . -o ./src-js --exclude LMVideoStudio.Domain.Serialization --exclude LMVideoStudio.Domain.Validation
                if ($LASTEXITCODE -ne 0) {
                    throw "dotnet fable failed."
                }
            } else {
                Write-Host "Fable output present in src-js (skipping compile)" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "Skipped Fable (-NoFable)" -ForegroundColor DarkGray
        }
    } finally {
        Pop-Location
    }
}

function Get-WorkerAvailable {
    if ($SkipWorker) {
        return $false
    }
    if (-not (Test-Path $WorkerCmd)) {
        Write-Host "WARNING: Worker not found at $WorkerCmd - skipping worker." -ForegroundColor Yellow
        Write-Host "  Run .\scripts\build-sidecars.ps1 first." -ForegroundColor Yellow
        return $false
    }
    return $true
}

function Start-BrowserWhenReady {
    if ($SkipBrowser) {
        Write-Host "Skipped browser (-SkipBrowser)" -ForegroundColor DarkGray
        return $null
    }

    return Start-Job -ScriptBlock {
        param($Url, $TimeoutSeconds)
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while ((Get-Date) -lt $deadline) {
            try {
                $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                    Start-Process $Url
                    return
                }
            } catch {
                # Still starting.
            }
            Start-Sleep -Milliseconds 500
        }
    } -ArgumentList $ClientUrl, 120
}

function Start-HealthCheckJob {
    param([bool]$IncludeWorker)

    return Start-Job -ScriptBlock {
        param($HostHealthUrl, $WorkerHealthUrl, $IncludeWorker)
        Start-Sleep -Seconds 3
        foreach ($entry in @(
            @{ Url = $HostHealthUrl; Label = "Host health" }
        )) {
            try {
                $r = Invoke-WebRequest -Uri $entry.Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) {
                    Write-Output "  OK: $($entry.Label)"
                }
            } catch {
                Write-Output "  WARN: $($entry.Label) not ready yet"
            }
        }
        if ($IncludeWorker) {
            try {
                $r = Invoke-WebRequest -Uri $WorkerHealthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) {
                    Write-Output "  OK: Worker health"
                }
            } catch {
                Write-Output "  WARN: Worker health not ready (GPU features may not work)"
            }
        }
    } -ArgumentList $HostHealthUrl, $WorkerHealthUrl, $IncludeWorker
}

function Build-ConcurrentCommands {
    param([bool]$IncludeWorker)

    # PowerShell child processes avoid cmd.exe nested-quote bugs on Windows.
        $hostCmd = New-DevPowerShellCommand `
        -WorkingDirectory $RepoRoot `
        -Environment @{ LMVS_REPO_ROOT = $RepoRoot; LMVS_HOST_PORT = "$HostPort" } `
        -Statements @("dotnet run --project '$((Escape-SingleQuotedPath $HostProject))'")

    $clientCmd = New-DevPowerShellCommand `
        -WorkingDirectory $ClientDir `
        -Environment @{
            VITE_LMVS_HOST = "http://127.0.0.1:$HostPort"
            LMVS_HOST_PORT = "$HostPort"
        } `
        -Statements @("npm run dev")

    if ($IncludeWorker) {
        $workerCmd = New-DevPowerShellCommand `
            -WorkingDirectory $WorkerDir `
            -Statements @("& '.\\run_worker.cmd'")

        return @{
            Names = "host,worker,client"
            Colors = "cyan,magenta,green"
            Commands = @($hostCmd, $workerCmd, $clientCmd)
        }
    }

    return @{
        Names = "host,client"
        Colors = "cyan,green"
        Commands = @($hostCmd, $clientCmd)
    }
}

function Stop-LmvsFfmpegChildren {
    $ffmpegPath = Join-Path $RepoRoot "sidecars\lmvs_worker\bin\ffmpeg.exe"
    if (-not (Test-Path $ffmpegPath)) {
        return
    }

    $resolved = (Resolve-Path -LiteralPath $ffmpegPath).Path
    Get-Process -Name ffmpeg -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            if ($_.Path -eq $resolved) {
                Write-Host "Stopping LMVS ffmpeg (PID $($_.Id))" -ForegroundColor Yellow
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Access denied or process already exited.
        }
    }
}

function Start-ConcurrentDev {
    param([bool]$IncludeWorker)

    $cfg = Build-ConcurrentCommands -IncludeWorker $IncludeWorker
    $browserJob = Start-BrowserWhenReady
    $healthJob = Start-HealthCheckJob -IncludeWorker $IncludeWorker

    Write-Host ""
    Write-Host "Starting dev stack (interleaved logs). Ctrl+C stops all processes." -ForegroundColor Cyan
    Write-Host "  Orphan ffmpeg cleanup: Stop-LmvsFfmpegChildren runs on exit (sidecars bin path)." -ForegroundColor DarkGray
    Write-Host "  App:       $ClientUrl"
    Write-Host "  Host API:  http://127.0.0.1:$HostPort"
    if ($IncludeWorker) {
        Write-Host "  Worker:    http://127.0.0.1:$WorkerPort"
    }
    Write-Host ""

    Push-Location $RepoRoot
    try {
        $concurrentArgs = @(
            "-n", $cfg.Names,
            "-c", $cfg.Colors,
            "--kill-others-on-fail"
        ) + $cfg.Commands
        $exitCode = Invoke-Concurrently -ConcurrentArgs $concurrentArgs
    } finally {
        Pop-Location
        Stop-LmvsFfmpegChildren
        if ($healthJob) {
            Receive-Job $healthJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
            Stop-Job $healthJob -ErrorAction SilentlyContinue
            Remove-Job $healthJob -Force -ErrorAction SilentlyContinue
        }
        if ($browserJob) {
            $browserState = Get-Job $browserJob -ErrorAction SilentlyContinue
            if ($browserState -and $browserState.State -eq "Completed") {
                Write-Host "Opened browser: $ClientUrl" -ForegroundColor Green
            }
            Stop-Job $browserJob -ErrorAction SilentlyContinue
            Remove-Job $browserJob -Force -ErrorAction SilentlyContinue
        }
    }

    if ($exitCode -ne 0) {
        exit $exitCode
    }
}

function Start-SplitPaneDev {
    param([bool]$IncludeWorker)

    $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
    if (-not $wt) {
        throw "-SplitPanes requires Windows Terminal (wt.exe). Install from Microsoft Store or use default single-terminal mode."
    }

    $hostPs = "`$env:LMVS_REPO_ROOT='$RepoRoot'; `$env:LMVS_HOST_PORT='$HostPort'; Set-Location '$RepoRoot'; dotnet run --project '$HostProject'"
    $clientPs = "`$env:VITE_LMVS_HOST='http://127.0.0.1:$HostPort'; `$env:LMVS_HOST_PORT='$HostPort'; Set-Location '$ClientDir'; npm run dev"

    $browserJob = Start-BrowserWhenReady

    Write-Host ""
    Write-Host "Launching Windows Terminal with split panes ..." -ForegroundColor Cyan
    Write-Host "  Close panes individually to stop each process." -ForegroundColor DarkGray
    Write-Host ""

    $wtArgs = @(
        "-w", "0",
        "nt", "--title", "LMVS Host", "-d", $RepoRoot,
        "powershell.exe", "-NoExit", "-NoLogo", "-Command", $hostPs
    )

    if ($IncludeWorker) {
        $wtArgs += @(
            ";", "sp", "-V", "--title", "LMVS Worker", "-d", $WorkerDir,
            "cmd.exe", "/c", "run_worker.cmd"
        )
    }

    $wtArgs += @(
        ";", "sp", "-H", "--title", "LMVS Client", "-d", $ClientDir,
        "powershell.exe", "-NoExit", "-NoLogo", "-Command", $clientPs
    )

    & wt.exe @wtArgs

    if ($browserJob) {
        Write-Host "Waiting for client before opening browser ..." -ForegroundColor DarkGray
        Wait-Job $browserJob -Timeout 120 | Out-Null
        if ((Get-Job $browserJob).State -eq "Completed") {
            Write-Host "Opened browser: $ClientUrl" -ForegroundColor Green
        }
        Stop-Job $browserJob -ErrorAction SilentlyContinue
        Remove-Job $browserJob -Force -ErrorAction SilentlyContinue
    }

    Write-Host ""
    Write-Host "=== Dev stack launched in Windows Terminal ===" -ForegroundColor Cyan
    Write-Host "  App:       $ClientUrl"
    Write-Host "  Host API:  http://127.0.0.1:$HostPort"
    if ($IncludeWorker) {
        Write-Host "  Worker:    http://127.0.0.1:$WorkerPort"
    }
    Write-Host ""
}

# --- Main ---

if ($Test) {
    $testScript = Join-Path $RepoRoot "scripts\test.ps1"
    & $testScript
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

Write-DevHeader
Ensure-DevPortsAvailable

if (-not (Test-Path $HostProject)) {
    throw "Host project not found: $HostProject"
}

if ($SkipWorker) {
    Write-Host "Skipped Worker (-SkipWorker)" -ForegroundColor DarkGray
}

$includeWorker = Get-WorkerAvailable
Prepare-Client
Ensure-RootNpmDeps

if ($SplitPanes) {
    Start-SplitPaneDev -IncludeWorker $includeWorker
} else {
    Start-ConcurrentDev -IncludeWorker $includeWorker
}
