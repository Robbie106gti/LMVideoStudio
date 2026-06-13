namespace LMVideoStudio.Domain.Tests

open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain.ErrorReport

module ErrorReportTests =
    [<Fact>]
    let ``sanitize redacts api keys and secrets`` () =
        let dirty = "failed: api_key=supersecret token=abc123 Bearer xyz"
        let clean = sanitizeText dirty
        clean.Contains("supersecret") |> should equal false
        clean.Contains("abc123") |> should equal false
        clean.Contains("[redacted]") |> should equal true

    [<Fact>]
    let ``sanitize redacts project paths`` () =
        let dirty = @"error reading projects\abc123-def456\project.lmvs.json"
        let clean = sanitizeText dirty
        clean.Contains("project.lmvs.json") |> should equal false
        clean.Contains("[project-path]") |> should equal true

    [<Fact>]
    let ``validate rejects empty message`` () =
        let report =
            { Id = System.Guid.NewGuid()
              Timestamp = System.DateTimeOffset.UtcNow
              Source = "client"
              Severity = "error"
              Message = "   "
              Stack = None
              Context = Map.empty
              System = None
              ActivityTail = []
              UserConsented = false }

        match validate report with
        | Error msg -> msg.Contains("message") |> should equal true
        | Ok _ -> failwith "expected invalid"

    [<Fact>]
    let ``create round-trips through encode and decode`` () =
        let result =
            create
                "client"
                "error"
                "Something broke"
                (Some "at line 1")
                (Some(Map.ofList [ "route", "/projects" ]))
                None
                (Some [ "GET /health -> 500" ])
                true

        match result with
        | Error err -> failwith err
        | Ok report ->
            let json = encodeToString report

            match decodeFromString json with
            | Ok decoded ->
                decoded.Message |> should equal "Something broke"
                decoded.Source |> should equal "client"
            | Error err -> failwith err
