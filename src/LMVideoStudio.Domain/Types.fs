namespace LMVideoStudio.Domain

open System

type SequencePreset =
    | Preset1080p24
    | Preset1080p25
    | Preset1080p30
    | Preset4k24
    | Preset1080x1920Vertical
    | Preset1080Square

module SequencePreset =
    let toSchemaValue =
        function
        | Preset1080p24 -> "1080p24"
        | Preset1080p25 -> "1080p25"
        | Preset1080p30 -> "1080p30"
        | Preset4k24 -> "4k24"
        | Preset1080x1920Vertical -> "1080x1920_vertical"
        | Preset1080Square -> "1080_square"

    let fromSchemaValue =
        function
        | "1080p24" -> Some Preset1080p24
        | "1080p25" -> Some Preset1080p25
        | "1080p30" -> Some Preset1080p30
        | "4k24" -> Some Preset4k24
        | "1080x1920_vertical" -> Some Preset1080x1920Vertical
        | "1080_square" -> Some Preset1080Square
        | _ -> None

type RenderTier =
    | Mockup
    | Bake

type KenBurnsMode =
    | Disabled
    | Simple
    | FullKenBurns

type UpscaleTier =
    | NoUpscale
    | TwoX
    | FourX

type RenderProfile =
    { Tier: RenderTier
      Width: int
      Height: int
      KenBurns: KenBurnsMode
      Upscale: UpscaleTier
      UseComfyClip: bool }

module RenderProfile =
    let defaultMockup =
        { Tier = Mockup
          Width = 640
          Height = 360
          KenBurns = Simple
          Upscale = NoUpscale
          UseComfyClip = false }

    let defaultBake =
        { Tier = Bake
          Width = 1920
          Height = 1080
          KenBurns = FullKenBurns
          Upscale = TwoX
          UseComfyClip = false }

type TransitionType =
    | Cut
    | Fade
    | Crossfade
    | SlideLeft
    | SlideRight
    | Dissolve

type TransitionEdge =
    { Type: TransitionType
      DurationMs: int }

type TransitionSpec =
    { InEdge: TransitionEdge option
      OutEdge: TransitionEdge option
      ToNext: TransitionEdge option }

module TransitionSpec =
    let defaultMockup =
        { InEdge = None
          OutEdge = None
          ToNext = Some { Type = Crossfade; DurationMs = 300 } }

[<RequireQualifiedAccess>]
type BlockSource =
    | Imported
    | Generated

[<RequireQualifiedAccess>]
type AudioSource =
    | NoAudio
    | Imported
    | Generated

type MockupAudioQuality =
    | Rough
    | FullQuality

type BlockAudio =
    { Path: string option
      Source: AudioSource
      MockupQuality: MockupAudioQuality }

type BlockGeneration =
    { Seed: int option
      ReferenceAssetPath: string option
      ThumbnailVariants: string list option }

type BlockArtifacts =
    { MockupVideoPath: string option
      BakeVideoPath: string option
      UpscaledImagePath: string option }

type StoryboardBlock =
    { Id: Guid
      Order: int
      Title: string option
      Source: BlockSource
      ThumbnailPath: string option
      ImagePrompt: string option
      VoiceoverScript: string option
      DirectorNotes: string option
      MoodTags: string list
      MockupDurationSec: float option
      BakeDurationSec: float option
      Transitions: TransitionSpec option
      Audio: BlockAudio option
      Generation: BlockGeneration option
      Artifacts: BlockArtifacts option }

type StylePack =
    { DominantColors: string list
      AspectRatio: string option
      Notes: string option }

type RenderDefaults =
    { Mockup: RenderProfile
      Bake: RenderProfile }

type Project =
    { SchemaVersion: int
      Id: Guid
      Name: string
      CreatedAt: DateTimeOffset option
      UpdatedAt: DateTimeOffset option
      Brief: string option
      SequencePreset: SequencePreset
      DefaultMockupDurationSec: float
      RenderDefaults: RenderDefaults
      StylePack: StylePack option
      Blocks: StoryboardBlock list
      TransitionsDefault: TransitionSpec option }

module Project =
    /// Mockup preview blocks default to 3–4 seconds (North Star v1).
    let mockupDurationMinSec = 3.0
    let mockupDurationMaxSec = 4.0
    let defaultMockupDurationSec = 3.5

    let create name =
        let now = DateTimeOffset.UtcNow

        { SchemaVersion = 1
          Id = Guid.NewGuid()
          Name = name
          CreatedAt = Some now
          UpdatedAt = Some now
          Brief = None
          SequencePreset = Preset1080p24
          DefaultMockupDurationSec = defaultMockupDurationSec
          RenderDefaults =
              { Mockup = RenderProfile.defaultMockup
                Bake = RenderProfile.defaultBake }
          StylePack = None
          Blocks = []
          TransitionsDefault = Some TransitionSpec.defaultMockup }

    let touch (project: Project) =
        { project with UpdatedAt = Some DateTimeOffset.UtcNow }

    let reorderBlocks (project: Project) (blockIds: Guid list) =
        let lookup = project.Blocks |> List.map (fun b -> b.Id, b) |> Map.ofList

        let reordered =
            blockIds
            |> List.choose (fun id -> lookup |> Map.tryFind id)
            |> List.mapi (fun i b -> { b with Order = i })

        { project with Blocks = reordered }
        |> touch

    let effectiveMockupDuration (project: Project) (block: StoryboardBlock) =
        block.MockupDurationSec
        |> Option.defaultValue project.DefaultMockupDurationSec

    /// Prefer upscaled asset for bake Ken Burns when the Host has produced one.
    let preferBakeImagePath (block: StoryboardBlock) =
        block.Artifacts
        |> Option.bind (fun a -> a.UpscaledImagePath)
        |> Option.orElse (
            block.Generation
            |> Option.bind (fun g ->
                g.ThumbnailVariants
                |> Option.bind (fun vs ->
                    vs
                    |> List.tryFind (fun p ->
                        p.ToLowerInvariant().Contains("upscaled"))))
        )
        |> Option.orElse block.ThumbnailPath
