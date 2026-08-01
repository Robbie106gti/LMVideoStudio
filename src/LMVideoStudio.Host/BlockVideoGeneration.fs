namespace LMVideoStudio.Host

open System
open System.IO
open LMVideoStudio.Domain

module BlockVideoGeneration =
    type GenerateVideoOptions =
        { Prompt: string option
          Width: int
          Height: int
          Frames: int
          Fps: int
          Steps: int
          Seed: int }

    type GenerateVideoOutput =
        { JobId: Guid
          VideoPath: string
          Project: Project }

    type BlockVideoGenerationService
        (
            store: ProjectStore.ProjectStore,
            provider: SdCppVideoProvider.SdCppVideoProvider,
            gpu: GpuQueueService,
            events: JobEventHub,
            enabled: bool
        ) =

        member _.Generate(projectId: Guid, blockId: Guid, options: GenerateVideoOptions) =
            task {
                if not enabled then
                    return Error "AI video generation is disabled. Set LMVS_VIDEO_PROVIDER=sdcpp and start the qualified loopback Wan service."
                elif options.Width <= 0 || options.Height <= 0 || options.Fps <= 0 || options.Steps < 0 then
                    return Error "Video width, height, and fps must be positive; steps must be zero (automatic) or positive"
                else
                    match store.Load projectId with
                    | Error error -> return Error error
                    | Ok project ->
                        match project.Blocks |> List.tryFind (fun block -> block.Id = blockId) with
                        | None -> return Error $"Block not found: {blockId}"
                        | Some block ->
                            let prompt =
                                options.Prompt
                                |> Option.filter (not << String.IsNullOrWhiteSpace)
                                |> Option.orElse block.ImagePrompt
                                |> Option.orElse block.Title
                                |> Option.defaultValue "cinematic scene, subtle natural motion"

                            let initImage =
                                block.ThumbnailPath
                                |> Option.bind (fun relative ->
                                    let path = Path.Combine(store.ProjectFolder projectId, relative.Replace('/', Path.DirectorySeparatorChar))
                                    if File.Exists path then Some(Convert.ToBase64String(File.ReadAllBytes path)) else None)

                            let jobId = Guid.NewGuid()
                            events.Publish(JobEvent.create jobId JobPhase.VideoGenerate "start" "Generating Wan video…" JobStatus.Running)

                            let! generated =
                                gpu.RunJob(
                                    GpuJobKind.VideoGenerate,
                                    fun () ->
                                        provider.Generate(
                                            { Prompt = prompt
                                              Width = options.Width
                                              Height = options.Height
                                              Frames = options.Frames
                                              Fps = options.Fps
                                              Steps = options.Steps
                                              Seed = options.Seed
                                              InitImageBase64 = initImage }
                                        )
                                )

                            match generated with
                            | Error error ->
                                events.Publish(JobEvent.create jobId JobPhase.VideoGenerate "failed" error JobStatus.Failed)
                                return Error error
                            | Ok result ->
                                try
                                    let relative = $"assets/video/gen_{blockId:N}_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.webm"
                                    let destination = Path.Combine(store.ProjectFolder projectId, relative.Replace('/', Path.DirectorySeparatorChar))
                                    Directory.CreateDirectory(Path.GetDirectoryName destination) |> ignore
                                    File.WriteAllBytes(destination, Convert.FromBase64String result.VideoBase64)

                                    let updated =
                                        store.UpdateBlock(
                                            projectId,
                                            blockId,
                                            fun current ->
                                                let artifacts =
                                                    current.Artifacts
                                                    |> Option.defaultValue
                                                        { MockupVideoPath = None
                                                          BakeVideoPath = None
                                                          UpscaledImagePath = None }

                                                { current with Artifacts = Some { artifacts with BakeVideoPath = Some relative } }
                                        )

                                    match updated with
                                    | Error error -> return Error error
                                    | Ok saved ->
                                        events.Publish(JobEvent.create jobId JobPhase.VideoGenerate "completed" "Wan video generated" JobStatus.Completed)
                                        return Ok { JobId = jobId; VideoPath = relative; Project = saved }
                                with ex ->
                                    events.Publish(JobEvent.create jobId JobPhase.VideoGenerate "save" ex.Message JobStatus.Failed)
                                    return Error ex.Message
            }
