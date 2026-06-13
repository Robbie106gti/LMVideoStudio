namespace LMVideoStudio.Host

open System
open System.Diagnostics
open System.IO
open System.Text
open System.Threading
open System.Threading.Tasks

/// FFmpeg Ken Burns helper — spike-validated: scale before zoompan, -nostdin.
module FfmpegExport =
    /// Mockup preview frame rate; keep in sync with ExportJobs mockup stitch.
    [<Literal>]
    let MockupFps = 25

    /// Per-clip Ken Burns timeout (mockup/bake zoompan).
    [<Literal>]
    let MockupClipTimeoutMs = 120_000

    /// Concat / crossfade stitch timeout.
    [<Literal>]
    let ConcatTimeoutMs = 300_000

    type FfmpegRunOptions =
        { TimeoutMs: int
          CancellationToken: CancellationToken }

    let defaultRunOptions =
        { TimeoutMs = MockupClipTimeoutMs
          CancellationToken = CancellationToken.None }

    let private processLock = obj ()
    let private trackedProcesses = ResizeArray<Process>()

    /// Test hook: override resolved ffmpeg executable (e.g. `ping` for timeout tests).
    let mutable findFfmpegOverride: string option = None

    /// Test hook: invoked when safeKill runs on a tracked process.
    let mutable processKillHook: (Process -> unit) option = None

    /// Test hook: invoked after killAllActive clears the registry.
    let mutable killAllActiveHook: (unit -> unit) option = None

    let trackedProcessCount () = lock processLock (fun () -> trackedProcesses.Count)

    let private tryHasExited (proc: Process) =
        try
            proc.HasExited
        with :? InvalidOperationException ->
            true

    let private safeKill (proc: Process) =
        processKillHook |> Option.iter (fun hook -> hook proc)

        try
            if not proc.HasExited then
                proc.Kill(true)
        with
        | :? InvalidOperationException -> ()
        | _ -> ()

        try
            proc.WaitForExit 5000 |> ignore
        with _ ->
            ()

        try
            proc.Dispose()
        with _ ->
            ()

    let private unregister (proc: Process) =
        lock processLock (fun () ->
            trackedProcesses.RemoveAll(fun p -> Object.ReferenceEquals(p, proc)) |> ignore)

    let private register (proc: Process) =
        lock processLock (fun () -> trackedProcesses.Add proc)

    /// Test helper: register an external process in the tracked registry.
    let registerActiveProcessForTests (proc: Process) = register proc

    /// Kill all tracked FFmpeg child processes (host shutdown / job cancel).
    let killAllActive () =
        lock processLock (fun () ->
            for proc in trackedProcesses do
                safeKill proc

            trackedProcesses.Clear())

        killAllActiveHook |> Option.iter (fun hook -> hook ())

    let killActiveProcess () = killAllActive ()

    let private findFfmpeg(repoRoot: string) =
        match findFfmpegOverride with
        | Some path -> Some path
        | None ->
            let candidates =
                [ Path.Combine(repoRoot, "sidecars", "lmvs_worker", "bin", "ffmpeg.exe")
                  Path.Combine(repoRoot, "spike", "bin", "ffmpeg.exe")
                  "ffmpeg.exe" ]

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

    let findFfmpegForBootstrap repoRoot = findFfmpeg repoRoot

    type KenBurnsOptions =
        { InputPath: string
          OutputPath: string
          Width: int
          Height: int
          Fps: int
          DurationSec: float
          ZoomStart: float
          ZoomEnd: float }

    let buildKenBurnsArgs (opts: KenBurnsOptions) =
        let inv = System.Globalization.CultureInfo.InvariantCulture
        // Round so zoompan d= and -frames:v match duration*fps exactly (avoids VFR drift).
        let frames = max 2 (int (Math.Round(opts.DurationSec * float opts.Fps)))
        let zoomStart = opts.ZoomStart.ToString(inv)
        let zoomRange = (opts.ZoomEnd - opts.ZoomStart).ToString(inv)
        let framesStr = frames.ToString(inv)
        let frameDenom = max 1 (frames - 1)
        let frameDenomStr = frameDenom.ToString(inv)

        // Linear zoom via output-frame index (on) — smoother than discrete zoom+increment steps.
        let filter =
            $"scale={opts.Width}:{opts.Height}:flags=lanczos,zoompan=z='{zoomStart}+({zoomRange})*on/({frameDenomStr})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={framesStr}:s={opts.Width}x{opts.Height}:fps={opts.Fps}"

        [ "-y"
          "-loop"; "1"
          "-i"; opts.InputPath
          "-vf"; filter
          "-frames:v"; framesStr
          "-c:v"; "libx264"
          "-preset"; "fast"
          "-pix_fmt"; "yuv420p"
          "-r"; opts.Fps.ToString(inv)
          "-vsync"; "cfr"
          "-nostdin"
          opts.OutputPath ]

    type ExportResult =
        { Success: bool
          OutputPath: string option
          Message: string
          Args: string list }

    /// Test hook: when set, bypasses real FFmpeg for Ken Burns clip generation.
    let mutable kenBurnsHook: (KenBurnsOptions -> CancellationToken -> ExportResult) option = None

    /// Test hook: when set, bypasses real FFmpeg for arbitrary invocations.
    let mutable ffmpegHook: (string list -> Result<string, string>) option = None

    /// Test hook: when set, replaces runProcess (timeout/kill registry tests).
    let mutable runProcessHook: (string -> string list -> FfmpegRunOptions -> int * string) option = None

    let private quoteArg (arg: string) =
        if arg.Contains(' ') || arg.Contains('"') then
            "\"" + arg.Replace("\"", "\\\"") + "\""
        else
            arg

    let private runProcess (ffmpeg: string) (args: string list) (runOpts: FfmpegRunOptions) =
        if runOpts.CancellationToken.IsCancellationRequested then
            -1, "FFmpeg cancelled"
        else
            let psi = ProcessStartInfo()
            psi.FileName <- ffmpeg
            psi.Arguments <- args |> List.map quoteArg |> String.concat " "
            psi.RedirectStandardError <- true
            psi.RedirectStandardOutput <- true
            psi.UseShellExecute <- false
            psi.CreateNoWindow <- true

            let proc = Process.Start psi
            register proc

            try
                let stderrTask = Task.Run(fun () -> proc.StandardError.ReadToEnd())
                let stdoutTask = Task.Run(fun () -> proc.StandardOutput.ReadToEnd())
                let deadline = DateTime.UtcNow.AddMilliseconds(float runOpts.TimeoutMs)
                let mutable timedOut = false
                let mutable cancelled = false

                while not (tryHasExited proc) && DateTime.UtcNow < deadline do
                    if runOpts.CancellationToken.IsCancellationRequested then
                        cancelled <- true
                        safeKill proc
                    else
                        (proc.WaitForExit 200) |> ignore

                if not (tryHasExited proc) then
                    if runOpts.CancellationToken.IsCancellationRequested then
                        cancelled <- true
                        safeKill proc
                    else
                        timedOut <- true
                        safeKill proc

                let stderr =
                    try
                        stderrTask.GetAwaiter().GetResult().Trim()
                    with _ ->
                        ""

                stdoutTask.GetAwaiter().GetResult() |> ignore

                if cancelled then
                    -1, "FFmpeg cancelled"
                elif timedOut then
                    -1, $"FFmpeg timed out after {runOpts.TimeoutMs}ms"
                else
                    try
                        proc.ExitCode, stderr
                    with :? InvalidOperationException ->
                        -1, stderr
            finally
                unregister proc

                try
                    if not (tryHasExited proc) then
                        safeKill proc

                    proc.Dispose()
                with _ ->
                    ()

    let runFfmpeg (repoRoot: string) (args: string list) (runOpts: FfmpegRunOptions option) =
        let opts = defaultArg runOpts defaultRunOptions

        match ffmpegHook with
        | Some hook -> hook args
        | None ->
            match findFfmpeg repoRoot with
            | None -> Error "FFmpeg not found — bundle via build-sidecars.ps1 or install on PATH"
            | Some ffmpeg ->
                let code, stderr =
                    match runProcessHook with
                    | Some hook -> hook ffmpeg args opts
                    | None -> runProcess ffmpeg args opts

                if code = 0 then Ok stderr
                else Error $"FFmpeg failed ({code}): {stderr}"

    let runKenBurnsMockup (repoRoot: string) (opts: KenBurnsOptions) (runOpts: FfmpegRunOptions option) =
        let ffmpegOpts =
            defaultArg runOpts
                { defaultRunOptions with
                    TimeoutMs = MockupClipTimeoutMs }

        if ffmpegOpts.CancellationToken.IsCancellationRequested then
            { Success = false
              OutputPath = None
              Message = "Ken Burns cancelled"
              Args = [] }
        else
        match kenBurnsHook with
        | Some hook ->
            let result = hook opts ffmpegOpts.CancellationToken

            if ffmpegOpts.CancellationToken.IsCancellationRequested && result.Success then
                { result with
                    Success = false
                    OutputPath = None
                    Message = "Ken Burns cancelled" }
            else
                result
        | None ->
            let args = buildKenBurnsArgs opts
            let outDir = Path.GetDirectoryName opts.OutputPath

            if not (String.IsNullOrEmpty outDir) then
                Directory.CreateDirectory outDir |> ignore

            match runFfmpeg repoRoot args (Some ffmpegOpts) with
            | Error err ->
                { Success = false
                  OutputPath = None
                  Message = err
                  Args = args }
            | Ok _ when File.Exists opts.OutputPath ->
                { Success = true
                  OutputPath = Some opts.OutputPath
                  Message = "Ken Burns mockup clip created"
                  Args = args }
            | Ok _ ->
                { Success = false
                  OutputPath = None
                  Message = "FFmpeg exited 0 but output file missing"
                  Args = args }

    type ClipSegment =
        { Path: string
          DurationSec: float
          CrossfadeOutMs: int option }

    let private concatClipsSimple (repoRoot: string) (clipPaths: string list) (outputPath: string) =
        if List.isEmpty clipPaths then
            Error "No clips to concat"
        elif clipPaths.Length = 1 then
            try
                File.Copy(clipPaths.[0], outputPath, true)
                Ok outputPath
            with ex ->
                Error ex.Message
        else
            let listPath = Path.Combine(Path.GetTempPath(), $"lmvs_concat_{Guid.NewGuid():N}.txt")

            try
                let lines =
                    clipPaths
                    |> List.map (fun p ->
                        let escaped = p.Replace("'", "'\\''")
                        "file '" + escaped + "'")
                    |> String.concat Environment.NewLine

                File.WriteAllText(listPath, lines)
                let outDir = Path.GetDirectoryName outputPath

                if not (String.IsNullOrEmpty outDir) then
                    Directory.CreateDirectory outDir |> ignore

                let args =
                    [ "-y"
                      "-nostdin"
                      "-f"; "concat"
                      "-safe"; "0"
                      "-i"; listPath
                      "-c:v"; "libx264"
                      "-preset"; "fast"
                      "-pix_fmt"; "yuv420p"
                      "-vsync"; "cfr"
                      "-r"; string MockupFps
                      outputPath ]

                let concatOpts =
                    { defaultRunOptions with
                        TimeoutMs = ConcatTimeoutMs }

                match runFfmpeg repoRoot args (Some concatOpts) with
                | Ok _ when File.Exists outputPath -> Ok outputPath
                | Ok _ -> Error "Concat finished but output file missing"
                | Error err -> Error err
            finally
                if File.Exists listPath then
                    File.Delete listPath |> ignore

    let private concatClipsWithCrossfade (repoRoot: string) (segments: ClipSegment list) (outputPath: string) =
        let inv = System.Globalization.CultureInfo.InvariantCulture
        let outDir = Path.GetDirectoryName outputPath

        if not (String.IsNullOrEmpty outDir) then
            Directory.CreateDirectory outDir |> ignore

        let crossfadeSec (s: ClipSegment) =
            s.CrossfadeOutMs
            |> Option.map (fun ms -> float ms / 1000.0)
            |> Option.defaultValue 0.0

        let mutable offset = 0.0
        let filterParts = ResizeArray<string>()
        let mutable prevLabel = "[0:v]"

        for i in 0 .. segments.Length - 2 do
            let seg = segments.[i]
            let fade = crossfadeSec seg
            let dur = if seg.DurationSec > 0.0 then seg.DurationSec else 3.5
            offset <- offset + dur - fade
            let nextInput = $"[{i + 1}:v]"
            let outLabel = if i = segments.Length - 2 then "[vout]" else $"[v{i}]"

            filterParts.Add(
                $"{prevLabel}{nextInput}xfade=transition=fade:duration={fade.ToString(inv)}:offset={offset.ToString(inv)}{outLabel}"
            )

            prevLabel <- outLabel

        let inputs =
            segments
            |> List.collect (fun s -> [ "-i"; s.Path ])
            |> List.toArray
            |> Array.toList

        let args =
            [ "-y"; "-nostdin" ]
            @ inputs
            @ [ "-filter_complex"; String.concat ";" (Seq.toList filterParts)
                "-map"; "[vout]"
                "-c:v"; "libx264"
                "-preset"; "fast"
                "-pix_fmt"; "yuv420p"
                "-vsync"; "cfr"
                "-r"; string MockupFps
                outputPath ]

        let concatOpts =
            { defaultRunOptions with
                TimeoutMs = ConcatTimeoutMs }

        match runFfmpeg repoRoot args (Some concatOpts) with
        | Ok _ when File.Exists outputPath -> Ok outputPath
        | Ok _ -> Error "Crossfade concat finished but output file missing"
        | Error err -> Error err

    let concatSegments (repoRoot: string) (segments: ClipSegment list) (outputPath: string) (runOpts: FfmpegRunOptions option) =
        let clipPaths = segments |> List.map (fun s -> s.Path)
        ignore runOpts

        if List.isEmpty clipPaths then
            Error "No clips to concat"
        elif clipPaths.Length = 1 then
            try
                File.Copy(clipPaths.[0], outputPath, true)
                Ok outputPath
            with ex ->
                Error ex.Message
        else
            let useCrossfade =
                segments
                |> List.take (segments.Length - 1)
                |> List.forall (fun s ->
                    s.CrossfadeOutMs
                    |> Option.map (fun ms -> ms > 0)
                    |> Option.defaultValue false)

            if not useCrossfade then
                concatClipsSimple repoRoot clipPaths outputPath
            else
                concatClipsWithCrossfade repoRoot segments outputPath

    let concatClips (repoRoot: string) (clipPaths: string list) (outputPath: string) =
        let segments =
            clipPaths
            |> List.map (fun p -> { Path = p; DurationSec = 0.0; CrossfadeOutMs = None })

        concatSegments repoRoot segments outputPath None
