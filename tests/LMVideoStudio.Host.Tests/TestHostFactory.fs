namespace LMVideoStudio.Host.Tests

open System
open System.IO
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.TestHost
open Microsoft.Extensions.Logging
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

        interface IDisposable with
            member _.Dispose() =
                try
                    FfmpegExport.killAllActive()
                    services.Preview.CancelActive()
                    services.Bake.CancelActive()
                    app.StopAsync().GetAwaiter().GetResult()
                with _ ->
                    ()

                try
                    if Directory.Exists repoRoot then
                        Directory.Delete(repoRoot, recursive = true)
                with _ ->
                    ()

                Environment.SetEnvironmentVariable("LMVS_REPO_ROOT", null)
                Environment.SetEnvironmentVariable("LMVS_PROJECTS_ROOT", null)
