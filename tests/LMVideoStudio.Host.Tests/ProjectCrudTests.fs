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
open LMVideoStudio.Host.Program

module ProjectCrudTests =
    [<Collection("HostSerial")>]
    type CrudTests() =
        let fixture = TestHostFactory.TestHostFixture(None)

        let createProject name =
            task {
                let content = new StringContent($"{{\"name\":\"{name}\"}}", Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync("/projects", content)
                response.EnsureSuccessStatusCode() |> ignore
                let! body = response.Content.ReadAsStringAsync()
                return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid()
            }

        [<Fact>]
        let ``GET project by id returns project`` () =
            task {
                let! projectId = createProject "Get by id"
                let! response = fixture.Client.GetAsync($"/projects/{projectId}")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("Get by id") |> should equal true
            }

        [<Fact>]
        let ``PUT project updates name`` () =
            task {
                let! projectId = createProject "Before rename"
                let project = Project.create "Before rename"
                let updated = { project with Id = projectId; Name = "After rename" }
                let json = Json.encodeProject updated
                use content = new StringContent(json, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PutAsync($"/projects/{projectId}", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("After rename") |> should equal true
            }

        [<Fact>]
        let ``DELETE project returns 204`` () =
            task {
                let! projectId = createProject "Delete me"
                let! response = fixture.Client.DeleteAsync($"/projects/{projectId}")
                response.StatusCode |> should equal HttpStatusCode.NoContent
                let! getResponse = fixture.Client.GetAsync($"/projects/{projectId}")
                getResponse.StatusCode |> should equal HttpStatusCode.NotFound
            }

        [<Fact>]
        let ``DELETE project removes folder under LMVS_PROJECTS_ROOT`` () =
            task {
                let! projectId = createProject "Folder delete"
                let folder = Path.Combine(fixture.ProjectsRoot, projectId.ToString("N"))
                Directory.Exists folder |> should equal true

                let! response = fixture.Client.DeleteAsync($"/projects/{projectId}")
                response.StatusCode |> should equal HttpStatusCode.NoContent
                Directory.Exists folder |> should equal false
            }

        [<Fact>]
        let ``DELETE unknown project id returns 404`` () =
            task {
                let unknownId = Guid.NewGuid()
                let! response = fixture.Client.DeleteAsync($"/projects/{unknownId}")
                response.StatusCode |> should equal HttpStatusCode.NotFound
            }

        [<Fact>]
        let ``GET projects excludes deleted project`` () =
            task {
                let! keepId = createProject "Keep me"
                let! deleteId = createProject "Remove me"

                let! deleteResponse = fixture.Client.DeleteAsync($"/projects/{deleteId}")
                deleteResponse.StatusCode |> should equal HttpStatusCode.NoContent

                let! listResponse = fixture.Client.GetAsync("/projects")
                listResponse.StatusCode |> should equal HttpStatusCode.OK
                let! body = listResponse.Content.ReadAsStringAsync()
                let doc = JsonDocument.Parse body

                let ids =
                    doc.RootElement.EnumerateArray()
                    |> Seq.map (fun el -> el.GetProperty("id").GetGuid())
                    |> Seq.toList

                ids |> should contain keepId
                ids |> should not' (contain deleteId)
            }

        [<Fact>]
        let ``POST blocks reorder updates order`` () =
            task {
                let! projectId = createProject "Reorder test"

                for name in [ "a.png"; "b.png" ] do
                    use multipart = new MultipartFormDataContent()
                    let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                    let fileContent = new ByteArrayContent(pngBytes)
                    fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                    multipart.Add(fileContent, "file", name) |> ignore
                    let! _ = fixture.Client.PostAsync($"/projects/{projectId}/blocks/import", multipart)
                    ()

                let! getResp = fixture.Client.GetAsync($"/projects/{projectId}")
                let! getBody = getResp.Content.ReadAsStringAsync()
                let doc = JsonDocument.Parse getBody
                let ids =
                    doc.RootElement.GetProperty("blocks").EnumerateArray()
                    |> Seq.map (fun el -> el.GetProperty("id").GetGuid())
                    |> Seq.toList

                let reversed = List.rev ids
                let idJson = reversed |> List.map (fun id -> "\"" + id.ToString() + "\"") |> String.concat ","
                let body = "{\"blockIds\":[" + idJson + "]}"
                use content = new StringContent(body, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync($"/projects/{projectId}/blocks/reorder", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! respBody = response.Content.ReadAsStringAsync()
                let respDoc = JsonDocument.Parse respBody
                let first = respDoc.RootElement.GetProperty("blocks").EnumerateArray() |> Seq.head
                first.GetProperty("id").GetGuid() |> should equal (List.head reversed)
            }

        [<Fact>]
        let ``PATCH block updates thumbnailPath`` () =
            task {
                let! projectId = createProject "Variant pick"
                use multipart = new MultipartFormDataContent()
                let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                let fileContent = new ByteArrayContent(pngBytes)
                fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                multipart.Add(fileContent, "file", "pick.png")
                let! importResp = fixture.Client.PostAsync($"/projects/{projectId}/blocks/import", multipart)
                let! importBody = importResp.Content.ReadAsStringAsync()
                let blockId = JsonDocument.Parse(importBody).RootElement.GetProperty("block").GetProperty("id").GetGuid()

                let patchBody = """{"thumbnailPath":"assets/variant_b.png"}"""
                use content = new StringContent(patchBody, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PatchAsync($"/projects/{projectId}/blocks/{blockId}", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("assets/variant_b.png") |> should equal true
            }

        [<Fact>]
        let ``PATCH block updates crossfade duration`` () =
            task {
                let! projectId = createProject "Transition edit"
                use multipart = new MultipartFormDataContent()
                let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                let fileContent = new ByteArrayContent(pngBytes)
                fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                multipart.Add(fileContent, "file", "t.png")
                let! importResp = fixture.Client.PostAsync($"/projects/{projectId}/blocks/import", multipart)
                let! importBody = importResp.Content.ReadAsStringAsync()
                let blockId = JsonDocument.Parse(importBody).RootElement.GetProperty("block").GetProperty("id").GetGuid()

                let patchBody = """{"transitions":{"toNext":{"type":"crossfade","durationMs":450}}}"""
                use content = new StringContent(patchBody, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PatchAsync($"/projects/{projectId}/blocks/{blockId}", content)
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("450") |> should equal true
            }

        interface IDisposable with
            member _.Dispose() = (fixture :> IDisposable).Dispose()
