namespace LMVideoStudio.Host.Tests

open System
open System.Net
open System.Net.Http
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Host

module LocalAiProviderTests =
    let private lemonadeConfig: LocalAiProvider.LocalAiConfig =
        { Provider = LocalAiProvider.ProviderKind.Lemonade
          BaseUrl = "http://lemonade.test"
          Model = "Bonsai-8B-gguf" }

    [<Fact>]
    let ``Lemonade health verifies native health and downloaded model discovery`` () =
        task {
            use provider = TestMocks.createLocalAiProvider TestMocks.sampleOutlineJson
            let! health = provider.HealthCheck()

            health.Reachable |> should equal true
            health.Provider |> should equal "lemonade"
            health.Version |> should equal (Some "11.5.1")
            health.ModelCount |> should equal (Some 1)
            health.ConfiguredModelAvailable |> should equal (Some true)
        }

    [<Fact>]
    let ``Lemonade generation uses chat completions response contract`` () =
        task {
            use provider = TestMocks.createLocalAiProvider TestMocks.sampleOutlineJson
            let! result = provider.Generate("Create an outline")

            match result with
            | Ok text -> text |> should equal TestMocks.sampleOutlineJson
            | Error error -> failwith error
        }

    [<Fact>]
    let ``Lemonade explicit load and unload use native lifecycle endpoints`` () =
        task {
            let paths = ResizeArray<string>()

            let handler =
                TestMocks.StubHttpHandler(fun request ->
                    paths.Add request.RequestUri.AbsolutePath
                    TestMocks.jsonResponse HttpStatusCode.OK """{"status":"success"}""")

            use client = new HttpClient(handler, disposeHandler = true)
            use provider = LocalAiProvider.LocalAiProvider(lemonadeConfig, client)

            let! loaded = provider.LoadModel()
            let! unloaded = provider.UnloadModel()

            match loaded with
            | Ok() -> ()
            | Error error -> failwith error

            match unloaded with
            | Ok() -> ()
            | Error error -> failwith error

            paths |> Seq.toList |> should equal [ "/api/v1/load"; "/api/v1/unload" ]
        }

    [<Fact>]
    let ``Lemonade lifecycle reports API error status even with HTTP success`` () =
        task {
            let handler =
                TestMocks.StubHttpHandler(fun _ ->
                    TestMocks.jsonResponse HttpStatusCode.OK """{"status":"error","message":"model unavailable"}""")

            use client = new HttpClient(handler, disposeHandler = true)
            use provider = LocalAiProvider.LocalAiProvider(lemonadeConfig, client)
            let! result = provider.LoadModel()

            match result with
            | Ok() -> failwith "Expected Lemonade error status to fail"
            | Error message -> message |> should equal "model unavailable"
        }

    [<Fact>]
    let ``Explicit Ollama fallback preserves tags and generate contract`` () =
        task {
            let paths = ResizeArray<string>()

            let handler =
                TestMocks.StubHttpHandler(fun request ->
                    paths.Add request.RequestUri.AbsolutePath

                    if request.Method = HttpMethod.Get then
                        TestMocks.jsonResponse HttpStatusCode.OK """{"models":[{"name":"llama3.1:latest"}]}"""
                    else
                        TestMocks.jsonResponse HttpStatusCode.OK """{"response":"fallback ok"}""")

            use client = new HttpClient(handler, disposeHandler = true)
            use provider = OllamaProvider.OllamaProvider("http://ollama.test", client)

            let! health = provider.HealthCheck()
            let! generated = provider.Generate("hello")

            health.Reachable |> should equal true
            health.ConfiguredModelAvailable |> should equal (Some true)
            match generated with
            | Ok text -> text |> should equal "fallback ok"
            | Error error -> failwith error

            paths |> Seq.toList |> should equal [ "/api/tags"; "/api/generate" ]
        }
