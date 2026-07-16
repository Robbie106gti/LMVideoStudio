namespace LMVideoStudio.Host

open System
open System.IO
open System.Net.Http
open System.Text
open Giraffe
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Http
open Microsoft.Extensions.DependencyInjection
open LMVideoStudio.Domain

module Program =
    let defaultPort = 17170

    let resolveRepoRoot () =
        let env = Environment.GetEnvironmentVariable("LMVS_REPO_ROOT")

        if String.IsNullOrWhiteSpace env then
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."))
        else
            env

    let repoRoot = resolveRepoRoot ()

    type HostServices =
        { Store: ProjectStore.ProjectStore
          Events: JobEventHub
          Gpu: GpuQueueService
          Bootstrap: Bootstrap.BootstrapService
          Conflicts: ConflictScan.ConflictScanService
          Models: ModelSync.ModelSyncService
          Ollama: OllamaProvider.OllamaProvider
          Worker: PythonWorkerProvider.PythonWorkerProvider
          Generation: BlockGeneration.BlockGenerationService
          Preview: ExportJobs.MockupPreviewService
          Bake: ExportJobs.BakeJobService
          Outline: OutlineGeneration.OutlineGenerationService
          Voiceover: VoiceoverGeneration.VoiceoverService
          ErrorReporting: ErrorReporting.ErrorReportingService
          SocialOAuth: SocialOAuth.SocialOAuthService
          Http: HttpClient }

    type HostServiceOverrides =
        { Worker: PythonWorkerProvider.PythonWorkerProvider option
          Ollama: OllamaProvider.OllamaProvider option }

    let private jsonOptions =
        let o = System.Text.Json.JsonSerializerOptions()
        o.PropertyNamingPolicy <- System.Text.Json.JsonNamingPolicy.CamelCase
        o

    let jsonObj o = System.Text.Json.JsonSerializer.Serialize(o, jsonOptions)

    let blockImportResponse (block: StoryboardBlock) (project: Project) =
        let blockJson = Json.encodeBlock block
        let projectJson = Json.encodeProject project
        let escapedProject = System.Text.Json.JsonSerializer.Serialize projectJson
        $"{{\"block\":{blockJson},\"projectJson\":{escapedProject}}}"

    let stylePackImportResponse (stylePack: StylePack) (project: Project) =
        let projectJson = Json.encodeProject project
        let escapedProject = System.Text.Json.JsonSerializer.Serialize projectJson
        let colorsJson = System.Text.Json.JsonSerializer.Serialize stylePack.DominantColors
        $"{{\"dominantColors\":{colorsJson},\"projectJson\":{escapedProject}}}"

    let writeJson (ctx: HttpContext) status (payload: string) =
        task {
            ctx.Response.StatusCode <- status
            ctx.Response.ContentType <- "application/json; charset=utf-8"
            do! ctx.Response.WriteAsync payload
        }

    let private projectMediaPathPattern =
        System.Text.RegularExpressions.Regex(
            @"^/projects/(?<projectId>[0-9a-fA-F-]{36})/media/(?<relativePath>.+)$",
            System.Text.RegularExpressions.RegexOptions.Compiled
        )

    let serveProjectFile (store: ProjectStore.ProjectStore) (projectId: Guid) (relativePath: string) (ctx: HttpContext) =
        task {
            let folder = store.ProjectFolder projectId
            let normalized = relativePath.Replace('/', Path.DirectorySeparatorChar)
            let fullPath = Path.GetFullPath(Path.Combine(folder, normalized))
            let rootFull = Path.GetFullPath folder

            if not (fullPath.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase)) then
                do! writeJson ctx 403 (jsonObj {| error = "path outside project folder" |})
            elif not (File.Exists fullPath) then
                ctx.Response.StatusCode <- 404
            else
                let ext = (Path.GetExtension fullPath).ToLowerInvariant()

                let contentType =
                    match ext with
                    | ".mp4" -> "video/mp4"
                    | ".png" -> "image/png"
                    | ".jpg" | ".jpeg" -> "image/jpeg"
                    | ".webp" -> "image/webp"
                    | ".wav" -> "audio/wav"
                    | ".mp3" -> "audio/mpeg"
                    | _ -> "application/octet-stream"

                ctx.Response.ContentType <- contentType
                ctx.Response.StatusCode <- 200
                do! ctx.Response.SendFileAsync fullPath
        }

    let serveProjectMedia (store: ProjectStore.ProjectStore) : HttpHandler =
        fun next ctx ->
            task {
                let path = ctx.Request.Path.Value
                let m = projectMediaPathPattern.Match path

                if not m.Success then
                    return! RequestErrors.NOT_FOUND () next ctx
                else
                    let projectId = Guid.Parse m.Groups.["projectId"].Value

                    let relativePath =
                        Uri.UnescapeDataString(m.Groups.["relativePath"].Value)

                    do! serveProjectFile store projectId relativePath ctx
                    return! next ctx
            }

    let readBody (ctx: HttpContext) =
        task {
            use reader = new StreamReader(ctx.Request.Body, Encoding.UTF8)
            return! reader.ReadToEndAsync()
        }

    let handleValidateProject (services: HostServices) (body: string) (ctx: HttpContext) next =
        task {
            match Json.decodeProject body with
            | Error err -> do! writeJson ctx 400 (jsonObj {| valid = false; error = err |})
            | Ok project ->
                match Validation.validateProject project with
                | Valid -> do! writeJson ctx 200 (jsonObj {| valid = true |})
                | Invalid issues -> do! writeJson ctx 400 (jsonObj {| valid = false; errors = issues |})

            return! next ctx
        }

    let handleStartPreview (services: HostServices) (projectId: Guid) (ctx: HttpContext) next =
        task {
            match services.Store.Load projectId with
            | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
            | Ok _ ->
                let jobId = services.Preview.StartPreview projectId

                do! writeJson ctx 202 (
                    jsonObj
                        {| jobId = jobId
                           previewPath = ExportJobs.PreviewRelativePath
                           eventsUrl = $"/jobs/{jobId}/events" |}
                )

            return! next ctx
        }

    let handleStartBake (services: HostServices) (projectId: Guid) (ctx: HttpContext) next =
        task {
            match services.Store.Load projectId with
            | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
            | Ok _ ->
                let jobId = services.Bake.StartBake projectId

                do! writeJson ctx 202 (
                    jsonObj
                        {| jobId = jobId
                           bakePath = ExportJobs.BakeRelativePath
                           eventsUrl = $"/jobs/{jobId}/events" |}
                )

            return! next ctx
        }

    let webApp (services: HostServices) =
        let routes =
            choose [
                GET
                >=> route "/health"
                >=> fun next ctx ->
                    task {
                        do! writeJson ctx 200 (jsonObj {| status = "ok"; port = defaultPort |})
                        return! next ctx
                    }

                GET
                >=> route "/openapi.json"
                >=> fun next ctx ->
                    task {
                        ctx.Response.StatusCode <- 200
                        ctx.Response.ContentType <- "application/json; charset=utf-8"
                        do! ctx.Response.WriteAsync OpenApi.documentJson
                        return! next ctx
                    }

                GET
                >=> route "/api/v1/status"
                >=> fun next ctx ->
                    task {
                        let! status = services.Bootstrap.GetSystemStatus()

                        do! writeJson ctx 200 (
                            jsonObj
                                {| apiVersion = "v1"
                                   health = {| status = "ok"; port = defaultPort |}
                                   system = status |}
                        )

                        return! next ctx
                    }

                POST
                >=> route "/api/v1/validate"
                >=> fun next ctx ->
                    task {
                        let! body = readBody ctx
                        return! handleValidateProject services body ctx next
                    }

                POST
                >=> route "/api/v1/reports"
                >=> fun next ctx ->
                    task {
                        let! body = readBody ctx

                        let userConsented =
                            try
                                let doc = System.Text.Json.JsonDocument.Parse(body)
                                doc.RootElement.TryGetProperty("userConsented")
                                |> fun (ok, el) -> ok && el.GetBoolean()
                            with _ ->
                                false

                        let! result = services.ErrorReporting.Submit(body, userConsented)

                        match result with
                        | Ok r ->
                            do! writeJson ctx 201 (
                                jsonObj
                                    {| reportId = r.ReportId
                                       storedPath = r.StoredPath
                                       uploaded = r.Uploaded
                                       queued = r.Queued |}
                            )
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    }

                POST
                >=> route "/api/v1/reports/flush"
                >=> fun next ctx ->
                    task {
                        let! count = services.ErrorReporting.FlushQueue()
                        do! writeJson ctx 200 (jsonObj {| flushed = count |})
                        return! next ctx
                    }

                GET
                >=> route "/system/status"
                >=> fun next ctx ->
                    task {
                        let! status = services.Bootstrap.GetSystemStatus()
                        do! writeJson ctx 200 (jsonObj status)
                        return! next ctx
                    }

                POST
                >=> route "/system/conflicts/scan"
                >=> fun next ctx ->
                    task {
                        match services.Conflicts.RunScan() with
                        | Ok json -> do! writeJson ctx 200 (json.GetRawText())
                        | Error err -> do! writeJson ctx 500 (jsonObj {| error = err |})

                        return! next ctx
                    }

                POST
                >=> route "/system/bootstrap"
                >=> fun next ctx ->
                    task {
                        let! jobId = services.Bootstrap.RunBootstrap()
                        do! writeJson ctx 202 (jsonObj {| jobId = jobId |})
                        return! next ctx
                    }

                POST
                >=> route "/system/repair"
                >=> fun next ctx ->
                    task {
                        let! jobId = services.Bootstrap.Repair()
                        do! writeJson ctx 202 (jsonObj {| jobId = jobId |})
                        return! next ctx
                    }

                GET
                >=> route "/models/status"
                >=> fun next ctx ->
                    task {
                        let! status = services.Models.GetStatus()
                        do! writeJson ctx 200 (jsonObj status)
                        return! next ctx
                    }

                POST
                >=> route "/models/sync"
                >=> fun next ctx ->
                    task {
                        let! body = readBody ctx

                        let pull =
                            not (String.IsNullOrWhiteSpace body)
                            && body.Contains("pull", StringComparison.OrdinalIgnoreCase)

                        let! result =
                            if pull then services.Models.RunPull() else services.Models.RunCheck()

                        match result with
                        | Ok r -> do! writeJson ctx 200 (jsonObj r)
                        | Error err -> do! writeJson ctx 500 (jsonObj {| error = err |})

                        return! next ctx
                    }

                GET
                >=> route "/events"
                >=> fun next ctx ->
                    task {
                        ctx.Response.StatusCode <- 200
                        ctx.Response.Headers.Add("Content-Type", "text/event-stream")
                        ctx.Response.Headers.Add("Cache-Control", "no-cache")
                        let ch = services.Events.SubscribeGlobal()
                        let ct = ctx.RequestAborted

                        try
                            do! ctx.Response.WriteAsync(": connected\n\n")
                            do! ctx.Response.Body.FlushAsync()

                            while not ct.IsCancellationRequested do
                                let! evt = ch.Reader.ReadAsync(ct).AsTask()
                                let payload = JobEvent.toSsePayload evt
                                do! ctx.Response.WriteAsync($"data: {payload}\n\n")
                                do! ctx.Response.Body.FlushAsync()
                        with :? OperationCanceledException ->
                            ()

                        return! next ctx
                    }

                GET
                >=> routef "/jobs/%O/events" (fun (jobId: Guid) next ctx ->
                    task {
                        ctx.Response.StatusCode <- 200
                        ctx.Response.Headers.Add("Content-Type", "text/event-stream")
                        let ch = services.Events.Subscribe jobId
                        let ct = ctx.RequestAborted

                        try
                            while not ct.IsCancellationRequested do
                                let! evt = ch.Reader.ReadAsync(ct).AsTask()
                                let payload = JobEvent.toSsePayload evt
                                do! ctx.Response.WriteAsync($"data: {payload}\n\n")
                                do! ctx.Response.Body.FlushAsync()
                        finally
                            services.Events.Unsubscribe jobId

                        return! next ctx
                    })

                POST
                >=> route "/projects/validate"
                >=> fun next ctx ->
                    task {
                        let! body = readBody ctx
                        return! handleValidateProject services body ctx next
                    }

                GET
                >=> route "/projects"
                >=> fun next ctx ->
                    task {
                        do! writeJson ctx 200 (jsonObj (services.Store.List()))
                        return! next ctx
                    }

                POST
                >=> route "/projects"
                >=> fun next ctx ->
                    task {
                        let! body = readBody ctx

                        let name =
                            try
                                let doc = System.Text.Json.JsonDocument.Parse(body)
                                doc.RootElement.GetProperty("name").GetString()
                            with _ ->
                                null

                        if String.IsNullOrWhiteSpace name then
                            do! writeJson ctx 400 (jsonObj {| error = "name required" |})
                        else
                            match services.Store.Create name with
                            | Ok project -> do! writeJson ctx 201 (Json.encodeProject project)
                            | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    }

                GET
                >=> routef "/projects/%O" (fun (projectId: Guid) next ctx ->
                    task {
                        match services.Store.Load projectId with
                        | Ok project -> do! writeJson ctx 200 (Json.encodeProject project)
                        | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})

                        return! next ctx
                    })

                PUT
                >=> routef "/projects/%O" (fun (projectId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx

                        match Json.decodeProject body with
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                        | Ok project when project.Id <> projectId ->
                            do! writeJson ctx 400 (jsonObj {| error = "project id mismatch" |})
                        | Ok project ->
                            match Validation.validateProject project with
                            | Invalid issues -> do! writeJson ctx 400 (jsonObj {| errors = issues |})
                            | Valid ->
                                match services.Store.Save project with
                                | Ok () -> do! writeJson ctx 200 (Json.encodeProject project)
                                | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    })

                DELETE
                >=> routef "/projects/%O" (fun (projectId: Guid) next ctx ->
                    task {
                        match services.Store.Delete projectId with
                        | Ok () -> ctx.Response.StatusCode <- 204
                        | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/blocks/import" (fun (projectId: Guid) next ctx ->
                    task {
                        try
                            if not ctx.Request.HasFormContentType then
                                do! writeJson ctx 400 (jsonObj {| error = "multipart form required" |})
                            else
                                let! form = ctx.Request.ReadFormAsync()
                                let file = form.Files |> Seq.tryHead

                                match file with
                                | None -> do! writeJson ctx 400 (jsonObj {| error = "file required" |})
                                | Some f ->
                                    use ms = new MemoryStream()
                                    do! f.CopyToAsync(ms)
                                    let bytes = ms.ToArray()

                                    match services.Store.ImportAsset(projectId, f.FileName, bytes) with
                                    | Ok(block, project) ->
                                        do! writeJson ctx 201 (blockImportResponse block project)
                                    | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                        with ex ->
                            do! writeJson ctx 500 (jsonObj {| error = ex.Message |})

                        return! next ctx
                    })

                PUT
                >=> routef "/projects/%O/blocks" (fun (projectId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx

                        match Json.decodeBlocks body with
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                        | Ok blockList ->
                            match services.Store.UpdateBlocks(projectId, blockList) with
                            | Ok project -> do! writeJson ctx 200 (Json.encodeProject project)
                            | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/blocks/%O/generate" (fun (projectId: Guid, blockId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx
                        let opts = services.Generation.ParseOptions body

                        match! services.Generation.GenerateThumbnail(projectId, blockId, opts) with
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                        | Ok result ->
                            let blockJson = Json.encodeBlock result.block
                            let projectJson = Json.encodeProject result.project
                            let escapedProject = System.Text.Json.JsonSerializer.Serialize projectJson
                            let variantsJson =
                                result.variants
                                |> List.map (fun v -> $"\"{v}\"")
                                |> String.concat ","

                            do! writeJson ctx 202 (
                                $"{{\"jobId\":\"{result.jobId}\",\"variants\":[{variantsJson}],\"block\":{blockJson},\"projectJson\":{escapedProject}}}"
                            )

                        return! next ctx
                    })

                PATCH
                >=> routef "/projects/%O/blocks/%O" (fun (projectId: Guid, blockId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx

                        try
                            let doc = System.Text.Json.JsonDocument.Parse(body)
                            let root = doc.RootElement

                            match services.Store.UpdateBlock(projectId, blockId, fun block ->
                                let voiceover =
                                    if root.TryGetProperty("voiceoverScript") |> fst then
                                        Some(root.GetProperty("voiceoverScript").GetString())
                                    else
                                        block.VoiceoverScript

                                let imagePrompt =
                                    if root.TryGetProperty("imagePrompt") |> fst then
                                        Some(root.GetProperty("imagePrompt").GetString())
                                    else
                                        block.ImagePrompt

                                let mockupDuration =
                                    if root.TryGetProperty("mockupDurationSec") |> fst then
                                        Some(root.GetProperty("mockupDurationSec").GetDouble())
                                    else
                                        block.MockupDurationSec

                                let thumbnailPath =
                                    if root.TryGetProperty("thumbnailPath") |> fst then
                                        Some(root.GetProperty("thumbnailPath").GetString())
                                    else
                                        block.ThumbnailPath

                                let transitions =
                                    if root.TryGetProperty("transitions") |> fst then
                                        let tRoot = root.GetProperty("transitions")

                                        let readEdge (name: string) =
                                            if tRoot.TryGetProperty(name) |> fst then
                                                let edge: System.Text.Json.JsonElement = tRoot.GetProperty(name)

                                                Some
                                                    { Type =
                                                        match edge.GetProperty("type").GetString() with
                                                        | "crossfade" -> Crossfade
                                                        | "fade" -> Fade
                                                        | "cut" -> Cut
                                                        | _ -> Crossfade
                                                      DurationMs = edge.GetProperty("durationMs").GetInt32() }
                                            else
                                                None

                                        Some
                                            { InEdge = readEdge "in"
                                              OutEdge = readEdge "out"
                                              ToNext = readEdge "toNext" }
                                    else
                                        block.Transitions

                                let artifacts =
                                    if root.TryGetProperty("artifacts") |> fst then
                                        let aRoot = root.GetProperty("artifacts")

                                        let readOpt (name: string) =
                                            if aRoot.TryGetProperty(name) |> fst then
                                                Some(aRoot.GetProperty(name).GetString())
                                            else
                                                None

                                        Some
                                            { MockupVideoPath = readOpt "mockupVideoPath"
                                              BakeVideoPath = readOpt "bakeVideoPath"
                                              UpscaledImagePath = readOpt "upscaledImagePath" }
                                    else
                                        block.Artifacts

                                let moodTags =
                                    if root.TryGetProperty("moodTags") |> fst then
                                        root.GetProperty("moodTags").EnumerateArray()
                                        |> Seq.choose (fun el ->
                                            let s = el.GetString()

                                            if String.IsNullOrWhiteSpace s then None else Some s)
                                        |> Seq.toList
                                    else
                                        block.MoodTags

                                let directorNotes =
                                    if root.TryGetProperty("directorNotes") |> fst then
                                        let s = root.GetProperty("directorNotes").GetString()

                                        if String.IsNullOrWhiteSpace s then None else Some s
                                    else
                                        block.DirectorNotes

                                let shotKind =
                                    if root.TryGetProperty("shotKind") |> fst then
                                        BlockShotKind.fromSchemaValue (root.GetProperty("shotKind").GetString())
                                    else
                                        block.ShotKind

                                let bakeDuration =
                                    if
                                        root.TryGetProperty("clearBakeDurationSec") |> fst
                                        && root.GetProperty("clearBakeDurationSec").GetBoolean()
                                    then
                                        None
                                    elif root.TryGetProperty("bakeDurationSec") |> fst then
                                        let el = root.GetProperty("bakeDurationSec")

                                        if el.ValueKind = System.Text.Json.JsonValueKind.Null then
                                            None
                                        else
                                            Some(el.GetDouble())
                                    else
                                        block.BakeDurationSec

                                { block with
                                    VoiceoverScript = voiceover
                                    ImagePrompt = imagePrompt
                                    MockupDurationSec = mockupDuration
                                    BakeDurationSec = bakeDuration
                                    ThumbnailPath = thumbnailPath
                                    Transitions = transitions
                                    Artifacts = artifacts
                                    MoodTags = moodTags
                                    DirectorNotes = directorNotes
                                    ShotKind = shotKind }) with
                            | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                            | Ok project -> do! writeJson ctx 200 (Json.encodeProject project)
                        with ex ->
                            do! writeJson ctx 400 (jsonObj {| error = ex.Message |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/blocks/%O/voiceover/generate" (fun (projectId: Guid, blockId: Guid) next ctx ->
                    task {
                        match services.Store.Load projectId with
                        | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
                        | Ok _ ->
                            let jobId = services.Voiceover.GenerateVoiceover(projectId, blockId)

                            do! writeJson ctx 202 (
                                jsonObj
                                    {| jobId = jobId
                                       eventsUrl = $"/jobs/{jobId}/events"
                                       message = "Voiceover generation accepted" |}
                            )

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/blocks/%O/audio/import" (fun (projectId: Guid, blockId: Guid) next ctx ->
                    task {
                        if not ctx.Request.HasFormContentType then
                            do! writeJson ctx 400 (jsonObj {| error = "multipart form required" |})
                        else
                            let! form = ctx.Request.ReadFormAsync()
                            let file = form.Files |> Seq.tryHead

                            match file with
                            | None -> do! writeJson ctx 400 (jsonObj {| error = "file required" |})
                            | Some f ->
                                use ms = new MemoryStream()
                                do! f.CopyToAsync(ms)
                                let bytes = ms.ToArray()

                                match services.Store.ImportBlockAudio(projectId, blockId, f.FileName, bytes) with
                                | Ok(block, project) ->
                                    do! writeJson ctx 201 (blockImportResponse block project)
                                | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/blocks/%O/reference-image/import" (fun (projectId: Guid, blockId: Guid) next ctx ->
                    task {
                        if not ctx.Request.HasFormContentType then
                            do! writeJson ctx 400 (jsonObj {| error = "multipart form required" |})
                        else
                            let! form = ctx.Request.ReadFormAsync()
                            let file = form.Files |> Seq.tryHead

                            match file with
                            | None -> do! writeJson ctx 400 (jsonObj {| error = "file required" |})
                            | Some f ->
                                use ms = new MemoryStream()
                                do! f.CopyToAsync(ms)
                                let bytes = ms.ToArray()

                                match services.Store.ImportBlockReferenceImage(projectId, blockId, f.FileName, bytes) with
                                | Ok(block, project) ->
                                    do! writeJson ctx 201 (blockImportResponse block project)
                                | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/blocks/%O/reference-image/use-thumbnail" (fun (projectId: Guid, blockId: Guid) next ctx ->
                    task {
                        match services.Store.SetBlockReferenceFromThumbnail(projectId, blockId) with
                        | Ok(block, project) -> do! writeJson ctx 200 (blockImportResponse block project)
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    })

                DELETE
                >=> routef "/projects/%O/blocks/%O/reference-image" (fun (projectId: Guid, blockId: Guid) next ctx ->
                    task {
                        match services.Store.ClearBlockReferenceImage(projectId, blockId) with
                        | Ok(block, project) -> do! writeJson ctx 200 (blockImportResponse block project)
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/preview" (fun (projectId: Guid) next ctx ->
                    handleStartPreview services projectId ctx next)

                POST
                >=> routef "/api/v1/projects/%O/preview" (fun (projectId: Guid) next ctx ->
                    handleStartPreview services projectId ctx next)

                GET
                >=> routef "/projects/%O/preview" (fun (projectId: Guid) next ctx ->
                    task {
                        let folder = services.Store.ProjectFolder projectId
                        let previewPath = Path.Combine(folder, ExportJobs.PreviewRelativePath.Replace('/', Path.DirectorySeparatorChar))

                        if File.Exists previewPath then
                            do! writeJson ctx 200 (
                                jsonObj
                                    {| ready = true
                                       previewPath = ExportJobs.PreviewRelativePath
                                       mediaUrl = $"/projects/{projectId}/media/{ExportJobs.PreviewRelativePath}" |}
                            )
                        else
                            do! writeJson ctx 200 (jsonObj {| ready = false |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/bake" (fun (projectId: Guid) next ctx ->
                    handleStartBake services projectId ctx next)

                POST
                >=> routef "/api/v1/projects/%O/bake" (fun (projectId: Guid) next ctx ->
                    handleStartBake services projectId ctx next)

                GET
                >=> routef "/projects/%O/bake" (fun (projectId: Guid) next ctx ->
                    task {
                        let folder = services.Store.ProjectFolder projectId
                        let bakePath = Path.Combine(folder, ExportJobs.BakeRelativePath.Replace('/', Path.DirectorySeparatorChar))

                        if File.Exists bakePath then
                            do! writeJson ctx 200 (
                                jsonObj
                                    {| bakePath = ExportJobs.BakeRelativePath
                                       mediaUrl = $"/projects/{projectId}/media/{ExportJobs.BakeRelativePath}" |}
                            )
                        else
                            do! writeJson ctx 404 (jsonObj {| error = "No bake export yet" |})

                        return! next ctx
                    })

                GET
                >=> routef "/projects/%O/export/premiere" (fun (projectId: Guid) next ctx ->
                    task {
                        match services.Store.Load projectId with
                        | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
                        | Ok project ->
                            let folder = services.Store.ProjectFolder projectId
                            let xml = PremiereExport.generate folder project
                            ctx.Response.StatusCode <- 200
                            ctx.Response.ContentType <- "application/xml; charset=utf-8"
                            do! ctx.Response.WriteAsync xml
                        return! next ctx
                    })

                GET
                >=> routef "/oauth/%s/start" (fun provider next ctx ->
                    task {
                        match services.SocialOAuth.Start provider with
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                        | Ok start ->
                            do! writeJson ctx 200 (
                                jsonObj
                                    {| authorizationUrl = start.AuthorizationUrl
                                       state = start.State
                                       provider = start.Provider |}
                            )

                        return! next ctx
                    })

                GET
                >=> route "/oauth/callback"
                >=> fun next ctx ->
                    task {
                        let code = ctx.Request.Query.["code"].ToString()
                        let state = ctx.Request.Query.["state"].ToString()
                        let oauthErr = ctx.Request.Query.["error"].ToString()

                        if not (String.IsNullOrWhiteSpace oauthErr) then
                            ctx.Response.StatusCode <- 400
                            ctx.Response.ContentType <- "text/html; charset=utf-8"

                            do!
                                ctx.Response.WriteAsync(
                                    $"<html><body><h1>OAuth failed</h1><p>{System.Net.WebUtility.HtmlEncode oauthErr}</p></body></html>"
                                )
                        elif String.IsNullOrWhiteSpace code || String.IsNullOrWhiteSpace state then
                            do! writeJson ctx 400 (jsonObj {| error = "code and state query parameters required" |})
                        else
                            let! result = services.SocialOAuth.Callback code state

                            match result with
                            | Error err ->
                                ctx.Response.StatusCode <- 400
                                ctx.Response.ContentType <- "text/html; charset=utf-8"
                                do! ctx.Response.WriteAsync($"<html><body><h1>OAuth failed</h1><p>{System.Net.WebUtility.HtmlEncode err}</p></body></html>")
                            | Ok ok ->
                                ctx.Response.StatusCode <- 200
                                ctx.Response.ContentType <- "text/html; charset=utf-8"

                                let name =
                                    ok.AccountName
                                    |> Option.defaultValue ok.Provider

                                do!
                                    ctx.Response.WriteAsync(
                                        $"""<html><body style="font-family:Segoe UI,sans-serif;padding:2rem;">
<h1>Connected {System.Net.WebUtility.HtmlEncode ok.Provider}</h1>
<p>{System.Net.WebUtility.HtmlEncode ok.Message}</p>
<p>Account: <strong>{System.Net.WebUtility.HtmlEncode name}</strong></p>
</body></html>"""
                                    )

                        return! next ctx
                    }

                DELETE
                >=> routef "/oauth/%s" (fun provider next ctx ->
                    task {
                        match services.SocialOAuth.Disconnect provider with
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                        | Ok _ -> do! writeJson ctx 200 (jsonObj {| disconnected = provider |})

                        return! next ctx
                    })

                GET
                >=> route "/settings/connected-accounts"
                >=> fun next ctx ->
                    task {
                        let accounts = services.SocialOAuth.ConnectedAccounts()

                        do! writeJson ctx 200 (
                            jsonObj
                                {| configured = services.SocialOAuth.Config.Configured
                                   accounts = accounts |}
                        )

                        return! next ctx
                    }

                POST
                >=> routef "/projects/%O/export/share-pack/upload" (fun (projectId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx

                        match SocialUpload.validateUploadRequest body with
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = SocialUpload.validationErrorMessage err |})
                        | Ok request ->
                            match services.Store.Load projectId with
                            | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
                            | Ok project ->
                                let folder = services.Store.ProjectFolder projectId

                                let! uploadResult =
                                    SocialUpload.uploadSharePackAsync services.Http services.SocialOAuth folder project.Name request

                                match uploadResult with
                                | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                                | Ok result ->
                                    do! writeJson ctx 200 (
                                        jsonObj
                                            {| platform = result.Platform
                                               videoId = result.VideoId
                                               url = result.Url
                                               message = result.Message |}
                                    )

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/export/share-pack" (fun (projectId: Guid) next ctx ->
                    task {
                        match services.Store.Load projectId with
                        | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
                        | Ok project ->
                            let folder = services.Store.ProjectFolder projectId

                            match SharePackExport.exportSharePack repoRoot folder project with
                            | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                            | Ok result ->
                                let captionFullPath =
                                    Path.Combine(folder, result.CaptionPath.Replace('/', Path.DirectorySeparatorChar))

                                let captionText =
                                    if File.Exists captionFullPath then
                                        File.ReadAllText(captionFullPath, Encoding.UTF8)
                                    else
                                        ""

                                do! writeJson ctx 200 (
                                    jsonObj
                                        {| outputDir = result.OutputDir
                                           files = result.Files
                                           captionPath = result.CaptionPath
                                           captionText = captionText
                                           readmePath = result.ReadmePath
                                           mediaBase = $"/projects/{projectId}/media/{result.OutputDir}" |}
                                )

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/style-pack/import" (fun (projectId: Guid) next ctx ->
                    task {
                        try
                            if not ctx.Request.HasFormContentType then
                                do! writeJson ctx 400 (jsonObj {| error = "multipart form required" |})
                            else
                                let! form = ctx.Request.ReadFormAsync()
                                let file = form.Files |> Seq.tryHead

                                match file with
                                | None -> do! writeJson ctx 400 (jsonObj {| error = "file required" |})
                                | Some f ->
                                    use ms = new MemoryStream()
                                    do! f.CopyToAsync(ms)
                                    let bytes = ms.ToArray()

                                    match services.Store.ImportStylePackLogo(projectId, f.FileName, bytes) with
                                    | Ok(project, stylePack) ->
                                        do! writeJson ctx 201 (stylePackImportResponse stylePack project)
                                    | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                        with ex ->
                            do! writeJson ctx 500 (jsonObj {| error = ex.Message |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/outline/generate" (fun (projectId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx

                        let brief =
                            try
                                let doc = System.Text.Json.JsonDocument.Parse(body)
                                doc.RootElement.GetProperty("brief").GetString()
                            with _ ->
                                null

                        match services.Store.Load projectId with
                        | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
                        | Ok _ ->
                            let! result = services.Outline.Generate(brief)

                            match result with
                            | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                            | Ok blocks ->
                                let payload =
                                    blocks
                                    |> List.map (fun b ->
                                        {| title = b.Title
                                           voiceoverScript = b.VoiceoverScript
                                           imagePrompt = b.ImagePrompt |})

                                do! writeJson ctx 200 (jsonObj {| blocks = payload |})

                        return! next ctx
                    })

                POST
                >=> routef "/projects/%O/outline/apply" (fun (projectId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx

                        try
                            let doc = System.Text.Json.JsonDocument.Parse(body)
                            let root = doc.RootElement
                            let brief = root.GetProperty("brief").GetString()

                            let blocks =
                                root.GetProperty("blocks").EnumerateArray()
                                |> Seq.map (fun el ->
                                    let title =
                                        el.GetProperty("title").GetString()
                                        |> Option.ofObj
                                        |> Option.defaultValue ""

                                    let voiceover =
                                        el.GetProperty("voiceoverScript").GetString()
                                        |> Option.ofObj
                                        |> Option.defaultValue ""

                                    let imagePrompt =
                                        el.GetProperty("imagePrompt").GetString()
                                        |> Option.ofObj
                                        |> Option.defaultValue ""

                                    let block: OutlineGeneration.OutlineBlockDto =
                                        { Title = title
                                          VoiceoverScript = voiceover
                                          ImagePrompt = imagePrompt }

                                    block)
                                |> Seq.toList

                            match services.Store.Load projectId with
                            | Error err -> do! writeJson ctx 404 (jsonObj {| error = err |})
                            | Ok project ->
                                let updated = services.Outline.ApplyToProject project blocks brief

                                match services.Store.Save updated with
                                | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})
                                | Ok () -> do! writeJson ctx 200 (Json.encodeProject updated)
                        with ex ->
                            do! writeJson ctx 400 (jsonObj {| error = ex.Message |})

                        return! next ctx
                    })

                GET >=> serveProjectMedia services.Store

                POST
                >=> routef "/projects/%O/blocks/reorder" (fun (projectId: Guid) next ctx ->
                    task {
                        let! body = readBody ctx

                        let ids =
                            try
                                let doc = System.Text.Json.JsonDocument.Parse(body)

                                doc.RootElement.GetProperty("blockIds").EnumerateArray()
                                |> Seq.map (fun e -> e.GetGuid())
                                |> Seq.toList
                            with _ ->
                                []

                        match services.Store.ReorderBlocks(projectId, ids) with
                        | Ok project -> do! writeJson ctx 200 (Json.encodeProject project)
                        | Error err -> do! writeJson ctx 400 (jsonObj {| error = err |})

                        return! next ctx
                    })

                POST
                >=> route "/gpu/enqueue"
                >=> fun next ctx ->
                    task {
                        let! job = services.Gpu.Enqueue ImageGenerate |> Async.StartAsTask
                        do! writeJson ctx 202 (jsonObj job)
                        return! next ctx
                    }

                GET
                >=> route "/gpu/status"
                >=> fun next ctx ->
                    task {
                        do! writeJson ctx 200 (jsonObj (services.Gpu.Status()))
                        return! next ctx
                    }

                POST
                >=> route "/export/ken-burns"
                >=> fun next ctx ->
                    task {
                        let! body = readBody ctx

                        try
                            let doc = System.Text.Json.JsonDocument.Parse(body)
                            let input = doc.RootElement.GetProperty("inputPath").GetString()
                            let output = doc.RootElement.GetProperty("outputPath").GetString()
                            let duration = doc.RootElement.GetProperty("durationSec").GetDouble()

                            let opts: FfmpegExport.KenBurnsOptions =
                                { InputPath = input
                                  OutputPath = output
                                  Width = 640
                                  Height = 360
                                  Fps = FfmpegExport.MockupFps
                                  DurationSec = duration
                                  ZoomStart = 1.0
                                  ZoomEnd = 1.15 }

                            let result = FfmpegExport.runKenBurnsMockup repoRoot opts None
                            do! writeJson ctx (if result.Success then 200 else 500) (jsonObj result)
                        with ex ->
                            do! writeJson ctx 400 (jsonObj {| error = ex.Message |})

                        return! next ctx
                    }
            ]

        choose [ routes; setStatusCode 404 >=> text "Not Found" ]

    let buildHostServices (repoRoot: string, overrides: HostServiceOverrides option) =
        let ovr =
            defaultArg overrides
                { Worker = None
                  Ollama = None }

        let schemaPath = Path.Combine(repoRoot, "docs", "project.schema.json")
        let events = JobEventHub()
        let store = ProjectStore.ProjectStore(repoRoot, schemaPath)
        let models = ModelSync.ModelSyncService(repoRoot, events)

        let ollama =
            ovr.Ollama
            |> Option.defaultWith (fun () -> OllamaProvider.OllamaProvider("http://localhost:11434"))

        let worker =
            ovr.Worker
            |> Option.defaultWith (fun () -> PythonWorkerProvider.PythonWorkerProvider("http://127.0.0.1:8765"))

        let gpuQueue = GpuQueueService(SingleFlightGpuQueue(), worker, repoRoot)

        let bootstrap = Bootstrap.BootstrapService(repoRoot, events, models, ollama, worker, gpuQueue)
        let conflicts = ConflictScan.ConflictScanService repoRoot
        let generation = BlockGeneration.BlockGenerationService(store, worker, gpuQueue, events, conflicts)
        let preview = ExportJobs.MockupPreviewService(store, events, repoRoot)
        let bake = ExportJobs.BakeJobService(store, events, repoRoot, worker, gpuQueue)
        let outline = OutlineGeneration.OutlineGenerationService ollama
        let voiceover = VoiceoverGeneration.VoiceoverService(store, events, worker, gpuQueue, repoRoot)
        let errorReporting = ErrorReporting.ErrorReportingService repoRoot
        let httpClient = new HttpClient()
        let socialOAuth = SocialOAuth.SocialOAuthService(repoRoot, httpClient)

        store.EnsureRoot()
        errorReporting.EnsureDirectories()
        OAuthTokenStore.ensureRoot () |> ignore

        { Store = store
          Events = events
          Gpu = gpuQueue
          Bootstrap = bootstrap
          Conflicts = conflicts
          Models = models
          Ollama = ollama
          Worker = worker
          Generation = generation
          Preview = preview
          Bake = bake
          Outline = outline
          Voiceover = voiceover
          ErrorReporting = errorReporting
          SocialOAuth = socialOAuth
          Http = httpClient }

    let configureWebApplication (builder: WebApplicationBuilder) (hostServices: HostServices) =
        builder.Services.AddGiraffe() |> ignore

        builder.Services.AddCors(fun options ->
            options.AddDefaultPolicy(fun policy ->
                policy
                    .SetIsOriginAllowed(fun _ -> true)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                |> ignore))
        |> ignore

        let app = builder.Build()
        app.UseCors() |> ignore
        app.UseGiraffe(webApp hostServices)

        app.Lifetime.ApplicationStopping.Register(fun () ->
            FfmpegExport.killAllActive()
            hostServices.Preview.CancelActive()
            hostServices.Bake.CancelActive())
        |> ignore

        app

    let createWebApplication (repoRoot: string) =
        configureWebApplication (WebApplication.CreateBuilder()) (buildHostServices (repoRoot, None))

    [<EntryPoint>]
    let main args =
        AppDomain.CurrentDomain.UnhandledException.Add(fun ev ->
            match ev.ExceptionObject with
            | :? exn as ex ->
                try
                    let reporting = ErrorReporting.ErrorReportingService repoRoot
                    reporting.CaptureHostException(ex).GetAwaiter().GetResult() |> ignore
                with _ ->
                    eprintfn "LMVideoStudio Host fatal: %s" ex.Message
            | _ -> ())

        let port =
            match Environment.GetEnvironmentVariable("LMVS_HOST_PORT") with
            | null | "" ->
                match args with
                | [| p |] ->
                    match Int32.TryParse p with
                    | true, n -> n
                    | _ -> defaultPort
                | _ -> defaultPort
            | env ->
                match Int32.TryParse env with
                | true, n -> n
                | _ -> defaultPort

        let app = createWebApplication repoRoot

        printfn "LMVideoStudio Host listening on http://127.0.0.1:%d" port
        printfn "Repo root: %s" repoRoot
        app.Run($"http://127.0.0.1:{port}")
        0
