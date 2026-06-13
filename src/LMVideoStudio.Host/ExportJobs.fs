namespace LMVideoStudio.Host

open System
open System.IO
open System.Threading
open System.Threading.Tasks
open LMVideoStudio.Domain

module ExportJobs =
    let PreviewRelativePath = "renders/mockup/preview.mp4"
    let BakeRelativePath = "renders/bake/final.mp4"

    type ExportJobState =
        { Gate: SemaphoreSlim
          mutable ActiveCts: CancellationTokenSource option
          mutable ActiveJobId: Guid option }

        member this.CancelActive() =
            FfmpegExport.killActiveProcess()

            match this.ActiveCts with
            | Some cts ->
                try
                    cts.Cancel()
                with _ ->
                    ()
            | None -> ()

            this.ActiveJobId <- None

        member this.BeginJob(jobId: Guid) =
            let cts = new CancellationTokenSource()
            this.ActiveCts <- Some cts
            this.ActiveJobId <- Some jobId
            cts

        member this.EndJob(cts: CancellationTokenSource) =
            if this.ActiveCts = Some cts then
                this.ActiveCts <- None
                this.ActiveJobId <- None

            try
                cts.Dispose()
            with _ ->
                ()

    type MockupPreviewService(store: ProjectStore.ProjectStore, events: JobEventHub, repoRoot: string) =
        /// One mockup stitch at a time — each block spawns FFmpeg (CPU libx264); overlap spikes CPU.
        let jobState = { Gate = new SemaphoreSlim(1, 1); ActiveCts = None; ActiveJobId = None }
        let publishProgress
            jobId
            step
            message
            status
            (progress: float option)
            (stepIndex: int option)
            (stepTotal: int option)
            =
            events.Publish(
                { JobEvent.create jobId JobPhase.MockupPreview step message status with
                    Progress = progress
                    StepIndex = stepIndex
                    StepTotal = stepTotal }
            )

        let cancelRunning () =
            let cancelledJobId = jobState.ActiveJobId
            jobState.CancelActive()

            cancelledJobId
            |> Option.iter (fun id ->
                publishProgress id "cancelled" "Mockup preview cancelled" JobStatus.Cancelled None None None)

        let runPreviewBody jobId projectId (ct: CancellationToken) =
            if ct.IsCancellationRequested then
                publishProgress jobId "cancelled" "Mockup preview cancelled" JobStatus.Cancelled None None None
            else
            match store.Load projectId with
            | Error err ->
                publishProgress jobId "load" err JobStatus.Failed None None None
            | Ok project ->
                let blocks =
                    project.Blocks
                    |> List.sortBy (fun b -> b.Order)
                    |> List.filter (fun b ->
                        b.ThumbnailPath
                        |> Option.map (fun _ -> true)
                        |> Option.defaultValue false)

                if List.isEmpty blocks then
                    let msg = "No blocks with thumbnails — import or generate images first"
                    publishProgress jobId "blocks" msg JobStatus.Failed None None None
                else
                    let profile = project.RenderDefaults.Mockup
                    let folder = store.ProjectFolder projectId
                    let mockupDir = Path.Combine(folder, "renders", "mockup")
                    let tmpDir = Path.Combine(mockupDir, "_tmp", jobId.ToString("N"))
                    Directory.CreateDirectory tmpDir |> ignore

                    let total = blocks.Length

                    publishProgress
                        jobId
                        "start"
                        $"Stitching {total} blocks at {profile.Width}p (CPU FFmpeg libx264)…"
                        JobStatus.Running
                        None
                        (Some 0)
                        (Some total)

                    let clipResults =
                        blocks
                        |> List.mapi (fun i block ->
                            if ct.IsCancellationRequested then
                                Error "Mockup preview cancelled"
                            else
                            let rel = block.ThumbnailPath.Value
                            let input = Path.Combine(folder, rel.Replace('/', Path.DirectorySeparatorChar))

                            if not (File.Exists input) then
                                Error $"Thumbnail missing: {rel}"
                            else
                                let duration = Project.effectiveMockupDuration project block
                                let clipPath = Path.Combine(tmpDir, $"block_{i:D3}.mp4")

                                let opts: FfmpegExport.KenBurnsOptions =
                                    { InputPath = input
                                      OutputPath = clipPath
                                      Width = profile.Width
                                      Height = profile.Height
                                      Fps = FfmpegExport.MockupFps
                                      DurationSec = duration
                                      ZoomStart = 1.0
                                      ZoomEnd = 1.15 }

                                publishProgress
                                    jobId
                                    $"block_{i + 1}"
                                    $"Ken Burns clip {i + 1}/{total} (CPU FFmpeg)…"
                                    JobStatus.Running
                                    (Some(float (i + 1) / float total))
                                    (Some i)
                                    (Some total)

                                let runOpts =
                                    { FfmpegExport.defaultRunOptions with
                                        TimeoutMs = FfmpegExport.MockupClipTimeoutMs
                                        CancellationToken = ct }

                                let kbResult = FfmpegExport.runKenBurnsMockup repoRoot opts (Some runOpts)

                                if ct.IsCancellationRequested then Error "Mockup preview cancelled"
                                elif kbResult.Success then Ok(clipPath, duration, block)
                                else Error kbResult.Message)

                    let errors = clipResults |> List.choose (function Error e -> Some e | _ -> None)

                    if ct.IsCancellationRequested then
                        publishProgress jobId "cancelled" "Mockup preview cancelled" JobStatus.Cancelled None None None
                    elif not (List.isEmpty errors) then
                        let msg = String.Join("; ", errors)
                        publishProgress jobId "ffmpeg" msg JobStatus.Failed None None None
                    else
                        let clipData =
                            clipResults
                            |> List.map (function Ok t -> t | _ -> failwith "unreachable")

                        let segments =
                            clipData
                            |> List.mapi (fun i (path, duration, block) ->
                                let crossfadeMs =
                                    block.Transitions
                                    |> Option.bind (fun t -> t.ToNext)
                                    |> Option.orElse (
                                        project.TransitionsDefault
                                        |> Option.bind (fun t -> t.ToNext)
                                    )
                                    |> Option.bind (fun edge ->
                                        if edge.Type = Crossfade then Some edge.DurationMs else None)

                                { Path = path
                                  DurationSec = duration
                                  CrossfadeOutMs =
                                      if i < clipData.Length - 1 then crossfadeMs else None }
                                : FfmpegExport.ClipSegment)

                        let outputPath =
                            Path.Combine(folder, PreviewRelativePath.Replace('/', Path.DirectorySeparatorChar))

                        publishProgress
                            jobId
                            "concat"
                            "Concatenating mockup preview…"
                            JobStatus.Running
                            (Some 0.95)
                            (Some (total - 1))
                            (Some total)

                        if ct.IsCancellationRequested then
                            publishProgress jobId "cancelled" "Mockup preview cancelled" JobStatus.Cancelled None None None
                        else
                        match FfmpegExport.concatSegments repoRoot segments outputPath None with
                        | Error err -> publishProgress jobId "concat" err JobStatus.Failed None None None
                        | Ok _ ->
                            try
                                if Directory.Exists tmpDir then
                                    Directory.Delete(tmpDir, true)
                            with _ ->
                                ()

                            publishProgress
                                jobId
                                "done"
                                "Mockup preview ready"
                                JobStatus.Completed
                                (Some 1.0)
                                (Some total)
                                (Some total)

        member _.CancelActive() = cancelRunning()

        member _.StartPreview(projectId: Guid) =
            let jobId = Guid.NewGuid()
            cancelRunning()

            Task.Run(fun () ->
                let gateTaken = ref false
                let mutable activeCts: CancellationTokenSource option = None

                try
                    if not (jobState.Gate.Wait 60_000) then
                        publishProgress
                            jobId
                            "queued"
                            "Mockup preview already running — wait for CPU FFmpeg stitch to finish"
                            JobStatus.Failed
                            None
                            None
                            None
                    else
                        gateTaken := true
                        let cts = jobState.BeginJob jobId
                        activeCts <- Some cts

                        if cts.Token.IsCancellationRequested then
                            publishProgress jobId "cancelled" "Mockup preview cancelled" JobStatus.Cancelled None None None
                        else
                            publishProgress
                                jobId
                                "queued"
                                "Mockup preview queued (CPU FFmpeg — not GPU)"
                                JobStatus.Running
                                None
                                None
                                None

                            runPreviewBody jobId projectId cts.Token
                finally
                    activeCts |> Option.iter jobState.EndJob

                    if !gateTaken then
                        jobState.Gate.Release() |> ignore)
            |> ignore

            jobId

    type BakeJobService(store: ProjectStore.ProjectStore, events: JobEventHub, repoRoot: string, worker: PythonWorkerProvider.PythonWorkerProvider, gpu: GpuQueueService) =
        /// Bake also stitches via CPU FFmpeg; upscale steps use GPU worker when enabled.
        let jobState = { Gate = new SemaphoreSlim(1, 1); ActiveCts = None; ActiveJobId = None }
        let publishProgress jobId step message status progress stepIndex stepTotal =
            events.Publish(
                { JobEvent.create jobId JobPhase.Bake step message status with
                    Progress = progress
                    StepIndex = stepIndex
                    StepTotal = stepTotal }
            )

        let cancelRunning () =
            let cancelledJobId = jobState.ActiveJobId
            jobState.CancelActive()

            cancelledJobId
            |> Option.iter (fun id -> publishProgress id "cancelled" "Bake cancelled" JobStatus.Cancelled None None None)

        let needsUpscale (profile: RenderProfile) (block: StoryboardBlock) =
            profile.Upscale <> NoUpscale
            && (Project.preferBakeImagePath block
                |> Option.bind (fun p ->
                    if p.Contains("upscaled", StringComparison.OrdinalIgnoreCase) then Some ()
                    else None)
                |> Option.isNone)

        let upscaleBlock projectId (block: StoryboardBlock) =
            let folder = store.ProjectFolder projectId
            let thumbRel = block.ThumbnailPath |> Option.defaultValue ""
            let thumbPath = Path.Combine(folder, thumbRel.Replace('/', Path.DirectorySeparatorChar))

            if not (File.Exists thumbPath) then
                Error $"Thumbnail missing for upscale: {thumbRel}"
            else
                let bytes = File.ReadAllBytes thumbPath
                let b64 = Convert.ToBase64String bytes
                let upscaleResult =
                    gpu.RunJob(GpuJobKind.ImageUpscale, fun () -> worker.UpscaleImage b64).GetAwaiter().GetResult()

                match upscaleResult with
                | Error err -> Error err
                | Ok result ->
                    let outBytes = Convert.FromBase64String result.ImageBase64
                    let assetsDir = Path.Combine(folder, "assets")
                    Directory.CreateDirectory assetsDir |> ignore
                    let fileName = $"upscaled_{block.Id:N}_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.png"
                    let dest = Path.Combine(assetsDir, fileName)
                    File.WriteAllBytes(dest, outBytes)
                    let relPath = $"assets/{fileName}"

                    match store.Load projectId with
                    | Error err -> Error err
                    | Ok project ->
                        let updatedBlock =
                            { block with
                                Artifacts =
                                    Some
                                        { MockupVideoPath = block.Artifacts |> Option.bind (fun a -> a.MockupVideoPath)
                                          BakeVideoPath = block.Artifacts |> Option.bind (fun a -> a.BakeVideoPath)
                                          UpscaledImagePath = Some relPath } }

                        let updatedProject =
                            { project with
                                Blocks =
                                    project.Blocks
                                    |> List.map (fun b -> if b.Id = block.Id then updatedBlock else b) }
                            |> Project.touch

                        match store.Save updatedProject with
                        | Error err -> Error err
                        | Ok () -> Ok updatedBlock

        let runBakeBody jobId projectId (ct: CancellationToken) =
            if ct.IsCancellationRequested then
                publishProgress jobId "cancelled" "Bake cancelled" JobStatus.Cancelled None None None
            else
            match store.Load projectId with
            | Error err -> publishProgress jobId "load" err JobStatus.Failed None None None
            | Ok project ->
                match Validation.validateProject project with
                | Invalid issues ->
                    let msg =
                        issues
                        |> List.map (fun i -> $"{i.Path}: {i.Message}")
                        |> String.concat "; "

                    publishProgress jobId "validate" msg JobStatus.Failed None None None
                | Valid ->
                    let blocks =
                        project.Blocks
                        |> List.sortBy (fun b -> b.Order)
                        |> List.filter (fun b ->
                            b.ThumbnailPath
                            |> Option.map (fun _ -> true)
                            |> Option.defaultValue false)

                    if List.isEmpty blocks then
                        publishProgress jobId "blocks" "No blocks with thumbnails for bake" JobStatus.Failed None None None
                    else
                        let profile = project.RenderDefaults.Bake
                        let folder = store.ProjectFolder projectId
                        let bakeDir = Path.Combine(folder, "renders", "bake")
                        let tmpDir = Path.Combine(bakeDir, "_tmp", jobId.ToString("N"))
                        Directory.CreateDirectory tmpDir |> ignore
                        let total = blocks.Length

                        publishProgress
                            jobId
                            "start"
                            $"Baking {total} blocks at {profile.Width}x{profile.Height} (CPU FFmpeg libx264)…"
                            JobStatus.Running
                            None
                            (Some 0)
                            (Some total)

                        let mutable bakeBlocks = blocks
                        let upscaleTargets = blocks |> List.filter (needsUpscale profile)

                        if not (List.isEmpty upscaleTargets) then
                            publishProgress jobId "upscale" $"Upscaling {upscaleTargets.Length} block(s) (GPU worker)…" JobStatus.Running None None None

                            let upscaleErrors =
                                upscaleTargets
                                |> List.choose (fun block ->
                                    match upscaleBlock projectId block with
                                    | Error err -> Some err
                                    | Ok updated ->
                                        bakeBlocks <-
                                            bakeBlocks
                                            |> List.map (fun b -> if b.Id = updated.Id then updated else b)

                                        None)

                            if not (List.isEmpty upscaleErrors) then
                                publishProgress jobId "upscale" (String.Join("; ", upscaleErrors)) JobStatus.Failed None None None
                                bakeBlocks <- []

                        if not (List.isEmpty bakeBlocks) then
                            let clipResults =
                                bakeBlocks
                                |> List.mapi (fun i block ->
                                    if ct.IsCancellationRequested then
                                        Error "Bake cancelled"
                                    else
                                    let rel =
                                        Project.preferBakeImagePath block
                                        |> Option.defaultWith (fun () -> block.ThumbnailPath.Value)

                                    let input = Path.Combine(folder, rel.Replace('/', Path.DirectorySeparatorChar))

                                    if not (File.Exists input) then
                                        Error $"Thumbnail missing: {rel}"
                                    else
                                        let duration =
                                            block.BakeDurationSec
                                            |> Option.orElse block.MockupDurationSec
                                            |> Option.defaultValue (Project.effectiveMockupDuration project block)

                                        let clipPath = Path.Combine(tmpDir, $"block_{i:D3}.mp4")

                                        let opts: FfmpegExport.KenBurnsOptions =
                                            { InputPath = input
                                              OutputPath = clipPath
                                              Width = profile.Width
                                              Height = profile.Height
                                              Fps = FfmpegExport.MockupFps
                                              DurationSec = duration
                                              ZoomStart = 1.0
                                              ZoomEnd = 1.2 }

                                        publishProgress
                                            jobId
                                            $"block_{i + 1}"
                                            $"Bake clip {i + 1}/{total} (CPU FFmpeg)…"
                                            JobStatus.Running
                                            (Some(float (i + 1) / float total))
                                            (Some i)
                                            (Some total)

                                        let runOpts =
                                            { FfmpegExport.defaultRunOptions with
                                                TimeoutMs = FfmpegExport.MockupClipTimeoutMs
                                                CancellationToken = ct }

                                        let kbResult = FfmpegExport.runKenBurnsMockup repoRoot opts (Some runOpts)

                                        if kbResult.Success then Ok(clipPath, duration, block)
                                        else Error kbResult.Message)

                            let errors = clipResults |> List.choose (function Error e -> Some e | _ -> None)

                            if ct.IsCancellationRequested then
                                publishProgress jobId "cancelled" "Bake cancelled" JobStatus.Cancelled None None None
                            elif not (List.isEmpty errors) then
                                publishProgress jobId "ffmpeg" (String.Join("; ", errors)) JobStatus.Failed None None None
                            else
                                let clipData =
                                    clipResults
                                    |> List.map (function Ok t -> t | _ -> failwith "unreachable")

                                let segments =
                                    clipData
                                    |> List.mapi (fun i (path, duration, block) ->
                                        let crossfadeMs =
                                            block.Transitions
                                            |> Option.bind (fun t -> t.ToNext)
                                            |> Option.orElse (
                                                project.TransitionsDefault
                                                |> Option.bind (fun t -> t.ToNext)
                                            )
                                            |> Option.bind (fun edge ->
                                                if edge.Type = Crossfade then Some edge.DurationMs else None)

                                        { Path = path
                                          DurationSec = duration
                                          CrossfadeOutMs =
                                              if i < clipData.Length - 1 then crossfadeMs else None }
                                        : FfmpegExport.ClipSegment)

                                let outputPath =
                                    Path.Combine(folder, BakeRelativePath.Replace('/', Path.DirectorySeparatorChar))

                                publishProgress
                                    jobId
                                    "concat"
                                    "Concatenating final bake MP4…"
                                    JobStatus.Running
                                    (Some 0.95)
                                    (Some (total - 1))
                                    (Some total)

                                if ct.IsCancellationRequested then
                                    publishProgress jobId "cancelled" "Bake cancelled" JobStatus.Cancelled None None None
                                else
                                match FfmpegExport.concatSegments repoRoot segments outputPath None with
                                | Error err -> publishProgress jobId "concat" err JobStatus.Failed None None None
                                | Ok _ ->
                                    try
                                        if Directory.Exists tmpDir then
                                            Directory.Delete(tmpDir, true)
                                    with _ ->
                                        ()

                                    publishProgress
                                        jobId
                                        "done"
                                        "Bake export ready"
                                        JobStatus.Completed
                                        (Some 1.0)
                                        (Some total)
                                        (Some total)

        member _.CancelActive() = cancelRunning()

        member _.StartBake(projectId: Guid) =
            let jobId = Guid.NewGuid()
            cancelRunning()
            let cts = jobState.BeginJob jobId

            Task.Run(fun () ->
                let gateTaken = ref false

                try
                    if cts.Token.IsCancellationRequested then
                        publishProgress jobId "cancelled" "Bake cancelled" JobStatus.Cancelled None None None
                    elif not (jobState.Gate.Wait 60_000) then
                        publishProgress
                            jobId
                            "queued"
                            "Bake already running — wait for CPU FFmpeg stitch to finish"
                            JobStatus.Failed
                            None
                            None
                            None
                    else
                        gateTaken := true

                        if cts.Token.IsCancellationRequested then
                            publishProgress jobId "cancelled" "Bake cancelled" JobStatus.Cancelled None None None
                        else
                            publishProgress
                                jobId
                                "queued"
                                "Bake job queued (CPU FFmpeg stitch; upscale uses GPU worker)"
                                JobStatus.Running
                                None
                                None
                                None

                            runBakeBody jobId projectId cts.Token
                finally
                    jobState.EndJob cts

                    if !gateTaken then
                        jobState.Gate.Release() |> ignore)
            |> ignore

            jobId
