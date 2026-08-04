[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath,

    [string]$FrameGenerationExe = $env:LMVS_FSR_FRAMEGEN_EXE,
    [string]$UpscaleExe = $env:LMVS_FSR_UPSCALE_EXE,
    [string]$FfmpegPath = "ffmpeg.exe",

    [ValidateSet("1080p", "4k")]
    [string]$Profile = "1080p",

    [ValidateRange(1, 120)]
    [int]$SourceFps = 24,

    [ValidateRange(0.01, 1.0)]
    [double]$SceneThreshold = 0.22,

    [ValidateSet("auto", "amf", "cpu")]
    [string]$Encoder = "auto",

    [switch]$FrameGeneration,

    [switch]$Stabilize,

    [switch]$PlanOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$renderWidth = if ($Profile -eq "4k") { 1280 } else { 640 }
$renderHeight = if ($Profile -eq "4k") { 704 } else { 352 }
$paddedHeight = if ($Profile -eq "4k") { 720 } else { 360 }
$outputWidth = if ($Profile -eq "4k") { 3840 } else { 1920 }
$outputHeight = if ($Profile -eq "4k") { 2160 } else { 1080 }
$paddingY = [int](($paddedHeight - $renderHeight) / 2)
$frameGenerationHeight = if ($FrameGeneration -and $Profile -eq "4k") { $paddedHeight } else { $renderHeight }
$targetFps = if ($FrameGeneration) { $SourceFps * 2 } else { $SourceFps }
$sourceFrameTimeMs = 1000.0 / $SourceFps
$outputFrameTimeMs = 1000.0 / $targetFps
$sourceFrameTimeArg = $sourceFrameTimeMs.ToString("0.######", [Globalization.CultureInfo]::InvariantCulture)
$outputFrameTimeArg = $outputFrameTimeMs.ToString("0.######", [Globalization.CultureInfo]::InvariantCulture)

function Resolve-Executable {
    param([string]$Value, [string]$Label)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "$Label is not configured."
    }

    $command = Get-Command -Name $Value -ErrorAction SilentlyContinue

    if ($null -ne $command) {
        return $command.Source
    }

    if (Test-Path -LiteralPath $Value -PathType Leaf) {
        return (Resolve-Path -LiteralPath $Value).Path
    }

    throw "$Label was not found: $Value"
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$Label
    )

    $timer = [Diagnostics.Stopwatch]::StartNew()
    & $FilePath @Arguments 2>&1 | Out-Null
    $exitCode = $LASTEXITCODE
    $timer.Stop()

    if ($exitCode -ne 0) {
        throw "$Label failed with exit code $exitCode."
    }

    return $timer.Elapsed.TotalMilliseconds
}

$plan = [ordered]@{
    input = $InputPath
    output = $OutputPath
    profile = $Profile
    source_width = $renderWidth
    source_height = $renderHeight
    frame_generation_input_height = $frameGenerationHeight
    source_fps = $SourceFps
    frame_generation_frame_time_ms = $sourceFrameTimeMs
    output_width = $outputWidth
    output_height = $outputHeight
    output_fps = $targetFps
    upscale_frame_time_ms = $outputFrameTimeMs
    scene_threshold = $SceneThreshold
    encoder = $Encoder
    frame_generation = [bool]$FrameGeneration
    stabilization = [bool]$Stabilize
    stages = @(
        "deflicker",
        $(if ($Stabilize) { "capped_stabilization" }),
        $(if ($FrameGeneration) { "scene_jump_detection" }),
        $(if ($FrameGeneration) { "fsr4_frame_generation" }),
        "pad_to_16_9",
        "fsr4_ml_upscale",
        "amf_encode_with_cpu_fallback"
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

if ($PlanOnly) {
    $plan | ConvertTo-Json -Depth 4
    exit 0
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedFfmpeg = Resolve-Executable -Value $FfmpegPath -Label "FFmpeg"
$resolvedFrameGeneration =
    if ($FrameGeneration) {
        Resolve-Executable -Value $FrameGenerationExe -Label "FSR frame-generation executable"
    }
    else {
        $null
    }
$resolvedUpscale = Resolve-Executable -Value $UpscaleExe -Label "FSR upscaling executable"
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [IO.Path]::GetDirectoryName($resolvedOutput)

if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
    throw "OutputPath must include a directory."
}

[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$workRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$workDirectory = Join-Path $workRoot ("lmvs-radeon-finish-" + [Guid]::NewGuid().ToString("N"))
$sourceDirectory = Join-Path $workDirectory "source"
$interpolatedDirectory = Join-Path $workDirectory "interpolated"
$paddedDirectory = Join-Path $workDirectory "padded"
$upscaledDirectory = Join-Path $workDirectory "upscaled"
[IO.Directory]::CreateDirectory($sourceDirectory) | Out-Null
[IO.Directory]::CreateDirectory($interpolatedDirectory) | Out-Null
[IO.Directory]::CreateDirectory($paddedDirectory) | Out-Null
[IO.Directory]::CreateDirectory($upscaledDirectory) | Out-Null

$totalTimer = [Diagnostics.Stopwatch]::StartNew()
$stageTimes = [ordered]@{}
$sceneCutFrames = [Collections.Generic.HashSet[int]]::new()

try {
    $sourcePattern = Join-Path $sourceDirectory "frame-%04d.rgba"
    $baseVideoFilter =
        if ($Stabilize) {
            "deshake=rx=16:ry=16:edge=mirror,deflicker=size=5:mode=am,scale=${renderWidth}:${renderHeight}:flags=lanczos"
        }
        else {
            "deflicker=size=5:mode=am,scale=${renderWidth}:${renderHeight}:flags=lanczos"
        }
    $videoFilter =
        if ($frameGenerationHeight -eq $paddedHeight -and $renderHeight -ne $paddedHeight) {
            "$baseVideoFilter,pad=${renderWidth}:${paddedHeight}:0:${paddingY}:color=black,format=rgba"
        }
        else {
            "$baseVideoFilter,format=rgba"
        }

    $extractArgs = @(
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", $resolvedInput,
        "-vf", $videoFilter,
        "-r", $SourceFps.ToString([Globalization.CultureInfo]::InvariantCulture),
        "-start_number", "0",
        "-f", "image2", "-vcodec", "rawvideo", $sourcePattern
    )
    $stageTimes.prepare_ms = Invoke-Checked -FilePath $resolvedFfmpeg -Arguments $extractArgs -Label "Source preparation"

    $sourceFrames = @(Get-ChildItem -LiteralPath $sourceDirectory -Filter "frame-*.rgba" | Sort-Object Name)

    if ($sourceFrames.Count -lt 2) {
        throw "Finishing requires at least two decoded source frames."
    }

    $expectedBytes = $renderWidth * $frameGenerationHeight * 4

    foreach ($frame in $sourceFrames) {
        if ($frame.Length -ne $expectedBytes) {
            throw "Unexpected raw frame size for $($frame.Name): $($frame.Length), expected $expectedBytes."
        }
    }

    $framesToUpscale = $sourceFrames

    if ($FrameGeneration) {
        $sceneTimer = [Diagnostics.Stopwatch]::StartNew()
        $sceneArgs = @(
            "-hide_banner", "-loglevel", "info", "-i", $resolvedInput,
            "-vf", "select='gt(scene,$SceneThreshold)',showinfo", "-an", "-f", "null", "NUL"
        )
        $sceneOutput = (& $resolvedFfmpeg @sceneArgs 2>&1 | Out-String)

        if ($LASTEXITCODE -ne 0) {
            throw "Scene-jump detection failed with exit code $LASTEXITCODE."
        }

        foreach ($match in [regex]::Matches($sceneOutput, "pts_time:([0-9]+(?:\.[0-9]+)?)")) {
            $seconds = [double]::Parse($match.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
            $frameIndex = [int][Math]::Round($seconds * $SourceFps)

            if ($frameIndex -gt 0) {
                $sceneCutFrames.Add($frameIndex) | Out-Null
            }
        }

        $sceneTimer.Stop()
        $stageTimes.scene_detection_ms = $sceneTimer.Elapsed.TotalMilliseconds
        $frameGenerationTimer = [Diagnostics.Stopwatch]::StartNew()

        for ($index = 0; $index -lt $sourceFrames.Count; $index++) {
            $evenOutput = Join-Path $interpolatedDirectory ("frame-{0:D4}.rgba" -f ($index * 2))
            Copy-Item -LiteralPath $sourceFrames[$index].FullName -Destination $evenOutput

            $oddOutput = Join-Path $interpolatedDirectory ("frame-{0:D4}.rgba" -f ($index * 2 + 1))

            if ($index -eq $sourceFrames.Count - 1 -or $sceneCutFrames.Contains($index + 1)) {
                Copy-Item -LiteralPath $sourceFrames[$index].FullName -Destination $oddOutput
            }
            else {
                & $resolvedFrameGeneration $sourceFrames[$index].FullName $sourceFrames[$index + 1].FullName $oddOutput $sourceFrameTimeArg 2>&1 | Out-Null

                if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $oddOutput -PathType Leaf)) {
                    Remove-Item -LiteralPath $oddOutput -Force -ErrorAction SilentlyContinue
                    & $resolvedFrameGeneration $sourceFrames[$index].FullName $sourceFrames[$index + 1].FullName $oddOutput 2>&1 | Out-Null
                }

                if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $oddOutput -PathType Leaf)) {
                    throw "FSR frame generation failed between source frames $index and $($index + 1)."
                }
            }
        }

        $frameGenerationTimer.Stop()
        $stageTimes.fsr_frame_generation_ms = $frameGenerationTimer.Elapsed.TotalMilliseconds
        $framesToUpscale = @(Get-ChildItem -LiteralPath $interpolatedDirectory -Filter "frame-*.rgba" | Sort-Object Name)
    }

    $padTimer = [Diagnostics.Stopwatch]::StartNew()
    $padInputPattern = Join-Path ([IO.Path]::GetDirectoryName($framesToUpscale[0].FullName)) "frame-%04d.rgba"
    $paddedPattern = Join-Path $paddedDirectory "frame-%04d.rgba"
    $padArgs = @(
        "-y", "-hide_banner", "-loglevel", "error",
        "-f", "image2", "-framerate", $targetFps.ToString([Globalization.CultureInfo]::InvariantCulture),
        "-video_size", "${renderWidth}x${frameGenerationHeight}", "-pixel_format", "rgba", "-vcodec", "rawvideo",
        "-i", $padInputPattern, "-frames:v", $framesToUpscale.Count.ToString([Globalization.CultureInfo]::InvariantCulture),
        "-vf", $(if ($frameGenerationHeight -eq $paddedHeight) { "format=rgba" } else { "pad=${renderWidth}:${paddedHeight}:0:${paddingY}:color=black,format=rgba" }),
        "-f", "image2", "-vcodec", "rawvideo", $paddedPattern
    )
    $null = Invoke-Checked -FilePath $resolvedFfmpeg -Arguments $padArgs -Label "16:9 source padding"
    $padTimer.Stop()
    $stageTimes.pad_to_16_9_ms = $padTimer.Elapsed.TotalMilliseconds

    $paddedFrames = @(Get-ChildItem -LiteralPath $paddedDirectory -Filter "frame-*.rgba" | Sort-Object Name)
    $upscaleTimer = [Diagnostics.Stopwatch]::StartNew()

    foreach ($frame in $paddedFrames) {
        $upscaledPath = Join-Path $upscaledDirectory $frame.Name
        & $resolvedUpscale $frame.FullName $upscaledPath 1 $outputFrameTimeArg 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $upscaledPath -PathType Leaf)) {
            Remove-Item -LiteralPath $upscaledPath -Force -ErrorAction SilentlyContinue
            & $resolvedUpscale $frame.FullName $upscaledPath 1 2>&1 | Out-Null
        }

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $upscaledPath -PathType Leaf)) {
            throw "FSR ML upscaling failed for $($frame.Name)."
        }
    }

    $upscaleTimer.Stop()
    $stageTimes.fsr_upscale_ms = $upscaleTimer.Elapsed.TotalMilliseconds

    $upscaledPattern = Join-Path $upscaledDirectory "frame-%04d.rgba"
    $inputArgs = @(
        "-y", "-hide_banner", "-loglevel", "error",
        "-f", "image2", "-framerate", $targetFps.ToString([Globalization.CultureInfo]::InvariantCulture),
        "-video_size", "${outputWidth}x${outputHeight}", "-pixel_format", "rgba", "-vcodec", "rawvideo",
        "-i", $upscaledPattern, "-frames:v", $paddedFrames.Count.ToString([Globalization.CultureInfo]::InvariantCulture), "-an"
    )
    $amfArgs = $inputArgs + @(
        "-c:v", "h264_amf", "-usage", "transcoding", "-quality", "quality", "-rc", "cqp",
        "-qp_i", "18", "-qp_p", "20", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", $resolvedOutput
    )
    $cpuArgs = $inputArgs + @(
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", $resolvedOutput
    )

    $encodeTimer = [Diagnostics.Stopwatch]::StartNew()
    $selectedEncoder = "libx264"
    $encoded = $false

    if ($Encoder -ne "cpu") {
        & $resolvedFfmpeg @amfArgs 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $resolvedOutput -PathType Leaf)) {
            $selectedEncoder = "h264_amf"
            $encoded = $true
        }
        elseif ($Encoder -eq "amf") {
            throw "AMD AMF encoding was required but failed."
        }
    }

    if (-not $encoded) {
        & $resolvedFfmpeg @cpuArgs 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $resolvedOutput -PathType Leaf)) {
            throw "CPU H.264 fallback encoding failed."
        }
    }

    $encodeTimer.Stop()
    $stageTimes.encode_ms = $encodeTimer.Elapsed.TotalMilliseconds
    $totalTimer.Stop()

    [ordered]@{
        ok = $true
        output = $resolvedOutput
        source_frames = $sourceFrames.Count
        output_frames = $paddedFrames.Count
        scene_cuts = @($sceneCutFrames | Sort-Object)
        width = $outputWidth
        height = $outputHeight
        fps = $targetFps
        encoder = $selectedEncoder
        stage_times_ms = $stageTimes
        total_ms = $totalTimer.Elapsed.TotalMilliseconds
    } | ConvertTo-Json -Depth 5
}
finally {
    $resolvedWorkDirectory = [IO.Path]::GetFullPath($workDirectory)

    if ($resolvedWorkDirectory.StartsWith($workRoot, [StringComparison]::OrdinalIgnoreCase) -and
        $resolvedWorkDirectory -ne $workRoot -and
        (Test-Path -LiteralPath $resolvedWorkDirectory -PathType Container)) {
        Remove-Item -LiteralPath $resolvedWorkDirectory -Recurse -Force
    }
}
