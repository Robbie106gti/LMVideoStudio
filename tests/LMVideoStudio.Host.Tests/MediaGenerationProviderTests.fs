namespace LMVideoStudio.Host.Tests

open System
open System.Net
open System.Net.Http
open System.Text.Json
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Host

module MediaGenerationProviderTests =
    let private png =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

    let private request: PythonWorkerProvider.GenerateImageRequest =
        { Prompt = "cinematic fox"
          Width = 1024
          Height = 1024
          Steps = 9
          Seed = 42
          ImageBase64 = None
          Strength = 0.35 }

    [<Fact>]
    let ``Auto image mode uses Lemonade only when exact model is downloaded`` () =
        task {
            let paths = ResizeArray<string>()
            let mutable generationBody = ""

            let handler =
                TestMocks.StubHttpHandler(fun req ->
                    paths.Add req.RequestUri.AbsolutePath

                    match req.Method.Method, req.RequestUri.AbsolutePath with
                    | "GET", "/api/v1/health" ->
                        TestMocks.jsonResponse HttpStatusCode.OK """{"status":"ok"}"""
                    | "GET", "/api/v1/models" ->
                        TestMocks.jsonResponse HttpStatusCode.OK """{"data":[{"id":"user.Z-Image-Turbo-Q6","downloaded":true}]}"""
                    | "POST", "/api/v1/images/generations" ->
                        generationBody <- req.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                        TestMocks.jsonResponse HttpStatusCode.OK $"""{{"data":[{{"b64_json":"{png}"}}]}}"""
                    | "POST", "/api/v1/unload" ->
                        TestMocks.jsonResponse HttpStatusCode.OK """{"status":"success"}"""
                    | _ -> TestMocks.jsonResponse HttpStatusCode.NotFound "{}")

            use client = new HttpClient(handler, disposeHandler = true)
            use worker = TestMocks.createWorkerProvider()
            use provider =
                MediaGenerationProvider.MediaGenerationProvider(
                    { Mode = MediaGenerationProvider.ImageProviderMode.Auto
                      LemonadeBaseUrl = "http://lemonade.test"
                      LemonadeModel = "user.Z-Image-Turbo-Q6" },
                    worker,
                    client
                )

            let! generated = provider.GenerateImage { request with Steps = 25 }

            match generated with
            | Error error -> failwith error
            | Ok result ->
                result.Provider |> should equal "lemonade"
                result.Image.ImageBase64 |> should equal png

            paths
            |> Seq.toList
            |> should equal [ "/api/v1/health"; "/api/v1/models"; "/api/v1/images/generations"; "/api/v1/unload" ]

            use payload = JsonDocument.Parse generationBody
            payload.RootElement.GetProperty("steps").GetInt32() |> should equal 9
        }

    [<Fact>]
    let ``Auto image mode preserves worker fallback when Lemonade model is absent`` () =
        task {
            let handler =
                TestMocks.StubHttpHandler(fun req ->
                    if req.RequestUri.AbsolutePath.EndsWith("/health") then
                        TestMocks.jsonResponse HttpStatusCode.OK """{"status":"ok"}"""
                    else
                        TestMocks.jsonResponse HttpStatusCode.OK """{"data":[{"id":"SD-Turbo","downloaded":true}]}""")

            use client = new HttpClient(handler, disposeHandler = true)
            use worker = TestMocks.createWorkerProvider()
            use provider =
                MediaGenerationProvider.MediaGenerationProvider(
                    { Mode = MediaGenerationProvider.ImageProviderMode.Auto
                      LemonadeBaseUrl = "http://lemonade.test"
                      LemonadeModel = "user.Z-Image-Turbo-Q6" },
                    worker,
                    client
                )

            let! generated = provider.GenerateImage request

            match generated with
            | Error error -> failwith error
            | Ok result -> result.Provider |> should equal "worker"
        }

    [<Fact>]
    let ``Auto image mode preserves worker img2img when Lemonade is ready`` () =
        task {
            let handler =
                TestMocks.StubHttpHandler(fun req ->
                    if req.RequestUri.AbsolutePath.EndsWith("/health") then
                        TestMocks.jsonResponse HttpStatusCode.OK """{"status":"ok"}"""
                    else
                        TestMocks.jsonResponse HttpStatusCode.OK """{"data":[{"id":"user.Z-Image-Turbo-Q6","downloaded":true}]}""")

            use client = new HttpClient(handler, disposeHandler = true)
            use worker = TestMocks.createWorkerProvider()
            use provider =
                MediaGenerationProvider.MediaGenerationProvider(
                    { Mode = MediaGenerationProvider.ImageProviderMode.Auto
                      LemonadeBaseUrl = "http://lemonade.test"
                      LemonadeModel = "user.Z-Image-Turbo-Q6" },
                    worker,
                    client
                )

            let! generated = provider.GenerateImage { request with ImageBase64 = Some png }

            match generated with
            | Error error -> failwith error
            | Ok result -> result.Provider |> should equal "worker"
        }

    [<Fact>]
    let ``Explicit Lemonade image mode fails closed when model is absent`` () =
        task {
            let handler =
                TestMocks.StubHttpHandler(fun req ->
                    if req.RequestUri.AbsolutePath.EndsWith("/health") then
                        TestMocks.jsonResponse HttpStatusCode.OK """{"status":"ok"}"""
                    else
                        TestMocks.jsonResponse HttpStatusCode.OK """{"data":[]}""")

            use client = new HttpClient(handler, disposeHandler = true)
            use worker = TestMocks.createWorkerProvider()
            use provider =
                MediaGenerationProvider.MediaGenerationProvider(
                    { Mode = MediaGenerationProvider.ImageProviderMode.Lemonade
                      LemonadeBaseUrl = "http://lemonade.test"
                      LemonadeModel = "user.Z-Image-Turbo-Q6" },
                    worker,
                    client
                )

            let! generated = provider.GenerateImage request

            match generated with
            | Ok _ -> failwith "Expected explicit Lemonade mode to fail"
            | Error error -> error.Contains("not downloaded") |> should equal true
        }

module SdCppVideoProviderTests =
    let private video = Convert.ToBase64String([| 0x1Auy; 0x45uy; 0xDFuy; 0xA3uy |])

    [<Fact>]
    let ``Video provider requires advertised vid_gen capability`` () =
        task {
            let handler =
                TestMocks.StubHttpHandler(fun _ ->
                    TestMocks.jsonResponse HttpStatusCode.OK """{"supported_modes":["img_gen"]}""")

            use client = new HttpClient(handler, disposeHandler = true)
            use provider = SdCppVideoProvider.SdCppVideoProvider("http://127.0.0.1:1234", client)
            let! health = provider.HealthCheck()

            health.Ready |> should equal false
            health.SupportedModes |> should equal [ "img_gen" ]
        }

    [<Fact>]
    let ``Video provider submits and polls native async contract`` () =
        task {
            let paths = ResizeArray<string>()
            let mutable submissionBody = ""

            let handler =
                TestMocks.StubHttpHandler(fun req ->
                    paths.Add req.RequestUri.AbsolutePath

                    match req.Method.Method, req.RequestUri.AbsolutePath with
                    | "GET", "/sdcpp/v1/capabilities" ->
                        TestMocks.jsonResponse HttpStatusCode.OK """{"supported_modes":["img_gen","vid_gen"]}"""
                    | "POST", "/sdcpp/v1/vid_gen" ->
                        submissionBody <- req.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                        TestMocks.jsonResponse HttpStatusCode.Accepted """{"id":"job_1","status":"queued","poll_url":"/sdcpp/v1/jobs/job_1"}"""
                    | "GET", "/sdcpp/v1/jobs/job_1" ->
                        TestMocks.jsonResponse HttpStatusCode.OK $"""{{"id":"job_1","status":"completed","result":{{"output_format":"webm","mime_type":"video/webm","fps":16,"frame_count":33,"b64_json":"{video}"}}}}"""
                    | _ -> TestMocks.jsonResponse HttpStatusCode.NotFound "{}")

            use client = new HttpClient(handler, disposeHandler = true)
            use provider = SdCppVideoProvider.SdCppVideoProvider("http://127.0.0.1:1234", client, TimeSpan.Zero)

            let! result =
                provider.Generate(
                    { Prompt = "fox walking"
                      Width = 832
                      Height = 480
                      Frames = 34
                      Fps = 16
                      Steps = 28
                      Seed = 42
                      InitImageBase64 = None }
                )

            match result with
            | Error error -> failwith error
            | Ok output ->
                output.FrameCount |> should equal 33
                output.MimeType |> should equal "video/webm"
                output.VideoBase64 |> should equal video

            paths |> Seq.toList |> should equal [ "/sdcpp/v1/capabilities"; "/sdcpp/v1/vid_gen"; "/sdcpp/v1/jobs/job_1" ]

            use payload = JsonDocument.Parse submissionBody
            payload.RootElement.GetProperty("video_frames").GetInt32() |> should equal 33
            payload.RootElement.GetProperty("init_image").ValueKind |> should equal JsonValueKind.Null
        }

    [<Theory>]
    [<InlineData("http://localhost:1234")>]
    [<InlineData("http://192.168.1.5:1234")>]
    [<InlineData("https://127.0.0.1:1234")>]
    let ``Video provider rejects non explicit HTTP IPv4 loopback`` url =
        (fun () -> SdCppVideoProvider.SdCppVideoProvider(url) |> ignore)
        |> should throw typeof<ArgumentException>
