namespace LMVideoStudio.Host.Tests

open System
open System.IO
open System.Net
open System.Net.Http
open System.Net.Http.Headers
open System.Text
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain
open LMVideoStudio.Host.Program

module ApiIntegrationTests =
    [<Collection("HostSerial")>]
    type ApiTests() =
        let fixture = TestHostFactory.TestHostFixture(None)

        [<Fact>]
        let ``GET health returns ok`` () =
            task {
                let! response = fixture.Client.GetAsync("/health")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("ok") |> should equal true
            }

        [<Fact>]
        let ``GET projects returns empty list initially`` () =
            task {
                let! response = fixture.Client.GetAsync("/projects")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("[]") |> should equal true
            }

        [<Fact>]
        let ``POST projects creates project`` () =
            task {
                let content = new StringContent("{\"name\":\"Integration test\"}", Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync("/projects", content)
                response.StatusCode |> should equal HttpStatusCode.Created
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("Integration test") |> should equal true
                body.Contains("schemaVersion") |> should equal true
            }

        [<Fact>]
        let ``OPTIONS projects includes CORS headers`` () =
            task {
                use request = new HttpRequestMessage(HttpMethod.Options, "/projects")
                request.Headers.Add("Origin", "http://localhost:1420")
                request.Headers.Add("Access-Control-Request-Method", "POST")
                let! response = fixture.Client.SendAsync(request)
                response.Headers.Contains("Access-Control-Allow-Origin") |> should equal true
            }

        [<Fact>]
        let ``POST projects validate accepts valid project`` () =
            task {
                let project = Project.create "Validate me"
                let json = Json.encodeProject project
                let content = new StringContent(json, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync("/projects/validate", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("valid") |> should equal true
            }

        [<Fact>]
        let ``POST projects validate rejects invalid mockup duration`` () =
            task {
                let project =
                    let p = Project.create "Bad duration"
                    { p with DefaultMockupDurationSec = 10.0 }

                let json = Json.encodeProject project
                let content = new StringContent(json, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync("/projects/validate", content)
                response.StatusCode |> should equal HttpStatusCode.BadRequest
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("valid") |> should equal true
            }

        [<Fact>]
        let ``Created project JSON passes schema validation`` () =
            let services = buildHostServices (fixture.RepoRoot, None)
            let project = Project.create "Schema store"
            match services.Store.Save project with
            | Ok () ->
                let json = Json.encodeProject project
                match services.Store.ValidateJson json with
                | Ok _ -> ()
                | Error err -> failwith $"schema validation failed: {err}"
            | Error err -> failwith err

        [<Fact>]
        let ``POST blocks import stores image and returns projectJson`` () =
            task {
                let createContent =
                    new StringContent("{\"name\":\"Import image test\"}", Encoding.UTF8, "application/json")

                let! createResponse = fixture.Client.PostAsync("/projects", createContent)
                createResponse.StatusCode |> should equal HttpStatusCode.Created
                let! createBody = createResponse.Content.ReadAsStringAsync()
                let projectId = System.Text.Json.JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid()

                use multipart = new MultipartFormDataContent()
                let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                let fileContent = new ByteArrayContent(pngBytes)
                fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                multipart.Add(fileContent, "file", "test.png")

                use request =
                    new HttpRequestMessage(HttpMethod.Post, $"/projects/{projectId}/blocks/import")

                request.Content <- multipart
                request.Headers.Add("Origin", "http://localhost:1420")

                let! response = fixture.Client.SendAsync(request)
                response.StatusCode |> should equal HttpStatusCode.Created
                response.Headers.Contains("Access-Control-Allow-Origin") |> should equal true

                let! body = response.Content.ReadAsStringAsync()
                body.Contains("projectJson") |> should equal true
                body.Contains("test.png") |> should equal true

                match Json.decodeProject (
                    System.Text.Json.JsonDocument.Parse(body).RootElement.GetProperty("projectJson").GetString()
                ) with
                | Ok project ->
                    project.Blocks.Length |> should equal 1

                    let block = List.head project.Blocks
                    block.ThumbnailPath.IsSome |> should equal true
                    block.ThumbnailPath.Value |> should startWith "assets/"

                    let! mediaResponse =
                        fixture.Client.GetAsync(
                            $"/projects/{projectId}/media/{block.ThumbnailPath.Value}"
                        )

                    mediaResponse.StatusCode |> should equal HttpStatusCode.OK
                    mediaResponse.Content.Headers.ContentType.MediaType |> should equal "image/png"
                | Error err -> failwith err
            }

        [<Fact>]
        let ``GET project media serves nested relative paths`` () =
            task {
                let createContent =
                    new StringContent("{\"name\":\"Media nested path\"}", Encoding.UTF8, "application/json")

                let! createResponse = fixture.Client.PostAsync("/projects", createContent)
                createResponse.StatusCode |> should equal HttpStatusCode.Created
                let! createBody = createResponse.Content.ReadAsStringAsync()
                let projectId = System.Text.Json.JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid()

                let services = buildHostServices (fixture.RepoRoot, None)
                let folder = services.Store.ProjectFolder projectId
                let previewDir = Path.Combine(folder, "renders", "mockup")
                Directory.CreateDirectory previewDir |> ignore
                let previewPath = Path.Combine(previewDir, "preview.mp4")
                File.WriteAllBytes(previewPath, [| 0uy; 1uy; 2uy; 3uy |])

                let! response =
                    fixture.Client.GetAsync(
                        $"/projects/{projectId}/media/renders/mockup/preview.mp4"
                    )

                response.StatusCode |> should equal HttpStatusCode.OK
                response.Content.Headers.ContentType.MediaType |> should equal "video/mp4"
            }

        [<Fact>]
        let ``GET openapi json describes API`` () =
            task {
                let! response = fixture.Client.GetAsync("/openapi.json")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("openapi") |> should equal true
                body.Contains("/api/v1/status") |> should equal true
            }

        [<Fact>]
        let ``GET api v1 status returns combined health and system`` () =
            task {
                let! response = fixture.Client.GetAsync("/api/v1/status")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("apiVersion") |> should equal true
                body.Contains("health") |> should equal true
                body.Contains("system") |> should equal true
            }

        [<Fact>]
        let ``POST share pack without preview returns bad request`` () =
            task {
                let createContent =
                    new StringContent("{\"name\":\"Share pack test\"}", Encoding.UTF8, "application/json")

                let! createResponse = fixture.Client.PostAsync("/projects", createContent)
                createResponse.StatusCode |> should equal HttpStatusCode.Created
                let! createBody = createResponse.Content.ReadAsStringAsync()
                let projectId = System.Text.Json.JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid()

                let! response =
                    fixture.Client.PostAsync(
                        $"/projects/{projectId}/export/share-pack",
                        new StringContent("", Encoding.UTF8, "application/json")
                    )

                response.StatusCode |> should equal HttpStatusCode.BadRequest
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("preview") |> should equal true
            }

        [<Fact>]
        let ``POST style pack import returns projectJson with CORS`` () =
            task {
                TestMocks.installColorStub()
                let createContent =
                    new StringContent("{\"name\":\"Style pack import\"}", Encoding.UTF8, "application/json")

                let! createResponse = fixture.Client.PostAsync("/projects", createContent)
                createResponse.StatusCode |> should equal HttpStatusCode.Created
                let! createBody = createResponse.Content.ReadAsStringAsync()
                let projectId = System.Text.Json.JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid()

                use multipart = new MultipartFormDataContent()
                let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                let fileContent = new ByteArrayContent(pngBytes)
                fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                multipart.Add(fileContent, "file", "logo.png")

                use request =
                    new HttpRequestMessage(HttpMethod.Post, $"/projects/{projectId}/style-pack/import")

                request.Content <- multipart
                request.Headers.Add("Origin", "http://localhost:1420")

                let! response = fixture.Client.SendAsync(request)
                response.StatusCode |> should equal HttpStatusCode.Created
                response.Headers.Contains("Access-Control-Allow-Origin") |> should equal true

                let! body = response.Content.ReadAsStringAsync()
                body.Contains("dominantColors") |> should equal true
                body.Contains("#112233") |> should equal true
                body.Contains("projectJson") |> should equal true

                match Json.decodeProject (
                    System.Text.Json.JsonDocument.Parse(body).RootElement.GetProperty("projectJson").GetString()
                ) with
                | Ok project -> project.StylePack.IsSome |> should equal true
                | Error err -> failwith err
            }

        [<Fact>]
        let ``GET preview without mockup returns ready false`` () =
            task {
                let createContent =
                    new StringContent("{\"name\":\"Preview missing\"}", Encoding.UTF8, "application/json")

                let! createResponse = fixture.Client.PostAsync("/projects", createContent)
                createResponse.StatusCode |> should equal HttpStatusCode.Created
                let! createBody = createResponse.Content.ReadAsStringAsync()
                let projectId = System.Text.Json.JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid()

                let! response = fixture.Client.GetAsync($"/projects/{projectId}/preview")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("\"ready\":false") |> should equal true
            }

        [<Fact>]
        let ``POST api v1 validate mirrors projects validate`` () =
            task {
                let project = Project.create "API v1 validate"
                let json = Json.encodeProject project
                let content = new StringContent(json, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync("/api/v1/validate", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("valid") |> should equal true
            }

        interface IDisposable with
            member _.Dispose() =
                TestMocks.clearColorStub ()
                (fixture :> IDisposable).Dispose()
