<#
.SYNOPSIS
  E2E smoke: validate Host health, project validate, and share-pack guard (no GPU).

.EXAMPLE
  .\scripts\e2e_smoke.ps1
  .\scripts\e2e_smoke.ps1 -HostUrl http://127.0.0.1:17170
  .\scripts\e2e_smoke.ps1 -StartHost
#>
param(
    [string]$HostUrl = "http://127.0.0.1:17170",
    [switch]$StartHost
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$env:LMVS_REPO_ROOT = $RepoRoot

$hostProcess = $null

function Invoke-HostJson {
    param([string]$Method, [string]$Path, [string]$Body = $null)
    $uri = "$HostUrl$Path"
    $params = @{
        Uri             = $uri
        Method          = $Method
        UseBasicParsing = $true
        TimeoutSec      = 15
    }
    if ($Body -and $Method -in @("POST", "PUT", "PATCH")) {
        $params.ContentType = "application/json"
        $params.Body = $Body
    }
    try {
        return Invoke-WebRequest @params
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($null -eq $resp) { throw }
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $text = $reader.ReadToEnd()
        $reader.Close()
        return [PSCustomObject]@{
            StatusCode = [int]$resp.StatusCode
            Content    = $text
            BaseResponse = $resp
        }
    }
}

function Assert-Status {
    param($Response, [int[]]$Expected)
    $code = if ($Response.StatusCode -is [int]) { $Response.StatusCode } else { [int]$Response.StatusCode }
    if ($Expected -notcontains $code) {
        throw "Unexpected status: expected $($Expected -join '|') got $code"
    }
}

try {
    if ($StartHost) {
        Write-Host "Starting Host on $HostUrl ..." -ForegroundColor Cyan
        $hostProject = Join-Path $RepoRoot "src\LMVideoStudio.Host\LMVideoStudio.Host.fsproj"
        $hostProcess = Start-Process -FilePath "dotnet" `
            -ArgumentList "run", "--project", $hostProject, "--no-build" `
            -WorkingDirectory $RepoRoot `
            -PassThru -WindowStyle Hidden

        $deadline = (Get-Date).AddSeconds(45)
        while ((Get-Date) -lt $deadline) {
            try {
                $r = Invoke-HostJson GET "/health"
                if ($r.StatusCode -eq 200) { break }
            } catch { Start-Sleep -Milliseconds 500 }
        }
    }

    Write-Host "E2E smoke against $HostUrl" -ForegroundColor Cyan

    $health = Invoke-HostJson GET "/health"
    Assert-Status $health @(200)
    if ($health.Content -notmatch "ok") { throw "Health body missing ok" }
    Write-Host "  OK /health" -ForegroundColor Green

    $status = Invoke-HostJson GET "/api/v1/status"
    Assert-Status $status @(200)
    if ($status.Content -notmatch "apiVersion") { throw "Status missing apiVersion" }
    Write-Host "  OK /api/v1/status" -ForegroundColor Green

    $openapi = Invoke-HostJson GET "/openapi.json"
    Assert-Status $openapi @(200)
    $null = $openapi.Content | ConvertFrom-Json
    Write-Host "  OK /openapi.json parses" -ForegroundColor Green

    $create = Invoke-HostJson POST "/projects" '{"name":"E2E smoke project"}'
    Assert-Status $create @(201)
    $project = $create.Content | ConvertFrom-Json
    $projectId = $project.id
    Write-Host "  OK POST /projects -> $projectId" -ForegroundColor Green

    $validate = Invoke-HostJson POST "/api/v1/validate" ($create.Content)
    Assert-Status $validate @(200)
    if ($validate.Content -notmatch '"valid"\s*:\s*true') { throw "Validate failed" }
    Write-Host "  OK /api/v1/validate" -ForegroundColor Green

    $share = Invoke-HostJson POST "/projects/$projectId/export/share-pack" "{}"
    Assert-Status $share @(400)
    if ($share.Content -notmatch "preview|bake|MP4") { throw "Share-pack 400 missing expected message" }
    Write-Host "  OK share-pack 400 without MP4" -ForegroundColor Green

    $cleanup = Invoke-HostJson DELETE "/projects/$projectId"
    Assert-Status $cleanup @(204)
    Write-Host "  OK DELETE /projects/{id}" -ForegroundColor Green

    Write-Host ""
    Write-Host "E2E smoke passed." -ForegroundColor Green
    exit 0
}
finally {
    if ($hostProcess -and -not $hostProcess.HasExited) {
        Stop-Process -Id $hostProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
