namespace LMVideoStudio.Host.Tests

open System
open System.Collections.Generic
open System.Diagnostics
open System.IO
open System.Net
open System.Net.Http
open System.Net.Http.Headers
open System.Text
open System.Text.Json
open System.Threading
open System.Threading.Tasks
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain
open LMVideoStudio.Host
open LMVideoStudio.Host.Program

module FeatureTddTests =
    let private tinyPngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

    let private tinyWavBase64 =
        "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

    let private createWorkerWithTtsAndUpscale () =
        let ttsCalled = ref false
        let upscaleCalled = ref false

        let handler =
            TestMocks.StubHttpHandler(fun req ->
                if req.Method = HttpMethod.Get && req.RequestUri.AbsolutePath.EndsWith("/health") then
                    TestMocks.jsonResponse HttpStatusCode.OK """{"rocm":false,"vram_gb":8}"""
                elif req.Method = HttpMethod.Post && req.RequestUri.AbsolutePath.Contains("/audio/generate") then
                    ttsCalled := true
                    TestMocks.jsonResponse
                        HttpStatusCode.OK
                        $"""{{"audio_base64":"{tinyWavBase64}","format":"wav"}}"""
                elif req.Method = HttpMethod.Post && req.RequestUri.AbsolutePath.Contains("/image/generate") then
                    TestMocks.jsonResponse
                        HttpStatusCode.OK
                        $"""{{"image_base64":"{tinyPngBase64}","width":640,"height":360}}"""
                elif req.Method = HttpMethod.Post && req.RequestUri.AbsolutePath.Contains("/image/upscale") then
                    upscaleCalled := true
                    TestMocks.jsonResponse
                        HttpStatusCode.OK
                        $"""{{"image_base64":"{tinyPngBase64}","width":1280,"height":720}}"""
                elif req.Method = HttpMethod.Post && req.RequestUri.AbsolutePath.EndsWith("/unload") then
                    TestMocks.jsonResponse HttpStatusCode.OK """{"ok":true}"""
                else
                    TestMocks.jsonResponse HttpStatusCode.NotFound """{"error":"not found"}""")

        let client = new HttpClient(handler, disposeHandler = true)
        client.BaseAddress <- Uri("http://worker.test/")
        let provider = PythonWorkerProvider.PythonWorkerProvider("http://worker.test/", client)
        provider, ttsCalled, upscaleCalled

    let private waitForBakeOutput (store: ProjectStore.ProjectStore) (projectId: Guid) (timeoutMs: int) =
        task {
            let folder = store.ProjectFolder projectId
            let bakePath =
                Path.Combine(folder, ExportJobs.BakeRelativePath.Replace('/', Path.DirectorySeparatorChar))

            let deadline = DateTime.UtcNow.AddMilliseconds(float timeoutMs)

            let rec loop () =
                task {
                    if File.Exists bakePath then
                        return ()
                    elif DateTime.UtcNow >= deadline then
                        return failwith "bake output not ready"
                    else
                        do! Task.Delay 100
                        return! loop ()
                }

            return! loop ()
        }

    let private waitForPreviewOutput (store: ProjectStore.ProjectStore) (projectId: Guid) (timeoutMs: int) =
        task {
            let folder = store.ProjectFolder projectId
            let previewPath =
                Path.Combine(folder, ExportJobs.PreviewRelativePath.Replace('/', Path.DirectorySeparatorChar))

            let deadline = DateTime.UtcNow.AddMilliseconds(float timeoutMs)

            let rec loop () =
                task {
                    if File.Exists previewPath then
                        return ()
                    elif DateTime.UtcNow >= deadline then
                        return failwith "preview output not ready"
                    else
                        do! Task.Delay 100
                        return! loop ()
                }

            return! loop ()
        }

    let private waitForBlockAudio (client: HttpClient) (projectId: Guid) (blockId: Guid) (timeoutMs: int) =
        task {
            let deadline = DateTime.UtcNow.AddMilliseconds(float timeoutMs)

            let rec loop () =
                task {
                    let! resp = client.GetAsync($"/projects/{projectId}")
                    let! body = resp.Content.ReadAsStringAsync()
                    let block =
                        JsonDocument.Parse(body).RootElement.GetProperty("blocks").EnumerateArray()
                        |> Seq.find (fun el -> el.GetProperty("id").GetGuid() = blockId)

                    let audioPath =
                        block.TryGetProperty("audio")
                        |> function
                            | true, audio -> audio.TryGetProperty("path") |> function | true, p -> Some(p.GetString()) | _ -> None
                            | _ -> None

                    match audioPath with
                    | Some path when path.StartsWith("assets/") -> return path
                    | _ when DateTime.UtcNow >= deadline -> return failwith "voiceover audio not ready"
                    | _ ->
                        do! Task.Delay 100
                        return! loop ()
                }

            return! loop ()
        }

    let private waitJobOnChannel (ch: System.Threading.Channels.Channel<JobEvent>) (jobId: Guid) (timeoutMs: int) =
        task {
            let steps = ResizeArray<string>()
            let deadline = DateTime.UtcNow.AddMilliseconds(float timeoutMs)

            let rec loop () =
                task {
                    if DateTime.UtcNow >= deadline then
                        return steps |> Seq.toList
                    else
                        let delay = Task.Delay 50
                        let read = ch.Reader.ReadAsync().AsTask()
                        let! winner = Task.WhenAny(read, delay)

                        if winner = read then
                            let! evt = read

                            if evt.JobId = jobId then
                                steps.Add evt.Step

                                if evt.Status = JobStatus.Completed || evt.Status = JobStatus.Failed then
                                    return steps |> Seq.toList
                                else
                                    return! loop ()
                            else
                                return! loop ()
                        else
                            return! loop ()
                }

            return! loop ()
        }

    let private createProjectWithBlock (fixture: TestHostFactory.TestHostFixture) name =
        fixture.CreateProjectWithBlock name

    [<Collection("HostSerial")>]
    type VoiceoverTtsTests() =
        let worker, ttsCalled, _ = createWorkerWithTtsAndUpscale ()

        let overrides =
            { Worker = Some worker
              Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

        let fixture = TestHostFactory.TestHostFixture(Some overrides)

        [<Fact>]
        let ``POST voiceover generate calls worker TTS and saves audio`` () =
            task {
                MediaProbe.audioProbeHook <- Some(fun _ -> Ok 3.7)
                let! projectId = createProjectWithBlock fixture "Voiceover TTS"
                let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                let! getBody = getResp.Content.ReadAsStringAsync()
                let blockId = JsonDocument.Parse(getBody).RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head |> fun el -> el.GetProperty("id").GetGuid()

                let patchBody = """{"voiceoverScript":"Hello from TTS worker"}"""
                use patch = new StringContent(patchBody, Encoding.UTF8, "application/json")
                let! _ = fixture.Client.PatchAsync($"/projects/{projectId}/blocks/{blockId}", patch)

                let! response =
                    fixture.Client.PostAsync(
                        $"/projects/{projectId}/blocks/{blockId}/voiceover/generate",
                        new StringContent("", Encoding.UTF8, "application/json")
                    )

                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! _ = waitForBlockAudio fixture.Client projectId blockId 5000
                !ttsCalled |> should equal true

                let! projectResp = fixture.Client.GetAsync($"/projects/{projectId}")
                let! projectBody = projectResp.Content.ReadAsStringAsync()
                let block =
                    JsonDocument.Parse(projectBody).RootElement.GetProperty("blocks").EnumerateArray()
                    |> Seq.head

                block.GetProperty("audio").GetProperty("path").GetString()
                |> should startWith "assets/"

                block.GetProperty("mockupDurationSec").GetDouble() |> should equal 3.7
            }

        interface IDisposable with
            member _.Dispose() =
                MediaProbe.audioProbeHook <- None
                TestMocks.clearFfmpegStubs ()
                (fixture :> IDisposable).Dispose()

    [<Collection("HostSerial")>]
    type BakeUpscaleTests() =
        let worker, _, upscaleCalled = createWorkerWithTtsAndUpscale ()

        let overrides =
            { Worker = Some worker
              Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

        let fixture = TestHostFactory.TestHostFixture(Some overrides)

        [<Fact>]
        let ``Bake job prefers upscaled image path`` () =
            task {
                TestMocks.installFfmpegStubs()
                let kenBurnsInputs = ResizeArray<string>()
                let prev = FfmpegExport.kenBurnsHook

                FfmpegExport.kenBurnsHook <-
                    Some(fun opts ct ->
                        kenBurnsInputs.Add opts.InputPath
                        prev.Value opts ct)

                try
                    let! projectId = createProjectWithBlock fixture "Bake upscale path"
                    let folder = fixture.Services.Store.ProjectFolder projectId
                    let upscaledDir = Path.Combine(folder, "assets")
                    Directory.CreateDirectory upscaledDir |> ignore
                    let upscaledPath = Path.Combine(upscaledDir, "upscaled.png")
                    File.WriteAllBytes(upscaledPath, [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy |])

                    let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                    let! getBody = getResp.Content.ReadAsStringAsync()
                    let blockId = JsonDocument.Parse(getBody).RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head |> fun el -> el.GetProperty("id").GetGuid()

                    let patchBody =
                        """{"artifacts":{"upscaledImagePath":"assets/upscaled.png"}}"""

                    use patch = new StringContent(patchBody, Encoding.UTF8, "application/json")
                    let! _ = fixture.Client.PatchAsync($"/projects/{projectId}/blocks/{blockId}", patch)

                    let! response =
                        fixture.Client.PostAsync($"/projects/{projectId}/bake", new StringContent("", Encoding.UTF8, "application/json"))

                    response.StatusCode |> should equal HttpStatusCode.Accepted
                    let! _ = waitForBakeOutput fixture.Services.Store projectId 8000
                    kenBurnsInputs.Count |> should equal 1
                    kenBurnsInputs.[0] |> should endWith "upscaled.png"
                finally
                    FfmpegExport.kenBurnsHook <- prev
            }

        [<Fact>]
        let ``Bake SSE includes upscale step when worker upscale queued`` () =
            task {
                TestMocks.installFfmpegStubs()
                let! projectId = createProjectWithBlock fixture "Bake upscale SSE"
                let eventCh = fixture.Services.Events.SubscribeGlobal()
                let! response =
                    fixture.Client.PostAsync($"/projects/{projectId}/bake", new StringContent("", Encoding.UTF8, "application/json"))

                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! respBody = response.Content.ReadAsStringAsync()
                let jobId = JsonDocument.Parse(respBody).RootElement.GetProperty("jobId").GetGuid()
                let! steps = waitJobOnChannel eventCh jobId 8000
                steps |> should contain "upscale"
                steps |> should contain "done"
                !upscaleCalled |> should equal true
            }

        interface IDisposable with
            member _.Dispose() =
                TestMocks.clearFfmpegStubs ()
                TestMocks.clearColorStub ()
                (fixture :> IDisposable).Dispose()

    [<Collection("HostSerial")>]
    type TransitionExportTests() =
        let overrides =
            { Worker = Some(TestMocks.createWorkerProvider())
              Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

        let fixture = TestHostFactory.TestHostFixture(Some overrides)

        [<Fact>]
        let ``Mockup concat uses block transition toNext duration`` () =
            task {
                TestMocks.installFfmpegStubs()
                let capturedArgs = ResizeArray<string list>()
                let prev = FfmpegExport.ffmpegHook

                FfmpegExport.ffmpegHook <-
                    Some(fun args ->
                        capturedArgs.Add args
                        prev.Value args)

                try
                    let! projectId = createProjectWithBlock fixture "Transition dur"
                    let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                    let! getBody = getResp.Content.ReadAsStringAsync()
                    let blockId = JsonDocument.Parse(getBody).RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head |> fun el -> el.GetProperty("id").GetGuid()

                    let patchBody =
                        """{"transitions":{"toNext":{"type":"crossfade","durationMs":450}}}"""

                    use patch = new StringContent(patchBody, Encoding.UTF8, "application/json")
                    let! _ = fixture.Client.PatchAsync($"/projects/{projectId}/blocks/{blockId}", patch)

                    use multipart2 = new MultipartFormDataContent()
                    let pngBytes2 = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                    let fileContent2 = new ByteArrayContent(pngBytes2)
                    fileContent2.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                    multipart2.Add(fileContent2, "file", "frame2.png")
                    let! _ = fixture.Client.PostAsync($"/projects/{projectId}/blocks/import", multipart2)

                    let! get2 = fixture.Client.GetAsync($"/projects/{projectId}")
                    let! body2 = get2.Content.ReadAsStringAsync()
                    let block2 =
                        JsonDocument.Parse(body2).RootElement.GetProperty("blocks").EnumerateArray()
                        |> Seq.skip 1
                        |> Seq.head
                        |> fun el -> el.GetProperty("id").GetGuid()

                    use patch2 = new StringContent(patchBody, Encoding.UTF8, "application/json")
                    let! _ = fixture.Client.PatchAsync($"/projects/{projectId}/blocks/{block2}", patch2)

                    let! previewResp =
                        fixture.Client.PostAsync($"/projects/{projectId}/preview", new StringContent("", Encoding.UTF8, "application/json"))

                    previewResp.StatusCode |> should equal HttpStatusCode.Accepted
                    let! _ = waitForPreviewOutput fixture.Services.Store projectId 8000

                    let xfadeArgs =
                        capturedArgs
                        |> Seq.tryFind (fun args -> args |> List.exists (fun a -> a.Contains("xfade")))

                    xfadeArgs.IsSome |> should equal true

                    xfadeArgs.Value
                    |> List.tryFind (fun a -> a.Contains("duration=0.45"))
                    |> Option.isSome
                    |> should equal true
                finally
                    FfmpegExport.ffmpegHook <- prev
            }

        interface IDisposable with
            member _.Dispose() =
                TestMocks.clearFfmpegStubs ()
                TestMocks.clearColorStub ()
                (fixture :> IDisposable).Dispose()

    [<Collection("HostSerial")>]
    type GenerationSeedTests() =
        let overrides =
            { Worker = Some(TestMocks.createWorkerProvider())
              Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

        let fixture = TestHostFactory.TestHostFixture(Some overrides)

        [<Fact>]
        let ``Generate stores generation seed on block`` () =
            task {
                let! projectId = createProjectWithBlock fixture "Gen seed"
                let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                let! getBody = getResp.Content.ReadAsStringAsync()
                let blockId = JsonDocument.Parse(getBody).RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head |> fun el -> el.GetProperty("id").GetGuid()

                let body = """{"variantCount":1,"prompt":"seed test","seed":424242}"""
                use content = new StringContent(body, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/blocks/{blockId}/generate", content)
                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! respBody = response.Content.ReadAsStringAsync()
                let block = JsonDocument.Parse(respBody).RootElement.GetProperty("block")
                block.GetProperty("generation").GetProperty("seed").GetInt32() |> should equal 424242
            }

        [<Fact>]
        let ``Regenerate accepts optional seed param`` () =
            task {
                let! projectId = createProjectWithBlock fixture "Regen seed"
                let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                let! getBody = getResp.Content.ReadAsStringAsync()
                let blockId = JsonDocument.Parse(getBody).RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head |> fun el -> el.GetProperty("id").GetGuid()

                let body = """{"variantCount":1,"seed":77777}"""
                use content = new StringContent(body, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/blocks/{blockId}/generate", content)
                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! respBody = response.Content.ReadAsStringAsync()
                let block = JsonDocument.Parse(respBody).RootElement.GetProperty("block")
                block.GetProperty("generation").GetProperty("seed").GetInt32() |> should equal 77777
            }

        interface IDisposable with
            member _.Dispose() =
                TestMocks.clearFfmpegStubs ()
                TestMocks.clearColorStub ()
                (fixture :> IDisposable).Dispose()

    [<Collection("HostSerial")>]
    type FfmpegSingleFlightTests() =
        let overrides =
            { Worker = Some(TestMocks.createWorkerProvider())
              Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

        let fixture = TestHostFactory.TestHostFixture(Some overrides)

        let createProjectWithBlocks blockCount name =
            task {
                let content = new StringContent($"{{\"name\":\"{name}\"}}", Encoding.UTF8, "application/json")
                let! createResponse = fixture.Client.PostAsync("/projects", content)
                createResponse.EnsureSuccessStatusCode() |> ignore
                let! createBody = createResponse.Content.ReadAsStringAsync()
                let projectId = JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid()
                fixture.TrackProject projectId

                let rec importBlock i =
                    task {
                        if i > blockCount then
                            return ()
                        else
                            use multipart = new MultipartFormDataContent()
                            let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                            let fileContent = new ByteArrayContent(pngBytes)
                            fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                            multipart.Add(fileContent, "file", $"frame{i}.png")
                            let! _ = fixture.Client.PostAsync($"/projects/{projectId}/blocks/import", multipart)
                            return! importBlock (i + 1)
                    }

                let! _ = importBlock 1
                return projectId
            }

        [<Fact>]
        let ``Mockup preview ffmpeg hook runs single-flight`` () =
            task {
                let concurrent = ref 0
                let maxConcurrent = ref 0
                let flightLock = obj ()
                let prevKb = FfmpegExport.kenBurnsHook
                let prevFf = FfmpegExport.ffmpegHook

                FfmpegExport.kenBurnsHook <-
                    Some(fun opts _ct ->
                        lock flightLock (fun () ->
                            concurrent := !concurrent + 1

                            if !concurrent > !maxConcurrent then
                                maxConcurrent := !concurrent)

                        Thread.Sleep(80)

                        lock flightLock (fun () ->
                            concurrent := !concurrent - 1)

                        let dir = Path.GetDirectoryName opts.OutputPath

                        if not (String.IsNullOrEmpty dir) then
                            Directory.CreateDirectory dir |> ignore

                        File.WriteAllBytes(opts.OutputPath, [| 0uy; 0uy; 0uy; 0uy |])

                        { FfmpegExport.Success = true
                          OutputPath = Some opts.OutputPath
                          Message = "slow stub"
                          Args = [] })

                FfmpegExport.ffmpegHook <-
                    Some(fun args ->
                        let dest =
                            args
                            |> List.filter (fun a -> a.EndsWith(".mp4"))
                            |> List.tryLast

                        match dest with
                        | Some dest ->
                            let dir = Path.GetDirectoryName dest

                            if not (String.IsNullOrEmpty dir) then
                                Directory.CreateDirectory dir |> ignore

                            File.WriteAllBytes(dest, [| 0uy; 0uy; 0uy; 0uy |])
                            Ok "stub"
                        | None -> Ok "stub")

                try
                    let! projectId = createProjectWithBlocks 3 "FFmpeg single-flight"
                    let! first =
                        fixture.Client.PostAsync($"/projects/{projectId}/preview", new StringContent("", Encoding.UTF8, "application/json"))

                    first.StatusCode |> should equal HttpStatusCode.Accepted

                    let! second =
                        fixture.Client.PostAsync($"/projects/{projectId}/preview", new StringContent("", Encoding.UTF8, "application/json"))

                    second.StatusCode |> should equal HttpStatusCode.Accepted
                    let! _ = waitForPreviewOutput fixture.Services.Store projectId 15000
                    maxConcurrent.Value |> should equal 1
                finally
                    FfmpegExport.kenBurnsHook <- prevKb
                    FfmpegExport.ffmpegHook <- prevFf
            }

        interface IDisposable with
            member _.Dispose() =
                TestMocks.clearFfmpegStubs ()
                (fixture :> IDisposable).Dispose()

    type McpManifestTests() =
        [<Fact>]
        let ``MCP tools manifest lists validate preview bake`` () =
            let repoRoot = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", ".."))
            let manifestPath = Path.Combine(repoRoot, "cli", "mcp", "tools.json")
            File.Exists manifestPath |> should equal true
            let json = File.ReadAllText manifestPath
            let doc = JsonDocument.Parse json
            let names =
                doc.RootElement.GetProperty("tools").EnumerateArray()
                |> Seq.map (fun el -> el.GetProperty("name").GetString())
                |> Seq.toList

            names |> should contain "validate"
            names |> should contain "preview"
            names |> should contain "bake"

    type InstallerScriptTests() =
        [<Fact>]
        let ``build-installer script parses and references required steps`` () =
            let repoRoot = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", ".."))
            let scriptPath = Path.Combine(repoRoot, "scripts", "build-installer.ps1")
            File.Exists scriptPath |> should equal true
            let script = File.ReadAllText scriptPath
            let escapedPath = scriptPath.Replace("'", "''")

            let psi = ProcessStartInfo()
            psi.FileName <- "pwsh"
            psi.Arguments <-
                "-NoProfile -Command \"$errors = $null; $null = [System.Management.Automation.Language.Parser]::ParseFile('"
                + escapedPath
                + "', [ref]$null, [ref]$errors); if ($errors) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 } else { exit 0 }\""

            psi.RedirectStandardError <- true
            psi.RedirectStandardOutput <- true
            psi.UseShellExecute <- false
            use proc = Process.Start psi
            proc.WaitForExit 30000
            proc.ExitCode |> should equal 0
            script.Contains("build-sidecars.ps1") |> should equal true
            script.Contains("verify-sidecar-staging.ps1") |> should equal true
            script.Contains("build-prereqs.ps1") |> should equal true
            script.Contains("tauri build") |> should equal true
