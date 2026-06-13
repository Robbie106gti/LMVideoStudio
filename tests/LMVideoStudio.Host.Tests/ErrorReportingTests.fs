namespace LMVideoStudio.Host.Tests

open System
open System.IO
open System.Net
open System.Net.Http
open System.Text
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain.ErrorReport
open LMVideoStudio.Host.ErrorReporting

module ErrorReportingTests =
    [<Collection("HostSerial")>]
    type ErrorReportingApiTests() =
        let reportsRoot =
            let dir = Path.Combine(Path.GetTempPath(), "lmvs-reports-test-" + Guid.NewGuid().ToString("N"))
            Directory.CreateDirectory dir |> ignore
            Environment.SetEnvironmentVariable("LMVS_REPORTS_ROOT", dir)
            dir

        let fixture = TestHostFactory.TestHostFixture(None)

        [<Fact>]
        let ``POST api v1 reports persists sanitized json`` () =
            task {
                let dirtyMessage = "api_key=hidden failure in projects\\deadbeef\\project.lmvs.json"

                let reportResult =
                    create
                        "client"
                        "error"
                        dirtyMessage
                        None
                        (Some(Map.ofList [ "method", "GET" ]))
                        None
                        (Some [ "activity tail line" ])
                        true

                let report =
                    match reportResult with
                    | Ok r -> r
                    | Error err -> failwith err

                let json = encodeToString report
                use content = new StringContent(json, Encoding.UTF8, "application/json")
                let! response = fixture.Client.PostAsync("/api/v1/reports", content)
                response.StatusCode |> should equal HttpStatusCode.Created

                let! body = response.Content.ReadAsStringAsync()
                body.Contains("reportId") |> should equal true

                let stored =
                    Directory.GetFiles(reportsRoot, "*.json", SearchOption.TopDirectoryOnly)
                    |> Array.tryHead

                match stored with
                | None -> failwith "expected stored report file"
                | Some path ->
                    let text = File.ReadAllText path
                    text.Contains("hidden") |> should equal false
                    text.Contains("[redacted]") |> should equal true
                    text.Contains("[project-path]") |> should equal true
            }

        [<Fact>]
        let ``ErrorReportingService Persist writes under reports root`` () =
            let service = ErrorReportingService fixture.RepoRoot

            let reportResult =
                create "host" "fatal" "boom" (Some "stack") None None None false

            match reportResult with
            | Ok report ->
                let path = service.Persist report
                File.Exists path |> should equal true
                let text = File.ReadAllText path
                text.Contains("boom") |> should equal true
            | Error err -> failwith err
