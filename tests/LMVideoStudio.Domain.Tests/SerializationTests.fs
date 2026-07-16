namespace LMVideoStudio.Domain.Tests

open System
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain

module SerializationTests =
    let private roundTrip (project: Project) =
        let json = Json.encodeProject project
        match Json.decodeProject json with
        | Ok decoded -> decoded
        | Error err -> failwith $"decode failed: {err}"

    [<Fact>]
    let ``Minimal project round-trips through JSON`` () =
        let project = Project.create "Round trip"
        let decoded = roundTrip project
        decoded.Name |> should equal project.Name
        decoded.SchemaVersion |> should equal project.SchemaVersion
        decoded.Id |> should equal project.Id
        decoded.DefaultMockupDurationSec |> should equal project.DefaultMockupDurationSec

    [<Fact>]
    let ``Project with block round-trips through JSON`` () =
        let project = Project.create "With block"
        let blockId = Guid.NewGuid()

        let project =
            { project with
                Blocks =
                    [ { Id = blockId
                        Order = 0
                        Title = Some "Intro"
                        Source = BlockSource.Generated
                        ThumbnailPath = None
                        ImagePrompt = Some "sunset over mountains"
                        VoiceoverScript = Some "Welcome"
                        DirectorNotes = None
                        MoodTags = [ "calm" ]
                        ShotKind = Some BlockShotKind.BackWide
                        MockupDurationSec = Some 3.5
                        BakeDurationSec = None
                        Transitions = project.TransitionsDefault
                        Audio = None
                        Generation = Some { Seed = Some 42; ReferenceAssetPath = None; ThumbnailVariants = None }
                        Artifacts = None } ] }

        let decoded = roundTrip project
        decoded.Blocks.Length |> should equal 1
        decoded.Blocks.Head.Id |> should equal blockId
        decoded.Blocks.Head.ImagePrompt |> should equal (Some "sunset over mountains")
        decoded.Blocks.Head.ShotKind |> should equal (Some BlockShotKind.BackWide)

    [<Fact>]
    let ``Encoded JSON includes schema fields`` () =
        let project = Project.create "Encoded"
        let json = Json.encodeProject project
        json.Contains("schemaVersion") |> should equal true
        json.Contains("sequencePreset") |> should equal true
        json.Contains("renderDefaults") |> should equal true
