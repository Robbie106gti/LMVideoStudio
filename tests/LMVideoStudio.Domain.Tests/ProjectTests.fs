namespace LMVideoStudio.Domain.Tests

open System
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain

module ProjectTests =
    let private blockWithThumbnail (path: string option) =
        { Id = Guid.NewGuid()
          Order = 0
          Title = Some "Block"
          Source = BlockSource.Imported
          ThumbnailPath = path
          ImagePrompt = None
          VoiceoverScript = None
          DirectorNotes = None
          MoodTags = []
          MockupDurationSec = None
          BakeDurationSec = None
          Transitions = None
          Audio = None
          Generation = None
          Artifacts = None }

    [<Fact>]
    let ``preferBakeImagePath uses upscaled artifact path`` () =
        let block =
            { blockWithThumbnail (Some "assets/thumb.png") with
                Artifacts =
                    Some
                        { MockupVideoPath = None
                          BakeVideoPath = None
                          UpscaledImagePath = Some "assets/upscaled.png" } }

        Project.preferBakeImagePath block |> should equal (Some "assets/upscaled.png")

    [<Fact>]
    let ``preferBakeImagePath falls back to thumbnail`` () =
        let block = blockWithThumbnail (Some "assets/thumb.png")
        Project.preferBakeImagePath block |> should equal (Some "assets/thumb.png")

    [<Fact>]
    let ``preferBakeImagePath finds upscaled variant name`` () =
        let block =
            { blockWithThumbnail (Some "assets/thumb.png") with
                Generation =
                    Some
                        { Seed = None
                          ReferenceAssetPath = None
                          ThumbnailVariants = Some [ "assets/v1.png"; "assets/gen_upscaled.png" ] } }

        Project.preferBakeImagePath block |> should equal (Some "assets/gen_upscaled.png")

    [<Fact>]
    let ``effectiveMockupDuration uses block override`` () =
        let project = Project.create "Dur"
        let block = { blockWithThumbnail None with MockupDurationSec = Some 3.8 }
        Project.effectiveMockupDuration project block |> should equal 3.8

    [<Fact>]
    let ``effectiveMockupDuration uses project default`` () =
        let project = Project.create "Dur"
        let block = blockWithThumbnail None
        Project.effectiveMockupDuration project block |> should equal project.DefaultMockupDurationSec

    [<Fact>]
    let ``reorderBlocks updates order indices`` () =
        let id1 = Guid.NewGuid()
        let id2 = Guid.NewGuid()
        let id3 = Guid.NewGuid()

        let project =
            { Project.create "Reorder" with
                Blocks =
                    [ { blockWithThumbnail None with Id = id1; Order = 0 }
                      { blockWithThumbnail None with Id = id2; Order = 1 }
                      { blockWithThumbnail None with Id = id3; Order = 2 } ] }

        let reordered = Project.reorderBlocks project [ id3; id1; id2 ]
        reordered.Blocks |> List.map (fun b -> b.Id) |> should equal [ id3; id1; id2 ]
        reordered.Blocks |> List.map (fun b -> b.Order) |> should equal [ 0; 1; 2 ]

    [<Fact>]
    let ``Block mockup duration from audio import scenario`` () =
        let project = Project.create "Audio dur"

        let block =
            { blockWithThumbnail (Some "assets/frame.png") with
                MockupDurationSec = Some 3.6
                Audio =
                    Some
                        { Path = Some "assets/audio/vo.wav"
                          Source = AudioSource.Imported
                          MockupQuality = Rough } }

        let updated = { project with Blocks = [ block ] }
        Validation.validateProject updated |> should equal Valid
        Project.effectiveMockupDuration updated block |> should equal 3.6
