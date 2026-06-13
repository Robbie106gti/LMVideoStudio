namespace LMVideoStudio.Domain.Tests

open System
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain

module ValidationTests =
    let private withProject mutate =
        let project = Project.create "Demo"
        mutate project

    [<Fact>]
    let ``Project.create passes validation`` () =
        let project = Project.create "Demo"
        Validation.validateProject project |> should equal Valid

    [<Fact>]
    let ``Empty name fails validation`` () =
        let project = withProject (fun p -> { p with Name = "   " })
        Validation.validateProject project |> should equal (Invalid [ { Path = "name"; Message = "name is required" } ])

    [<Fact>]
    let ``Default mockup duration below 3s fails`` () =
        let project = withProject (fun p -> { p with DefaultMockupDurationSec = 2.9 })
        match Validation.validateProject project with
        | Invalid issues -> issues |> List.exists (fun i -> i.Path = "defaultMockupDurationSec") |> should equal true
        | Valid -> failwith "expected invalid"

    [<Fact>]
    let ``Default mockup duration above 4s fails`` () =
        let project = withProject (fun p -> { p with DefaultMockupDurationSec = 4.1 })
        match Validation.validateProject project with
        | Invalid issues -> issues |> List.exists (fun i -> i.Path = "defaultMockupDurationSec") |> should equal true
        | Valid -> failwith "expected invalid"

    [<Theory>]
    [<InlineData(3.0)>]
    [<InlineData(4.0)>]
    let ``Default mockup duration boundaries are valid`` (duration: float) =
        let project = withProject (fun p -> { p with DefaultMockupDurationSec = duration })
        Validation.validateProject project |> should equal Valid

    [<Fact>]
    let ``Block mockup duration out of range fails`` () =
        let blockId = Guid.NewGuid()

        let project =
            withProject (fun p ->
                { p with
                    Blocks =
                        [ { Id = blockId
                            Order = 0
                            Title = None
                            Source = BlockSource.Generated
                            ThumbnailPath = None
                            ImagePrompt = None
                            VoiceoverScript = None
                            DirectorNotes = None
                            MoodTags = []
                            MockupDurationSec = Some 2.5
                            BakeDurationSec = None
                            Transitions = None
                            Audio = None
                            Generation = None
                            Artifacts = None } ] })

        match Validation.validateProject project with
        | Invalid issues ->
            issues
            |> List.exists (fun i -> i.Path = $"blocks[{blockId}].mockupDurationSec")
            |> should equal true
        | Valid -> failwith "expected invalid"

    [<Fact>]
    let ``Wrong schemaVersion fails validation`` () =
        let project = withProject (fun p -> { p with SchemaVersion = 2 })
        match Validation.validateProject project with
        | Invalid issues -> issues |> List.exists (fun i -> i.Path = "schemaVersion") |> should equal true
        | Valid -> failwith "expected invalid"

    [<Fact>]
    let ``Wrong mockup render tier fails validation`` () =
        let project =
            withProject (fun p ->
                { p with
                    RenderDefaults =
                        { p.RenderDefaults with
                            Mockup = { p.RenderDefaults.Mockup with Tier = Bake } } })

        match Validation.validateProject project with
        | Invalid issues -> issues |> List.exists (fun i -> i.Path = "renderDefaults.mockup.tier") |> should equal true
        | Valid -> failwith "expected invalid"
