module LMVideoStudio.Client.ProjectJson

open Thoth.Json
open LMVideoStudio.Domain

[<AutoOpen>]
module Json =
    let private transitionTypeCodec =
        function
        | "cut" -> Cut
        | "fade" -> Fade
        | "crossfade" -> Crossfade
        | "slide_left" -> SlideLeft
        | "slide_right" -> SlideRight
        | "dissolve" -> Dissolve
        | other -> failwith $"Unknown transition: {other}"

    let private blockSourceCodec =
        function
        | "imported" -> BlockSource.Imported
        | "generated" -> BlockSource.Generated
        | other -> failwith $"Unknown source: {other}"

    let private dateTimeOffsetDecoder =
        Decode.string
        |> Decode.andThen (fun s ->
            match System.DateTimeOffset.TryParse s with
            | true, d -> Decode.succeed d
            | _ -> Decode.fail $"Invalid date: {s}")

    let private blockDecoder =
        Decode.object (fun get ->
            { Id = get.Required.Field "id" Decode.guid
              Order = get.Required.Field "order" Decode.int
              Title = get.Optional.Field "title" Decode.string
              Source = get.Required.Field "source" (Decode.string |> Decode.map blockSourceCodec)
              ThumbnailPath = get.Optional.Field "thumbnailPath" Decode.string
              ImagePrompt = get.Optional.Field "imagePrompt" Decode.string
              VoiceoverScript = get.Optional.Field "voiceoverScript" Decode.string
              DirectorNotes = get.Optional.Field "directorNotes" Decode.string
              MoodTags = get.Optional.Field "moodTags" (Decode.list Decode.string) |> Option.defaultValue []
              MockupDurationSec = get.Optional.Field "mockupDurationSec" Decode.float
              BakeDurationSec = get.Optional.Field "bakeDurationSec" Decode.float
              Transitions = None
              Audio = None
              Generation =
                  get.Optional.Field "generation" (Decode.object (fun g ->
                      { Seed = g.Optional.Field "seed" Decode.int
                        ReferenceAssetPath = g.Optional.Field "referenceAssetPath" Decode.string
                        ThumbnailVariants =
                            g.Optional.Field "thumbnailVariants" (Decode.list Decode.string)
                            |> Option.filter (not << List.isEmpty) }))
              Artifacts = None })

    let projectDecoder =
        Decode.object (fun get ->
            let preset =
                get.Required.Field "sequencePreset" Decode.string
                |> SequencePreset.fromSchemaValue
                |> Option.defaultValue Preset1080p24

            { SchemaVersion = get.Required.Field "schemaVersion" Decode.int
              Id = get.Required.Field "id" Decode.guid
              Name = get.Required.Field "name" Decode.string
              CreatedAt = get.Optional.Field "createdAt" dateTimeOffsetDecoder
              UpdatedAt = get.Optional.Field "updatedAt" dateTimeOffsetDecoder
              Brief = get.Optional.Field "brief" Decode.string
              SequencePreset = preset
              DefaultMockupDurationSec =
                  get.Optional.Field "defaultMockupDurationSec" Decode.float
                  |> Option.defaultValue Project.defaultMockupDurationSec
              RenderDefaults =
                  { Mockup = RenderProfile.defaultMockup
                    Bake = RenderProfile.defaultBake }
              StylePack = None
              Blocks = get.Optional.Field "blocks" (Decode.list blockDecoder) |> Option.defaultValue []
              TransitionsDefault = Some TransitionSpec.defaultMockup })

    let blockEncoder (block: StoryboardBlock) =
        Encode.object [
            "id", Encode.guid block.Id
            "order", Encode.int block.Order
            "source", Encode.string (if block.Source = BlockSource.Imported then "imported" else "generated")
            yield!
                (block.Title
                 |> Option.map (fun t -> [ "title", Encode.string t ])
                 |> Option.defaultValue [])
            yield!
                (block.ThumbnailPath
                 |> Option.map (fun p -> [ "thumbnailPath", Encode.string p ])
                 |> Option.defaultValue [])
        ]

    let encodeProject (project: Project) =
        Encode.object [
            "schemaVersion", Encode.int project.SchemaVersion
            "id", Encode.guid project.Id
            "name", Encode.string project.Name
            "sequencePreset", Encode.string (SequencePreset.toSchemaValue project.SequencePreset)
            "defaultMockupDurationSec", Encode.float project.DefaultMockupDurationSec
            "renderDefaults",
            Encode.object [
                "mockup",
                Encode.object [
                    "tier", Encode.string "mockup"
                    "width", Encode.int project.RenderDefaults.Mockup.Width
                    "height", Encode.int project.RenderDefaults.Mockup.Height
                ]
                "bake",
                Encode.object [
                    "tier", Encode.string "bake"
                    "width", Encode.int project.RenderDefaults.Bake.Width
                    "height", Encode.int project.RenderDefaults.Bake.Height
                ]
            ]
            "blocks", project.Blocks |> List.map blockEncoder |> List.toArray |> Encode.array
        ]
        |> Encode.toString 2

    let decodeProject json = Decode.fromString projectDecoder json
