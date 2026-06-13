namespace LMVideoStudio.Domain.Tests

open System
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain

module TransitionValidationTests =
    let private blockWithTransitions transitions =
        { Id = Guid.NewGuid()
          Order = 0
          Title = Some "Block"
          Source = BlockSource.Imported
          ThumbnailPath = Some "assets/frame.png"
          ImagePrompt = None
          VoiceoverScript = None
          DirectorNotes = None
          MoodTags = []
          MockupDurationSec = None
          BakeDurationSec = None
          Transitions = transitions
          Audio = None
          Generation = None
          Artifacts = None }

    [<Fact>]
    let ``Valid crossfade transition passes validation`` () =
        let project =
            { Project.create "Transitions" with
                Blocks =
                    [ blockWithTransitions(
                          Some
                              { InEdge = None
                                OutEdge = None
                                ToNext = Some { Type = Crossfade; DurationMs = 300 } }
                      ) ] }

        Validation.validateProject project |> should equal Valid

    [<Fact>]
    let ``Invalid transition duration fails validation`` () =
        let blockId = Guid.NewGuid()

        let project =
            { Project.create "Bad transition" with
                Blocks =
                    [ { blockWithTransitions(
                            Some
                                { InEdge = None
                                  OutEdge = None
                                  ToNext = Some { Type = Fade; DurationMs = 0 } }
                        ) with
                          Id = blockId } ] }

        match Validation.validateProject project with
        | Invalid issues ->
            issues
            |> List.exists (fun i -> i.Path.Contains("toNext") && i.Path.Contains(string blockId))
            |> should equal true
        | Valid -> failwith "expected invalid"

    [<Fact>]
    let ``Transition edge with negative duration fails validation`` () =
        let blockId = Guid.NewGuid()

        let project =
            { Project.create "Neg transition" with
                Blocks =
                    [ { blockWithTransitions(
                            Some
                                { InEdge = Some { Type = SlideLeft; DurationMs = -100 }
                                  OutEdge = None
                                  ToNext = None }
                        ) with
                          Id = blockId } ] }

        match Validation.validateProject project with
        | Invalid issues ->
            issues
            |> List.exists (fun i -> i.Path.Contains("inEdge") && i.Path.Contains(string blockId))
            |> should equal true
        | Valid -> failwith "expected invalid"
