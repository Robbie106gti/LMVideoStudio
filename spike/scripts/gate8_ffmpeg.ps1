$ErrorActionPreference = "Stop"
$SpikeRoot = Split-Path -Parent $PSScriptRoot
$input = Join-Path $SpikeRoot "out\gate3_upscaled.png"
$output = Join-Path $SpikeRoot "out\gate8.mp4"
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source

Write-Host "=== Gate 8: FFmpeg Ken Burns ===" -ForegroundColor Cyan

if (-not (Test-Path $input)) {
    $input = Join-Path $SpikeRoot "out\gate2.png"
}
if (-not (Test-Path $input)) {
    Write-Host "FAIL: No gate2/gate3 PNG found" -ForegroundColor Red
    exit 1
}

# zoompan cost ~ O(output_pixels * d). Scale down first; upscale to 720p in export phase if needed.
# Linear on-based zoom matches Host FfmpegExport (smoother than zoom+increment).
$fps = 25
$duration = 2
$frames = [int][Math]::Round($duration * $fps)
$frameDenom = $frames - 1
$vf = "scale=640:360:flags=lanczos,zoompan=z='1+(0.3)*on/($frameDenom)':d=$frames`:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=640x360:fps=$fps"
& $ffmpeg -nostdin -hide_banner -y -loop 1 -i $input -vf $vf -frames:v $frames -c:v libx264 -preset fast -pix_fmt yuv420p -r $fps -vsync cfr $output

if ((Test-Path $output) -and ((Get-Item $output).Length -gt 1000)) {
    Write-Host "Wrote $output" -ForegroundColor Green
    @{
        gate   = 8
        pass   = $true
        output = $output
        note   = "Ken Burns at 640x360 preview; final export can scale to 720p/1080p"
    } | ConvertTo-Json | Set-Content (Join-Path $SpikeRoot "out\gate8.json")
    Write-Host "Gate 8: PASS"
    exit 0
}

Write-Host "Gate 8: FAIL" -ForegroundColor Red
exit 1
