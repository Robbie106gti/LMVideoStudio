namespace LMVideoStudio.Host.Tests

open System
open System.Collections.Generic
open System.IO
open System.Net.Http
open System.Net.Http.Headers
open System.Text
open System.Text.Json
open System.Threading.Tasks
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.TestHost
open Microsoft.Extensions.Logging
open LMVideoStudio.Domain
open LMVideoStudio.Host
open LMVideoStudio.Host.Program

module TestHostFactory =
    type TestHostFixture(overrides: HostServiceOverrides option) =
        let repoRoot =
            let dir = Path.Combine(Path.GetTempPath(), "lmvs-host-tests-" + Guid.NewGuid().ToString("N"))
            Directory.CreateDirectory dir |> ignore
            let docsDir = Path.Combine(dir, "docs")
            Directory.CreateDirectory docsDir |> ignore

            let schemaSource =
                Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", "..", "docs", "project.schema.json"))

            File.Copy(schemaSource, Path.Combine(docsDir, "project.schema.json"), overwrite = true)
            dir

        let projectsRoot = Path.Combine(repoRoot, "projects")
        let trackedProjects = ResizeArray<Guid>()

        do
            Environment.SetEnvironmentVariable("LMVS_REPO_ROOT", repoRoot)
            Environment.SetEnvironmentVariable("LMVS_PROJECTS_ROOT", projectsRoot)

        let builder = WebApplication.CreateBuilder()
        do builder.Logging.ClearProviders() |> ignore
        do builder.WebHost.UseTestServer() |> ignore

        let services = buildHostServices (repoRoot, overrides)
        let app = configureWebApplication builder services
        do app.StartAsync().GetAwaiter().GetResult()

        member _.Client = app.GetTestClient()

        member _.RepoRoot = repoRoot

        member _.ProjectsRoot = projectsRoot

        member _.Services = services

        member this.TrackProject(projectId: Guid) =
            if not (trackedProjects.Contains projectId) then
                trackedProjects.Add projectId

        member this.DeleteProject(projectId: Guid) =
            try
                this.Client.DeleteAsync($"/projects/{projectId}").GetAwaiter().GetResult()
                |> ignore
            with _ ->
                ()

            trackedProjects.Remove projectId |> ignore

        member this.DeleteAllProjects() =
            try
                let response = this.Client.GetAsync("/projects").GetAwaiter().GetResult()
                let body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                use doc = JsonDocument.Parse body

                for el in doc.RootElement.EnumerateArray() do
                    this.DeleteProject(el.GetProperty("id").GetGuid())
            with _ ->
                ()

        member this.DeleteTrackedProjects() =
            for id in trackedProjects.ToArray() do
                this.DeleteProject id

        member this.CreateProject(name: string) =
            task {
                use content = new StringContent($"{{\"name\":\"{name}\"}}", Encoding.UTF8, "application/json")
                let! response = this.Client.PostAsync("/projects", content)
                response.EnsureSuccessStatusCode() |> ignore
                let! body = response.Content.ReadAsStringAsync()
                use doc = JsonDocument.Parse body
                let projectId = doc.RootElement.GetProperty("id").GetGuid()
                this.TrackProject projectId
                return projectId
            }

        member this.CreateProjectWithBlock(name: string) =
            task {
                let! projectId = this.CreateProject name

                use multipart = new MultipartFormDataContent()
                let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
                let fileContent = new ByteArrayContent(pngBytes)
                fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
                multipart.Add(fileContent, "file", "frame.png") |> ignore
                let! _ = this.Client.PostAsync($"/projects/{projectId}/blocks/import", multipart)
                return projectId
            }

        member this.TrackSavedProject(project: Project) = this.TrackProject project.Id

        member this.RunWithProject(name: string, f: Guid -> Task<'T>) =
            task {
                let! projectId = this.CreateProject name

                try
                    return! f projectId
                finally
                    this.DeleteProject projectId
            }

        member this.RunWithProjectBlock(name: string, f: Guid -> Task<'T>) =
            task {
                let! projectId = this.CreateProjectWithBlock name

                try
                    return! f projectId
                finally
                    this.DeleteProject projectId
            }

        interface IDisposable with
            member this.Dispose() =
                try
                    FfmpegExport.killAllActive()
                    services.Preview.CancelActive()
                    services.Bake.CancelActive()
                    this.DeleteAllProjects()
                with _ ->
                    ()

                try
                    app.StopAsync().GetAwaiter().GetResult()
                with _ ->
                    ()

                TestCleanup.deleteDirectorySafe repoRoot

                Environment.SetEnvironmentVariable("LMVS_REPO_ROOT", null)
                Environment.SetEnvironmentVariable("LMVS_PROJECTS_ROOT", null)
