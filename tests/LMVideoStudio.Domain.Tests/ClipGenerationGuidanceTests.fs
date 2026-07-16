namespace LMVideoStudio.Domain.Tests

open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain

module ClipGenerationGuidanceTests =
    [<Fact>]
    let ``8GB VRAM face close-up max is 8 seconds at 1080p`` () =
        ClipGenerationGuidance.maxClipSeconds 8.0 P1080 |> should equal 8.0

    [<Fact>]
    let ``8GB VRAM medium close max is 12 seconds at 900p`` () =
        ClipGenerationGuidance.recommendedMaxSeconds Minimal MediumClose |> should equal 12.0

    [<Fact>]
    let ``8GB VRAM back wide max is 19 seconds at 720p`` () =
        ClipGenerationGuidance.recommendedMaxSeconds Minimal BackWide |> should equal 19.0

    [<Fact>]
    let ``promptHint switches when guide frame exists`` () =
        let block =
            { Id = System.Guid.NewGuid()
              Order = 0
              Title = None
              Source = BlockSource.Imported
              ThumbnailPath = Some "assets/frame.png"
              ImagePrompt = None
              VoiceoverScript = None
              DirectorNotes = None
              MoodTags = []
              ShotKind = None
              MockupDurationSec = None
              BakeDurationSec = None
              Transitions = None
              Audio = None
              Generation = None
              Artifacts = None }

        ClipGenerationGuidance.promptHint block
        |> fun s -> s.Contains "action"
        |> should equal true

        let noThumb = { block with ThumbnailPath = None }
        ClipGenerationGuidance.promptHint noThumb
        |> fun s -> s.Contains "geography"
        |> should equal true

    [<Fact>]
    let ``guidanceSummary includes resolution and VRAM label`` () =
        let summary = ClipGenerationGuidance.guidanceSummary Minimal FaceCloseUp
        summary.Contains "1080p" |> should equal true
        summary.Contains "8 GB" |> should equal true
