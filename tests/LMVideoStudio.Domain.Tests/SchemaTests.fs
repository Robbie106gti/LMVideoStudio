namespace LMVideoStudio.Domain.Tests

open System
open System.Text.Json
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain

module SchemaTests =
    [<Fact>]
    let ``Encoded project contains required schema fields`` () =
        let project = Project.create "Schema shape"
        let json = Json.encodeProject project
        use doc = JsonDocument.Parse json
        let root = doc.RootElement
        root.GetProperty("schemaVersion").GetInt32() |> should equal 1
        root.GetProperty("name").GetString() |> should equal "Schema shape"
        root.GetProperty("sequencePreset").GetString() |> should not' (equal null)
        root.TryGetProperty("renderDefaults") |> fst |> should equal true
        root.TryGetProperty("blocks") |> fst |> should equal true

    [<Fact>]
    let ``Unknown sequencePreset fails decode`` () =
        let json =
            Json.encodeProject (Project.create "Bad preset")
            |> fun s -> s.Replace("1080p24", "not_a_preset")

        (fun () -> Json.decodeProject json |> ignore)
        |> should throw typeof<Exception>

    [<Fact>]
    let ``Missing required name property fails decode`` () =
        let json =
            Json.encodeProject (Project.create "No name key")
            |> fun s -> s.Replace("\"name\":", "\"title\":")

        match Json.decodeProject json with
        | Error _ -> ()
        | Ok _ -> failwith "expected decode error"
