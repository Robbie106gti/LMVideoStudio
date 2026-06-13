namespace LMVideoStudio.Host

open System
open System.Diagnostics
open System.IO
open System.Globalization

/// FFprobe / FFmpeg helpers for audio duration and logo color extraction.
module MediaProbe =
    /// Test hook: bypass FFmpeg color extraction when set.
    let mutable colorExtractHook: (string -> int -> Result<string list, string>) option = None

    /// Test hook: bypass FFprobe audio duration probing when set.
    let mutable audioProbeHook: (string -> Result<float, string>) option = None

    let private inv = CultureInfo.InvariantCulture

    let private findFfprobe (repoRoot: string) =
        let candidates =
            [ Path.Combine(repoRoot, "sidecars", "lmvs_worker", "bin", "ffprobe.exe")
              Path.Combine(repoRoot, "spike", "bin", "ffprobe.exe")
              "ffprobe.exe" ]

        candidates
        |> List.tryFind (fun p ->
            if Path.IsPathRooted p then File.Exists p
            else
                try
                    let psi = ProcessStartInfo("where", p)
                    psi.RedirectStandardOutput <- true
                    psi.UseShellExecute <- false
                    use proc = Process.Start psi
                    proc.WaitForExit 2000
                    proc.ExitCode = 0
                with _ ->
                    false)

    let private runProcess (exe: string) (args: string list) =
        let psi = ProcessStartInfo()
        psi.FileName <- exe
        psi.Arguments <- args |> String.concat " "
        psi.RedirectStandardError <- true
        psi.RedirectStandardOutput <- true
        psi.UseShellExecute <- false
        psi.CreateNoWindow <- true

        use proc = Process.Start psi
        let stdout = proc.StandardOutput.ReadToEnd().Trim()
        let stderr = proc.StandardError.ReadToEnd().Trim()
        proc.WaitForExit()
        proc.ExitCode, stdout, stderr

    let probeAudioDurationSec (repoRoot: string) (audioPath: string) =
        match audioProbeHook with
        | Some hook -> hook audioPath
        | None ->
            match findFfprobe repoRoot with
            | None -> Error "FFprobe not found"
            | Some ffprobe ->
                let args =
                    [ "-v"; "error"
                      "-show_entries"; "format=duration"
                      "-of"; "default=noprint_wrappers=1:nokey=1"
                      audioPath ]

                let code, stdout, stderr =
                    runProcess ffprobe args

                if code <> 0 then
                    Error(if String.IsNullOrWhiteSpace stderr then stdout else stderr)
                else
                    match Double.TryParse(stdout, NumberStyles.Float, inv) with
                    | true, value when value > 0.0 -> Ok value
                    | _ -> Error $"Could not parse audio duration from: {stdout}"

    let private toHex (r: int) (g: int) (b: int) =
        $"#{r:X2}{g:X2}{b:X2}"

    let extractDominantColors (repoRoot: string) (imagePath: string) (maxColors: int) =
        match colorExtractHook with
        | Some hook -> hook imagePath maxColors
        | None ->
            match FfmpegExport.findFfmpegForBootstrap repoRoot with
            | None -> Error "FFmpeg not found"
            | Some ffmpeg ->
                let args =
                    [ "-nostdin"
                      "-i"; imagePath
                      "-vf"; "scale=8:8:flags=area"
                      "-frames:v"; "1"
                      "-f"; "rawvideo"
                      "-pix_fmt"; "rgb24"
                      "pipe:1" ]

                let psi = ProcessStartInfo()
                psi.FileName <- ffmpeg
                psi.Arguments <- args |> String.concat " "
                psi.RedirectStandardOutput <- true
                psi.RedirectStandardError <- true
                psi.UseShellExecute <- false
                psi.CreateNoWindow <- true

                let procResult =
                    try
                        Ok(Process.Start psi)
                    with ex ->
                        Error ex.Message

                match procResult with
                | Error err -> Error err
                | Ok proc ->
                    use proc = proc
                    use ms = new MemoryStream()

                    let rec pump () =
                        let chunk = Array.zeroCreate<byte> 4096
                        let read = proc.StandardOutput.BaseStream.Read(chunk, 0, chunk.Length)

                        if read > 0 then
                            ms.Write(chunk, 0, read)
                            pump ()

                    pump ()
                    proc.WaitForExit()

                    if proc.ExitCode <> 0 then
                        let err = proc.StandardError.ReadToEnd()
                        Error(if String.IsNullOrWhiteSpace err then "FFmpeg color extract failed" else err)
                    else
                        let bytes = ms.ToArray()

                        if bytes.Length < 3 then
                            Error "No pixel data from logo"
                        else
                            let buckets = System.Collections.Generic.Dictionary<string, int>()

                            let step = 3

                            for i in 0 .. step .. (bytes.Length - 3) do
                                let r = int bytes.[i]
                                let g = int bytes.[i + 1]
                                let b = int bytes.[i + 2]
                                // Quantize to reduce near-duplicates
                                let qr = (r / 16) * 16
                                let qg = (g / 16) * 16
                                let qb = (b / 16) * 16
                                let key = toHex qr qg qb

                                match buckets.TryGetValue key with
                                | true, count -> buckets.[key] <- count + 1
                                | _ -> buckets.[key] <- 1

                            let colors =
                                buckets
                                |> Seq.sortByDescending (fun kv -> kv.Value)
                                |> Seq.take (max 1 maxColors)
                                |> Seq.map (fun kv -> kv.Key)
                                |> Seq.toList

                            Ok colors
