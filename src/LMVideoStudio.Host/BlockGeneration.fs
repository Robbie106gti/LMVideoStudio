namespace LMVideoStudio.Host

open System
open System.IO
open System.Text.Json
open System.Threading.Tasks
open LMVideoStudio.Domain

module BlockGeneration =
    type GenerateBlockOptions =
        { Profile: RenderTier
          VariantCount: int
          PromptOverride: string option
          Seed: int option
          UpscaleAfterGenerate: bool }

    module GenerateBlockOptions =
        let mockupSingle =
            { Profile = RenderTier.Mockup
              VariantCount = 1
              PromptOverride = None
              Seed = None
              UpscaleAfterGenerate = false }

        let mockupVariants =
            { mockupSingle with VariantCount = 3 }

    type BlockGenerationService
        (
            store: ProjectStore.ProjectStore,
            worker: PythonWorkerProvider.PythonWorkerProvider,
            events: JobEventHub
        ) =
        let resolveProfile (project: Project) (tier: RenderTier) =
            match tier with
            | RenderTier.Mockup -> project.RenderDefaults.Mockup
            | RenderTier.Bake -> project.RenderDefaults.Bake

        let resolvePrompt (block: StoryboardBlock) (overridePrompt: string option) =
            match overridePrompt with
            | Some p when not (String.IsNullOrWhiteSpace p) -> p
            | _ ->
                match block.ImagePrompt with
                | Some p when not (String.IsNullOrWhiteSpace p) -> p
                | _ ->
                    block.Title
                    |> Option.defaultValue "storyboard frame, cinematic lighting, wide shot"

        let saveVariantImage projectId blockId variantIndex seed (result: PythonWorkerProvider.GenerateImageResult) =
            let bytes = Convert.FromBase64String result.ImageBase64
            let folder = store.ProjectFolder projectId
            let assetsDir = Path.Combine(folder, "assets")
            Directory.CreateDirectory assetsDir |> ignore

            let fileName =
                if variantIndex = 0 then
                    $"gen_{blockId:N}_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.png"
                else
                    $"gen_{blockId:N}_v{variantIndex}_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.png"

            let dest = Path.Combine(assetsDir, fileName)
            File.WriteAllBytes(dest, bytes)
            $"assets/{fileName}", seed

        member _.GenerateThumbnail(projectId: Guid, blockId: Guid, ?options: GenerateBlockOptions) =
            task {
                let opts = defaultArg options GenerateBlockOptions.mockupSingle
                let jobId = Guid.NewGuid()
                let phase =
                    if opts.Profile = RenderTier.Mockup then JobPhase.MockupPreview
                    else JobPhase.Bake

                events.Publish(
                    JobEvent.create jobId phase "start" "Generating thumbnail (GPU Python worker / ROCm)…" JobStatus.Running
                )

                if opts.Profile <> RenderTier.Mockup then
                    events.Publish(
                        JobEvent.create jobId phase "profile" "Bake profile not supported in Phase 2a" JobStatus.Failed
                    )

                    return Error "Only mockup profile generation is supported in Phase 2a"
                elif opts.VariantCount <> 1 && opts.VariantCount <> 3 then
                    events.Publish(
                        JobEvent.create jobId phase "variants" "variantCount must be 1 or 3" JobStatus.Failed
                    )

                    return Error "variantCount must be 1 or 3"
                else
                    match store.Load projectId with
                    | Error err ->
                        events.Publish(JobEvent.create jobId phase "load" err JobStatus.Failed)
                        return Error err
                    | Ok project ->
                        match project.Blocks |> List.tryFind (fun b -> b.Id = blockId) with
                        | None ->
                            let msg = $"Block not found: {blockId}"
                            events.Publish(JobEvent.create jobId phase "block" msg JobStatus.Failed)
                            return Error msg
                        | Some block ->
                            let! health = worker.HealthCheck()

                            if not health.Reachable then
                                let msg =
                                    health.Error
                                    |> Option.defaultValue "Python worker unreachable at :8765"

                                events.Publish(JobEvent.create jobId phase "worker" msg JobStatus.Failed)
                                return Error msg
                            else
                                let profile = resolveProfile project opts.Profile
                                let prompt = resolvePrompt block opts.PromptOverride
                                let baseSeed = opts.Seed |> Option.defaultValue (abs (blockId.GetHashCode() % 100000))

                                let rec generateLoop i acc =
                                    task {
                                        if i >= opts.VariantCount then
                                            return Ok acc
                                        else
                                            let seed = baseSeed + i

                                            events.Publish(
                                                JobEvent.create
                                                    jobId
                                                    JobPhase.ImageGenerate
                                                    $"variant_{i + 1}"
                                                    $"Generating variant {i + 1}/{opts.VariantCount}…"
                                                    JobStatus.Running
                                            )

                                            let! genResult =
                                                worker.GenerateForProfile(profile, prompt, seed = seed)

                                            match genResult with
                                            | Error err ->
                                                events.Publish(
                                                    JobEvent.create jobId JobPhase.ImageGenerate "failed" err JobStatus.Failed
                                                )

                                                return Error err
                                            | Ok result ->
                                                try
                                                    let relPath, _ = saveVariantImage projectId blockId i seed result
                                                    return! generateLoop (i + 1) (acc @ [ relPath ])
                                                with ex ->
                                                    let msg = ex.Message

                                                    events.Publish(
                                                        JobEvent.create jobId JobPhase.ImageGenerate "save" msg JobStatus.Failed
                                                    )

                                                    return Error msg
                                    }

                                let! pathsResult = generateLoop 0 []

                                match pathsResult with
                                | Error err -> return Error err
                                | Ok variantPaths ->
                                    let primaryPath = List.head variantPaths

                                    let! upscalePath =
                                        if opts.UpscaleAfterGenerate then
                                            task {
                                                let folder = store.ProjectFolder projectId
                                                let thumbPath = Path.Combine(folder, primaryPath.Replace('/', Path.DirectorySeparatorChar))

                                                if not (File.Exists thumbPath) then
                                                    return None
                                                else
                                                    let b64 = Convert.ToBase64String(File.ReadAllBytes thumbPath)
                                                    let! up = worker.UpscaleImage b64

                                                    match up with
                                                    | Error _ -> return None
                                                    | Ok result ->
                                                        let assetsDir = Path.Combine(folder, "assets")
                                                        Directory.CreateDirectory assetsDir |> ignore
                                                        let fileName = $"upscaled_{blockId:N}_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.png"
                                                        let dest = Path.Combine(assetsDir, fileName)
                                                        File.WriteAllBytes(dest, Convert.FromBase64String result.ImageBase64)
                                                        return Some $"assets/{fileName}"
                                            }
                                        else
                                            task { return None }

                                    let updatedBlock =
                                        { block with
                                            Source = BlockSource.Generated
                                            ThumbnailPath = Some primaryPath
                                            ImagePrompt = Some prompt
                                            Artifacts =
                                                upscalePath
                                                |> Option.map (fun p ->
                                                    { MockupVideoPath = block.Artifacts |> Option.bind (fun a -> a.MockupVideoPath)
                                                      BakeVideoPath = block.Artifacts |> Option.bind (fun a -> a.BakeVideoPath)
                                                      UpscaledImagePath = Some p })
                                                |> Option.orElse block.Artifacts
                                            Generation =
                                                Some
                                                    { Seed = Some baseSeed
                                                      ReferenceAssetPath =
                                                          block.Generation
                                                          |> Option.bind (fun g -> g.ReferenceAssetPath)
                                                      ThumbnailVariants =
                                                          if opts.VariantCount > 1 then Some variantPaths else None } }

                                    let updatedProject =
                                        { project with
                                            Blocks =
                                                project.Blocks
                                                |> List.map (fun b -> if b.Id = blockId then updatedBlock else b) }
                                        |> Project.touch

                                    match store.Save updatedProject with
                                    | Error err ->
                                        events.Publish(JobEvent.create jobId JobPhase.ImageGenerate "save" err JobStatus.Failed)
                                        return Error err
                                    | Ok () ->
                                        events.Publish(
                                            JobEvent.create jobId JobPhase.ImageGenerate "done" "Thumbnail generated" JobStatus.Completed
                                        )

                                        return
                                            Ok
                                                {| jobId = jobId
                                                   block = updatedBlock
                                                   project = updatedProject
                                                   variants = variantPaths |}
            }

        member _.ParseOptions(body: string) =
            if String.IsNullOrWhiteSpace body then
                GenerateBlockOptions.mockupSingle
            else
                try
                    let doc = JsonDocument.Parse body
                    let root = doc.RootElement

                    let profile =
                        match root.TryGetProperty("profile") with
                        | true, p ->
                            match p.GetString() with
                            | "bake" -> RenderTier.Bake
                            | _ -> RenderTier.Mockup
                        | _ -> RenderTier.Mockup

                    let variantCount =
                        match root.TryGetProperty("variantCount") with
                        | true, p -> p.GetInt32()
                        | _ -> 1

                    let promptOverride =
                        match root.TryGetProperty("prompt") with
                        | true, p -> Some(p.GetString())
                        | _ -> None

                    let seed =
                        match root.TryGetProperty("seed") with
                        | true, p -> Some(p.GetInt32())
                        | _ -> None

                    let upscaleAfter =
                        match root.TryGetProperty("upscale") with
                        | true, p -> p.GetBoolean()
                        | _ -> false

                    { Profile = profile
                      VariantCount = variantCount
                      PromptOverride = promptOverride
                      Seed = seed
                      UpscaleAfterGenerate = upscaleAfter }
                with _ ->
                    GenerateBlockOptions.mockupSingle
