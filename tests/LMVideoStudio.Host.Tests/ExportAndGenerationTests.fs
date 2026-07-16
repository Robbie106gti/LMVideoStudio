namespace LMVideoStudio.Host.Tests

open System
open System.IO
open System.Net
open System.Net.Http
open System.Net.Http.Headers
open System.Text
open System.Text.Json
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain
open LMVideoStudio.Host
open LMVideoStudio.Host.Program

module ExportAndGenerationTests =
    [<Collection("HostSerial")>]
    type FeatureTests() =
        let overrides =
            { Worker = Some(TestMocks.createWorkerProvider())
              Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

        let fixture = TestHostFactory.TestHostFixture(Some overrides)

        let createProjectWithBlock name = fixture.CreateProjectWithBlock name

        [<Fact>]
        let ``POST preview returns 202 with jobId`` () =
            task {
                TestMocks.installFfmpegStubs()
                let! projectId = createProjectWithBlock "Preview job"
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/preview", new StringContent("", Encoding.UTF8, "application/json"))
                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("jobId") |> should equal true
                body.Contains("eventsUrl") |> should equal true
            }

        [<Fact>]
        let ``POST api v1 preview returns 202`` () =
            task {
                TestMocks.installFfmpegStubs()
                let! projectId = createProjectWithBlock "Preview v1"
                let! response = fixture.Client.PostAsync($"/api/v1/projects/{projectId}/preview", new StringContent("", Encoding.UTF8, "application/json"))
                response.StatusCode |> should equal HttpStatusCode.Accepted
            }

        [<Fact>]
        let ``POST bake returns 202 with jobId`` () =
            task {
                TestMocks.installFfmpegStubs()
                let! projectId = createProjectWithBlock "Bake job"
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/bake", new StringContent("", Encoding.UTF8, "application/json"))
                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("jobId") |> should equal true
                body.Contains("bakePath") |> should equal true
            }

        [<Fact>]
        let ``POST api v1 bake returns 202`` () =
            task {
                TestMocks.installFfmpegStubs()
                let! projectId = createProjectWithBlock "Bake v1"
                let! response = fixture.Client.PostAsync($"/api/v1/projects/{projectId}/bake", new StringContent("", Encoding.UTF8, "application/json"))
                response.StatusCode |> should equal HttpStatusCode.Accepted
            }

        [<Fact>]
        let ``POST generate thumbnail returns 202 with mock worker`` () =
            task {
                let! projectId = createProjectWithBlock "Generate"
                let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                let! getBody = getResp.Content.ReadAsStringAsync()
                let blockId = JsonDocument.Parse(getBody).RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head |> fun el -> el.GetProperty("id").GetGuid()

                let body = """{"variantCount":1,"prompt":"test scene"}"""
                use content = new StringContent(body, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/blocks/{blockId}/generate", content)
                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! respBody = response.Content.ReadAsStringAsync()
                respBody.Contains("jobId") |> should equal true
                respBody.Contains("variants") |> should equal true
            }

        [<Fact>]
        let ``POST style pack import returns dominant colors`` () =
            task {
                TestMocks.installColorStub()
                let! projectId = createProjectWithBlock "Style pack"

                use multipart = new MultipartFormDataContent()
                let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                let fileContent = new ByteArrayContent(pngBytes)
                fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                multipart.Add(fileContent, "file", "logo.png")

                let! response = fixture.Client.PostAsync($"/projects/{projectId}/style-pack/import", multipart)
                response.StatusCode |> should equal HttpStatusCode.Created
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("dominantColors") |> should equal true
                body.Contains("#112233") |> should equal true
            }

        [<Fact>]
        let ``POST outline generate returns blocks from mock Ollama`` () =
            task {
                let! projectId = createProjectWithBlock "Outline"
                let body = """{"brief":"Launch video for a coffee brand"}"""
                use content = new StringContent(body, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/outline/generate", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! respBody = response.Content.ReadAsStringAsync()
                respBody.Contains("Hook") |> should equal true
                respBody.Contains("voiceoverScript") |> should equal true
            }

        [<Fact>]
        let ``POST outline apply appends blocks`` () =
            task {
                let! projectId = createProjectWithBlock "Apply outline"
                let body =
                    """{"brief":"Test brief","blocks":[{"title":"Scene","voiceoverScript":"Hi","imagePrompt":"wide shot"}]}"""

                use content = new StringContent(body, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/outline/apply", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! respBody = response.Content.ReadAsStringAsync()
                respBody.Contains("Scene") |> should equal true
                let doc = JsonDocument.Parse respBody
                doc.RootElement.GetProperty("blocks").GetArrayLength() |> should equal 2
            }

        [<Fact>]
        let ``GET premiere export returns xmeml`` () =
            task {
                let! projectId = createProjectWithBlock "Premiere"
                let! response = fixture.Client.GetAsync($"/projects/{projectId}/export/premiere")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("<xmeml") |> should equal true
                body.Contains("<clipitem>") |> should equal true
                body.Contains("<timebase>") |> should equal true
            }

        [<Fact>]
        let ``POST share pack succeeds when preview mp4 exists`` () =
            task {
                TestMocks.installFfmpegStubs()
                let! projectId = createProjectWithBlock "Share pack ok"
                let folder = fixture.Services.Store.ProjectFolder projectId
                let previewDir = Path.Combine(folder, "renders", "mockup")
                Directory.CreateDirectory previewDir |> ignore
                File.WriteAllBytes(Path.Combine(previewDir, "preview.mp4"), [| 0uy; 1uy; 2uy; 3uy |])

                let! response =
                    fixture.Client.PostAsync(
                        $"/projects/{projectId}/export/share-pack",
                        new StringContent("", Encoding.UTF8, "application/json")
                    )

                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("outputDir") |> should equal true
                body.Contains("youtube_16x9.mp4") |> should equal true
                body.Contains("captionPath") |> should equal true
            }

        [<Fact>]
        let ``POST voiceover generate returns 202`` () =
            task {
                let! projectId = createProjectWithBlock "Voiceover"
                let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                let! getBody = getResp.Content.ReadAsStringAsync()
                let blockId = JsonDocument.Parse(getBody).RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head |> fun el -> el.GetProperty("id").GetGuid()

                let patchBody = """{"voiceoverScript":"Hello from TTS stub"}"""
                use patch = new StringContent(patchBody, Encoding.UTF8, "application/json")
                let! _ = fixture.Client.PatchAsync($"/projects/{projectId}/blocks/{blockId}", patch)

                let! response = fixture.Client.PostAsync($"/projects/{projectId}/blocks/{blockId}/voiceover/generate", new StringContent("", Encoding.UTF8, "application/json"))
                response.StatusCode |> should equal HttpStatusCode.Accepted
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("jobId") |> should equal true
                body.Contains("eventsUrl") |> should equal true
            }

        [<Fact>]
        let ``GET models status returns manifest fields`` () =
            task {
                let! response = fixture.Client.GetAsync("/models/status")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("manifestExists") |> should equal true
                body.Contains("manifestPath") |> should equal true
            }

        [<Fact>]
        let ``POST models sync route responds`` () =
            task {
                let! response = fixture.Client.PostAsync("/models/sync", new StringContent("{}", Encoding.UTF8, "application/json"))
                let ok = response.StatusCode = HttpStatusCode.OK || response.StatusCode = HttpStatusCode.InternalServerError
                ok |> should equal true
                let! body = response.Content.ReadAsStringAsync()
                (body.Contains("exitCode") || body.Contains("error")) |> should equal true
            }

        [<Fact>]
        let ``GET openapi json is valid and lists paths`` () =
            task {
                let! response = fixture.Client.GetAsync("/openapi.json")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                let doc = JsonDocument.Parse body
                doc.RootElement.GetProperty("openapi").GetString() |> should startWith "3."
                doc.RootElement.GetProperty("paths").EnumerateObject() |> Seq.length |> should be (greaterThan 5)
            }

        [<Fact>]
        let ``OPTIONS blocks import includes CORS`` () =
            task {
                let! projectId = createProjectWithBlock "CORS import"
                use request = new HttpRequestMessage(HttpMethod.Options, $"/projects/{projectId}/blocks/import")
                request.Headers.Add("Origin", "http://localhost:1420")
                request.Headers.Add("Access-Control-Request-Method", "POST")
                let! response = fixture.Client.SendAsync(request)
                response.Headers.Contains("Access-Control-Allow-Origin") |> should equal true
            }

        interface IDisposable with
            member _.Dispose() =
                TestMocks.clearFfmpegStubs ()
                TestMocks.clearColorStub ()
                (fixture :> IDisposable).Dispose()

module PremiereExportUnitTests =
    [<Fact>]
    let ``Premiere export includes sequence dimensions`` () =
        let project = Project.create "XML test"
        let blockId = Guid.NewGuid()

        let project =
            { project with
                Blocks =
                    [ { Id = blockId
                        Order = 0
                        Title = Some "Intro"
                        Source = BlockSource.Imported
                        ThumbnailPath = None
                        ImagePrompt = None
                        VoiceoverScript = None
                        DirectorNotes = None
                        MoodTags = []
                        ShotKind = None
                        MockupDurationSec = Some 3.5
                        BakeDurationSec = None
                        Transitions = None
                        Audio = None
                        Generation = None
                        Artifacts = None } ] }

        use temp = new TestCleanup.TempDirectory("lmvs-premiere-")
        let folder = temp.Path
        let xml = PremiereExport.generate folder project
        xml.Contains("<xmeml") |> should equal true
        xml.Contains("XML test") |> should equal true
        xml.Contains("<width>1920</width>") |> should equal true
        xml.Contains("<start>0</start>") |> should equal true
