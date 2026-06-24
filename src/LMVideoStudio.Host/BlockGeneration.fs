namespace LMVideoStudio.Host

open System
open System.IO
open System.Text.Json
open System.Text.RegularExpressions
open System.Threading.Tasks
open LMVideoStudio.Domain

module BlockGeneration =
    type GenerateBlockOptions =
        { Profile: RenderTier
          VariantCount: int
          PromptOverride: string option
          Seed: int option
          UpscaleAfterGenerate: bool
          ReferenceAssetPath: string option
          ReferenceStrength: float
          UseThumbnailAsReference: bool }

    module GenerateBlockOptions =
        let mockupSingle =
            { Profile = RenderTier.Mockup
              VariantCount = 1
              PromptOverride = None
              Seed = None
              UpscaleAfterGenerate = false
              ReferenceAssetPath = None
              ReferenceStrength = 0.35
              UseThumbnailAsReference = false }

        let mockupVariants =
            { mockupSingle with VariantCount = 3 }

    type BlockGenerationService
        (
            store: ProjectStore.ProjectStore,
            worker: PythonWorkerProvider.PythonWorkerProvider,
            gpu: GpuQueueService,
            events: JobEventHub,
            conflicts: ConflictScan.ConflictScanService
        ) =
        let resolveProfile (project: Project) (tier: RenderTier) =
            match tier with
            | RenderTier.Mockup -> project.RenderDefaults.Mockup
            | RenderTier.Bake -> project.RenderDefaults.Bake

        let looksLikeFilenameOrId (text: string) =
            if String.IsNullOrWhiteSpace text then
                true
            else
                let t = text.Trim()
                let lower = t.ToLowerInvariant()

                if
                    lower.EndsWith ".png"
                    || lower.EndsWith ".jpg"
                    || lower.EndsWith ".jpeg"
                    || lower.EndsWith ".webp"
                    || lower.EndsWith ".gif"
                then
                    true
                elif t.Contains('\\') && not (t.Contains ' ') then
                    true
                else
                    let digits = t |> Seq.filter Char.IsDigit |> Seq.length

                    t.Length >= 12
                    && (digits >= t.Length * 2 / 3 || (t.Contains('_') && digits >= 8))

        let cleanPromptMeta (text: string) =
            let trimmed = text.Trim()

            trimmed
                .Replace("reference image,", "", StringComparison.OrdinalIgnoreCase)
                .Replace("reference image", "", StringComparison.OrdinalIgnoreCase)
            |> fun t -> Regex.Replace(t, @"\s+", " ").Trim()
            |> fun t -> t.Trim(',').Trim()

        let looksLikeEditPrompt (text: string) =
            let lower = text.ToLowerInvariant()

            lower.Contains "give "
            || lower.Contains "add "
            || lower.Contains "put "
            || lower.Contains "with "
            || lower.Contains "wearing"
            || lower.Contains "holding"
            || lower.Contains "bunny"
            || lower.Contains "ears"
            || lower.Contains "hat"
            || lower.Contains "costume"

        let resolvePrompt (block: StoryboardBlock) (overridePrompt: string option) (useReference: bool) =
            let raw =
                match overridePrompt with
                | Some p when not (String.IsNullOrWhiteSpace p) -> p
                | _ ->
                    match block.ImagePrompt with
                    | Some p when not (String.IsNullOrWhiteSpace p) -> p
                    | _ ->
                        block.Title
                        |> Option.defaultValue "storyboard frame, cinematic lighting, wide shot"

            if useReference && looksLikeFilenameOrId raw then
                "portrait photograph of the same person, same face and pose, cinematic lighting, high quality photograph"
            elif looksLikeFilenameOrId raw then
                "storyboard frame, cinematic lighting, wide shot"
            elif useReference then
                let cleaned = cleanPromptMeta raw

                if String.IsNullOrWhiteSpace cleaned then
                    "portrait photograph of the same person, same face and pose, cinematic lighting, high quality photograph"
                elif looksLikeEditPrompt cleaned then
                    $"portrait photograph of the same woman, same face and pose, {cleaned}, cinematic lighting, high quality photograph"
                else
                    $"same person and composition as the reference photo, {cleaned}, cinematic lighting, high quality photograph"
            else
                cleanPromptMeta raw

        let effectiveReferenceStrength (prompt: string) (useReference: bool) (requested: float) =
            if not useReference then
                requested
            elif looksLikeEditPrompt prompt then
                // Edits need slightly more denoise, but stay conservative for face identity.
                max requested 0.38 |> min 0.52
            else
                // Identity-first: cap high values that wipe the reference photo.
                min requested 0.36 |> max 0.22

        let resolveReferencePath (block: StoryboardBlock) (opts: GenerateBlockOptions) =
            opts.ReferenceAssetPath
            |> Option.filter (not << String.IsNullOrWhiteSpace)
            |> Option.orElseWith (fun () ->
                if opts.UseThumbnailAsReference then
                    block.ThumbnailPath
                else
                    None)
            |> Option.orElseWith (fun () ->
                block.Generation
                |> Option.bind (fun g -> g.ReferenceAssetPath)
                |> Option.filter (not << String.IsNullOrWhiteSpace))
            |> Option.orElseWith (fun () ->
                // Imported stills: default to img2img from the imported thumbnail when no explicit reference.
                if block.Source = BlockSource.Imported then
                    block.ThumbnailPath
                else
                    None)

        let tryLoadReferenceBase64 (projectId: Guid) (relPath: string) =
            let folder = store.ProjectFolder projectId

            let fullPath =
                Path.Combine(folder, relPath.Replace('/', Path.DirectorySeparatorChar))

            if File.Exists fullPath then
                Ok(Convert.ToBase64String(File.ReadAllBytes fullPath))
            else
                Error $"Reference image missing: {relPath}"

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
                // Thumbnail generation is GPU image work; MockupPreview/Bake phases are FFmpeg export jobs.
                let phase = JobPhase.ImageGenerate

                let tierLabel =
                    if opts.Profile = RenderTier.Mockup then "mockup" else "bake"

                events.Publish(
                    { JobEvent.create jobId phase "start" $"Generating {tierLabel} thumbnail (GPU worker)…" JobStatus.Running with
                        Hardware = Some "gpu"
                        IsColdRun = Some(not (gpu.IsWarmRun())) }
                )

                match conflicts.RunScan() with
                | Ok doc ->
                    let conflictCount =
                        match doc.TryGetProperty("conflicts") with
                        | true, arr -> arr.GetArrayLength()
                        | _ -> 0

                    if conflictCount > 0 then
                        events.Publish(
                            JobEvent.create
                                jobId
                                phase
                                "conflicts"
                                $"Advisory: {conflictCount} competing GPU app(s) detected — proceeding"
                                JobStatus.Running
                        )
                | Error err ->
                    events.Publish(
                        JobEvent.create jobId phase "conflicts" $"Conflict scan skipped: {err}" JobStatus.Running
                    )

                if opts.VariantCount <> 1 && opts.VariantCount <> 3 then
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
                                let referencePath = resolveReferencePath block opts
                                let useReference = referencePath.IsSome
                                let prompt = resolvePrompt block opts.PromptOverride useReference

                                let referenceStrength =
                                    effectiveReferenceStrength prompt useReference opts.ReferenceStrength

                                let baseSeed =
                                    opts.Seed
                                    |> Option.defaultWith (fun () ->
                                        // New seed each run so re-generating produces fresh variants.
                                        abs (Random.Shared.Next(0, 999_999_999)))

                                let referenceBase64 =
                                    match referencePath with
                                    | None -> Ok None
                                    | Some rel ->
                                        tryLoadReferenceBase64 projectId rel
                                        |> Result.map Some

                                match referenceBase64 with
                                | Error err ->
                                    events.Publish(JobEvent.create jobId phase "reference" err JobStatus.Failed)
                                    return Error err
                                | Ok refB64 ->
                                    if refB64.IsSome then
                                        events.Publish(
                                            JobEvent.create
                                                jobId
                                                phase
                                                "reference"
                                                $"Img2img from reference (strength {referenceStrength:F2})…"
                                                JobStatus.Running
                                        )

                                    let generateVariant seed i refData =
                                        gpu.RunJob(
                                            GpuJobKind.ImageGenerate,
                                            fun () ->
                                                match refData with
                                                | Some b64 ->
                                                    worker.GenerateForProfile(
                                                        profile,
                                                        prompt,
                                                        seed = seed,
                                                        imageBase64 = b64,
                                                        strength = referenceStrength
                                                    )
                                                | None ->
                                                    worker.GenerateForProfile(
                                                        profile,
                                                        prompt,
                                                        seed = seed,
                                                        strength = referenceStrength
                                                    )
                                        )

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

                                                let! genResult = generateVariant seed i refB64

                                                match genResult with
                                                | Error err ->
                                                    events.Publish(
                                                        JobEvent.create jobId JobPhase.ImageGenerate "failed" err JobStatus.Failed
                                                    )

                                                    return Error err
                                                | Ok result ->
                                                    if refB64.IsSome && result.Mode <> Some "img2img" then
                                                        events.Publish(
                                                            JobEvent.create
                                                                jobId
                                                                JobPhase.ImageGenerate
                                                                "reference"
                                                                "Warning: worker ran txt2img — reference image was not applied"
                                                                JobStatus.Running
                                                        )

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
                                            if opts.UpscaleAfterGenerate && not useReference then
                                                task {
                                                    let folder = store.ProjectFolder projectId
                                                    let thumbPath = Path.Combine(folder, primaryPath.Replace('/', Path.DirectorySeparatorChar))

                                                    if not (File.Exists thumbPath) then
                                                        return None
                                                    else
                                                        let b64 = Convert.ToBase64String(File.ReadAllBytes thumbPath)
                                                        let! up =
                                                            gpu.RunJob(
                                                                GpuJobKind.ImageUpscale,
                                                                fun () -> worker.UpscaleImage b64
                                                            )

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
                                                          ReferenceAssetPath = referencePath
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

                    let referenceAssetPath =
                        match root.TryGetProperty("referenceAssetPath") with
                        | true, p ->
                            let s = p.GetString()

                            if String.IsNullOrWhiteSpace s then None else Some s
                        | _ -> None

                    let referenceStrength =
                        match root.TryGetProperty("referenceStrength") with
                        | true, p -> p.GetDouble() |> max 0.05 |> min 0.95
                        | _ -> 0.35

                    let useThumbnailAsReference =
                        match root.TryGetProperty("useThumbnailAsReference") with
                        | true, p -> p.GetBoolean()
                        | _ -> false

                    { Profile = profile
                      VariantCount = variantCount
                      PromptOverride = promptOverride
                      Seed = seed
                      UpscaleAfterGenerate = upscaleAfter
                      ReferenceAssetPath = referenceAssetPath
                      ReferenceStrength = referenceStrength
                      UseThumbnailAsReference = useThumbnailAsReference }
                with _ ->
                    GenerateBlockOptions.mockupSingle
