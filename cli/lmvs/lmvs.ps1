#Requires -Version 5.1
<#
.SYNOPSIS
  LMVideoStudio headless CLI — calls Host at localhost:17170.

.EXAMPLE
  .\lmvs.ps1 status --json
  .\lmvs.ps1 validate .\my-project\project.lmvs.json --json
  .\lmvs.ps1 preview <project-id-or-folder> --json
  .\lmvs.ps1 bake <project-id-or-folder> --json
#>
param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("validate", "preview", "bake", "status")]
    [string]$Command,

    [Parameter(Position = 1)]
    [string]$Target,

    [switch]$Json,
    [string]$HostUrl = "http://127.0.0.1:17170",
    [switch]$Wait
)

$ErrorActionPreference = "Stop"

function Write-Result($obj, [int]$ExitCode = 0) {
    if ($Json) {
        $obj | ConvertTo-Json -Depth 8 -Compress:$false
    }
    else {
        if ($obj -is [string]) { Write-Host $obj }
        elseif ($obj.message) { Write-Host $obj.message }
        else { $obj | ConvertTo-Json -Depth 6 }
    }
    exit $ExitCode
}

function Invoke-LmvsApi {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Body = $null
    )
    $uri = ($HostUrl.TrimEnd("/") + $Path)
    try {
        if ($Body) {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Body $Body -ContentType "application/json; charset=utf-8" -UseBasicParsing
        }
        else {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -UseBasicParsing
        }
        return @{ Status = [int]$resp.StatusCode; Body = $resp.Content }
    }
    catch {
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $text = $reader.ReadToEnd()
            return @{ Status = [int]$_.Exception.Response.StatusCode.value__; Body = $text }
        }
        throw
    }
}

function Resolve-ProjectId([string]$inputPath) {
    if ([string]::IsNullOrWhiteSpace $inputPath) {
        throw "Project id or folder path required for command '$Command'"
    }
    if ($inputPath -match '^[0-9a-fA-F-]{36}$') {
        return [Guid]::Parse($inputPath)
    }
    $folder = Resolve-Path -LiteralPath $inputPath
    $file = Join-Path $folder "project.lmvs.json"
    if (-not (Test-Path $file)) {
        throw "No project.lmvs.json in $folder"
    }
    $doc = Get-Content $file -Raw | ConvertFrom-Json
    return [Guid]::Parse($doc.id)
}

function Wait-JobEvents([Guid]$JobId, [string]$PhaseFilter) {
    $uri = "$($HostUrl.TrimEnd('/'))/jobs/$JobId/events"
    $req = [System.Net.WebRequest]::Create($uri)
    $req.Method = "GET"
    $resp = $req.GetResponse()
    $stream = $resp.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $deadline = (Get-Date).AddMinutes(10)
    while ((Get-Date) -lt $deadline) {
        if ($reader.EndOfStream) { Start-Sleep -Milliseconds 200; continue }
        $line = $reader.ReadLine()
        if ($line -and $line.StartsWith("data: ")) {
            $payload = $line.Substring(6) | ConvertFrom-Json
            if ($PhaseFilter -and $payload.phase -ne $PhaseFilter) { continue }
            if ($payload.status -in @("completed", "failed", "cancelled")) {
                $resp.Close()
                return $payload
            }
        }
    }
    throw "Timed out waiting for job $JobId"
}

switch ($Command) {
    "status" {
        $health = Invoke-LmvsApi -Method GET -Path "/health"
        $system = Invoke-LmvsApi -Method GET -Path "/system/status"
        $healthObj = $health.Body | ConvertFrom-Json
        $systemObj = if ($system.Status -ge 200 -and $system.Status -lt 300) { $system.Body | ConvertFrom-Json } else { $null }
        Write-Result @{
            command = "status"
            host    = $HostUrl
            health  = $healthObj
            system  = $systemObj
        }
    }

    "validate" {
        if (-not $Target) { throw "validate requires project.json path" }
        $path = Resolve-Path -LiteralPath $Target
        $json = Get-Content $path -Raw
        $resp = Invoke-LmvsApi -Method POST -Path "/projects/validate" -Body $json
        $body = $resp.Body | ConvertFrom-Json
        if ($resp.Status -ge 200 -and $resp.Status -lt 300 -and $body.valid) {
            Write-Result @{ command = "validate"; valid = $true; path = $path.Path }
        }
        else {
            Write-Result @{ command = "validate"; valid = $false; path = $path.Path; detail = $body } 1
        }
    }

    "preview" {
        $projectId = Resolve-ProjectId $Target
        $resp = Invoke-LmvsApi -Method POST -Path "/projects/$projectId/preview"
        $body = $resp.Body | ConvertFrom-Json
        if ($resp.Status -lt 200 -or $resp.Status -ge 300) {
            Write-Result @{ command = "preview"; error = $body } 1
        }
        if ($Wait) {
            $final = Wait-JobEvents -JobId ([Guid]$body.jobId) -PhaseFilter "mockup_preview"
            Write-Result @{ command = "preview"; job = $final; previewPath = $body.previewPath; mediaUrl = "$HostUrl/projects/$projectId/media/$($body.previewPath)" }
        }
        else {
            Write-Result @{ command = "preview"; jobId = $body.jobId; previewPath = $body.previewPath; eventsUrl = "$HostUrl$($body.eventsUrl)" }
        }
    }

    "bake" {
        $projectId = Resolve-ProjectId $Target
        $resp = Invoke-LmvsApi -Method POST -Path "/projects/$projectId/bake"
        $body = $resp.Body | ConvertFrom-Json
        if ($resp.Status -lt 200 -or $resp.Status -ge 300) {
            Write-Result @{ command = "bake"; error = $body } 1
        }
        if ($Wait) {
            $final = Wait-JobEvents -JobId ([Guid]$body.jobId) -PhaseFilter "bake"
            Write-Result @{ command = "bake"; job = $final }
        }
        else {
            Write-Result @{ command = "bake"; jobId = $body.jobId; eventsUrl = "$HostUrl$($body.eventsUrl)" }
        }
    }
}
