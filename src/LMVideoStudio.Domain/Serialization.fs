namespace LMVideoStudio.Domain

open System
open Thoth.Json.Net

module Json =
    let private dateTimeOffsetDecoder =
        Decode.string
        |> Decode.andThen (fun s ->
            match DateTimeOffset.TryParse s with
            | true, dto -> Decode.succeed dto
            | _ -> Decode.fail $"Invalid date-time: {s}")

    let private transitionTypeCodec =
        function
        | "cut" -> Cut
        | "fade" -> Fade
        | "crossfade" -> Crossfade
        | "slide_left" -> SlideLeft
        | "slide_right" -> SlideRight
        | "dissolve" -> Dissolve
        | other -> failwith $"Unknown transition type: {other}"

    let private transitionTypeToString =
        function
        | Cut -> "cut"
        | Fade -> "fade"
        | Crossfade -> "crossfade"
        | SlideLeft -> "slide_left"
        | SlideRight -> "slide_right"
        | Dissolve -> "dissolve"

    let private kenBurnsCodec =
        function
        | "none" -> KenBurnsMode.Disabled
        | "simple" -> KenBurnsMode.Simple
        | "full" -> KenBurnsMode.FullKenBurns
        | other -> failwith $"Unknown kenBurns: {other}"

    let private kenBurnsToString =
        function
        | KenBurnsMode.Disabled -> "none"
        | KenBurnsMode.Simple -> "simple"
        | KenBurnsMode.FullKenBurns -> "full"

    let private upscaleCodec =
        function
        | "none" -> NoUpscale
        | "2x" -> TwoX
        | "4x" -> FourX
        | other -> failwith $"Unknown upscale: {other}"

    let private upscaleToString =
        function
        | NoUpscale -> "none"
        | TwoX -> "2x"
        | FourX -> "4x"

    let private blockSourceCodec =
        function
        | "imported" -> BlockSource.Imported
        | "generated" -> BlockSource.Generated
        | other -> failwith $"Unknown block source: {other}"

    let private blockSourceToString =
        function
        | BlockSource.Imported -> "imported"
        | BlockSource.Generated -> "generated"

    let private shotKindCodec s =
        BlockShotKind.fromSchemaValue s
        |> Option.defaultWith (fun () -> failwith $"Unknown shot kind: {s}")

    let private shotKindToString = BlockShotKind.toSchemaValue

    let private audioSourceCodec =
        function
        | "imported" -> AudioSource.Imported
        | "generated" -> AudioSource.Generated
        | "none" -> AudioSource.NoAudio
        | other -> failwith $"Unknown audio source: {other}"

    let private audioSourceToString =
        function
        | AudioSource.Imported -> "imported"
        | AudioSource.Generated -> "generated"
        | AudioSource.NoAudio -> "none"

    let private mockupQualityCodec =
        function
        | "rough" -> Rough
        | "full" -> FullQuality
        | other -> failwith $"Unknown mockupQuality: {other}"

    let private mockupQualityToString =
        function
        | Rough -> "rough"
        | FullQuality -> "full"

    let private encodeStringList (items: string list) =
        items |> List.map Encode.string |> List.toArray |> Encode.array

    let transitionEdgeDecoder : Decoder<TransitionEdge> =
        Decode.object (fun get ->
            { Type = get.Required.Field "type" (Decode.string |> Decode.map transitionTypeCodec)
              DurationMs = get.Optional.Field "durationMs" Decode.int |> Option.defaultValue 300 })

    let transitionEdgeEncoder : Encoder<TransitionEdge> =
        fun edge ->
            Encode.object [
                "type", Encode.string (transitionTypeToString edge.Type)
                "durationMs", Encode.int edge.DurationMs
            ]

    let transitionSpecDecoder : Decoder<TransitionSpec> =
        Decode.object (fun get ->
            { InEdge = get.Optional.Field "in" transitionEdgeDecoder
              OutEdge = get.Optional.Field "out" transitionEdgeDecoder
              ToNext = get.Optional.Field "toNext" transitionEdgeDecoder })

    let transitionSpecEncoder : Encoder<TransitionSpec> =
        fun spec ->
            let fields =
                [ yield! spec.InEdge |> Option.map (fun e -> "in", transitionEdgeEncoder e) |> Option.toList
                  yield! spec.OutEdge |> Option.map (fun e -> "out", transitionEdgeEncoder e) |> Option.toList
                  yield! spec.ToNext |> Option.map (fun e -> "toNext", transitionEdgeEncoder e) |> Option.toList ]

            Encode.object fields

    let renderProfileDecoder tier : Decoder<RenderProfile> =
        Decode.object (fun get ->
            { Tier = tier
              Width = get.Optional.Field "width" Decode.int |> Option.defaultValue (if tier = Mockup then 640 else 1920)
              Height = get.Optional.Field "height" Decode.int |> Option.defaultValue (if tier = Mockup then 360 else 1080)
              KenBurns =
                  get.Optional.Field "kenBurns" (Decode.string |> Decode.map kenBurnsCodec)
                  |> Option.defaultValue (if tier = Mockup then KenBurnsMode.Simple else KenBurnsMode.FullKenBurns)
              Upscale =
                  get.Optional.Field "upscale" (Decode.string |> Decode.map upscaleCodec)
                  |> Option.defaultValue (if tier = Mockup then NoUpscale else TwoX)
              UseComfyClip = get.Optional.Field "useComfyClip" Decode.bool |> Option.defaultValue false })

    let renderProfileEncoder : Encoder<RenderProfile> =
        fun profile ->
            Encode.object [
                "tier", Encode.string (if profile.Tier = Mockup then "mockup" else "bake")
                "width", Encode.int profile.Width
                "height", Encode.int profile.Height
                "kenBurns", Encode.string (kenBurnsToString profile.KenBurns)
                "upscale", Encode.string (upscaleToString profile.Upscale)
                "useComfyClip", Encode.bool profile.UseComfyClip
            ]

    let blockDecoder : Decoder<StoryboardBlock> =
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
              ShotKind = get.Optional.Field "shotKind" (Decode.string |> Decode.map shotKindCodec)
              MockupDurationSec = get.Optional.Field "mockupDurationSec" Decode.float
              BakeDurationSec = get.Optional.Field "bakeDurationSec" Decode.float
              Transitions = get.Optional.Field "transitions" transitionSpecDecoder
              Audio =
                  get.Optional.Field "audio" (Decode.object (fun g ->
                      { Path = g.Optional.Field "path" Decode.string
                        Source =
                            g.Optional.Field "source" (Decode.string |> Decode.map audioSourceCodec)
                            |> Option.defaultValue AudioSource.NoAudio
                        MockupQuality =
                            g.Optional.Field "mockupQuality" (Decode.string |> Decode.map mockupQualityCodec)
                            |> Option.defaultValue Rough }))
              Generation =
                  get.Optional.Field "generation" (Decode.object (fun g ->
                      { Seed = g.Optional.Field "seed" Decode.int
                        ReferenceAssetPath = g.Optional.Field "referenceAssetPath" Decode.string
                        ThumbnailVariants =
                            g.Optional.Field "thumbnailVariants" (Decode.list Decode.string)
                            |> Option.filter (not << List.isEmpty) }))
              Artifacts =
                  get.Optional.Field "artifacts" (Decode.object (fun g ->
                      { MockupVideoPath = g.Optional.Field "mockupVideoPath" Decode.string
                        BakeVideoPath = g.Optional.Field "bakeVideoPath" Decode.string
                        UpscaledImagePath = g.Optional.Field "upscaledImagePath" Decode.string })) })

    let blockEncoder : Encoder<StoryboardBlock> =
        fun block ->
            let optional name value =
                value |> Option.map (fun v -> name, v) |> Option.toList

            Encode.object (
                [ "id", Encode.guid block.Id
                  "order", Encode.int block.Order
                  "source", Encode.string (blockSourceToString block.Source) ]
                @ optional "title" (block.Title |> Option.map Encode.string)
                @ optional "thumbnailPath" (block.ThumbnailPath |> Option.map Encode.string)
                @ optional "imagePrompt" (block.ImagePrompt |> Option.map Encode.string)
                @ optional "voiceoverScript" (block.VoiceoverScript |> Option.map Encode.string)
                @ optional "directorNotes" (block.DirectorNotes |> Option.map Encode.string)
                @ (if block.MoodTags.IsEmpty then [] else [ "moodTags", encodeStringList block.MoodTags ])
                @ optional "shotKind" (block.ShotKind |> Option.map (fun k -> shotKindToString k |> Encode.string))
                @ optional "mockupDurationSec" (block.MockupDurationSec |> Option.map Encode.float)
                @ optional "bakeDurationSec" (block.BakeDurationSec |> Option.map Encode.float)
                @ optional "transitions" (block.Transitions |> Option.map transitionSpecEncoder)
                @ optional
                    "audio"
                    (block.Audio
                     |> Option.map (fun a ->
                         Encode.object (
                             [ yield! optional "path" (a.Path |> Option.map Encode.string)
                               "source", Encode.string (audioSourceToString a.Source)
                               "mockupQuality", Encode.string (mockupQualityToString a.MockupQuality) ]
                         )))
                @ optional
                    "generation"
                    (block.Generation
                     |> Option.map (fun g ->
                         Encode.object (
                             [ yield! optional "seed" (g.Seed |> Option.map Encode.int)
                               yield! optional "referenceAssetPath" (g.ReferenceAssetPath |> Option.map Encode.string)
                               yield!
                                   (g.ThumbnailVariants
                                    |> Option.filter (not << List.isEmpty)
                                    |> Option.map (fun vs ->
                                        [ "thumbnailVariants", vs |> List.map Encode.string |> List.toArray |> Encode.array ])
                                    |> Option.defaultValue []) ] ) ) )
                @ optional
                    "artifacts"
                    (block.Artifacts
                     |> Option.map (fun a ->
                         Encode.object (
                             [ yield! optional "mockupVideoPath" (a.MockupVideoPath |> Option.map Encode.string)
                               yield! optional "bakeVideoPath" (a.BakeVideoPath |> Option.map Encode.string)
                               yield! optional "upscaledImagePath" (a.UpscaledImagePath |> Option.map Encode.string) ]
                         )))
            )

    let private encodeBlockList blocks =
        blocks |> List.map blockEncoder |> List.toArray |> Encode.array

    let projectDecoder : Decoder<Project> =
        Decode.object (fun get ->
            let sequencePresetRaw = get.Required.Field "sequencePreset" Decode.string

            let sequencePreset =
                match SequencePreset.fromSchemaValue sequencePresetRaw with
                | Some p -> p
                | None -> failwith $"Unknown sequencePreset: {sequencePresetRaw}"

            { SchemaVersion = get.Required.Field "schemaVersion" Decode.int
              Id = get.Required.Field "id" Decode.guid
              Name = get.Required.Field "name" Decode.string
              CreatedAt = get.Optional.Field "createdAt" dateTimeOffsetDecoder
              UpdatedAt = get.Optional.Field "updatedAt" dateTimeOffsetDecoder
              Brief = get.Optional.Field "brief" Decode.string
              SequencePreset = sequencePreset
              DefaultMockupDurationSec =
                  get.Optional.Field "defaultMockupDurationSec" Decode.float
                  |> Option.defaultValue Project.defaultMockupDurationSec
              RenderDefaults =
                  get.Required.Field "renderDefaults" (Decode.object (fun g ->
                      { Mockup = g.Required.Field "mockup" (renderProfileDecoder Mockup)
                        Bake = g.Required.Field "bake" (renderProfileDecoder Bake) }))
              StylePack =
                  get.Optional.Field "stylePack" (Decode.object (fun g ->
                      { DominantColors =
                            g.Optional.Field "dominantColors" (Decode.list Decode.string)
                            |> Option.defaultValue []
                        AspectRatio = g.Optional.Field "aspectRatio" Decode.string
                        Notes = g.Optional.Field "notes" Decode.string }))
              Blocks = get.Optional.Field "blocks" (Decode.list blockDecoder) |> Option.defaultValue []
              TransitionsDefault = get.Optional.Field "transitionsDefault" transitionSpecDecoder })

    let projectEncoder : Encoder<Project> =
        fun project ->
            let optional name value =
                value |> Option.map (fun v -> name, v) |> Option.toList

            Encode.object (
                [ "schemaVersion", Encode.int project.SchemaVersion
                  "id", Encode.guid project.Id
                  "name", Encode.string project.Name
                  "sequencePreset", Encode.string (SequencePreset.toSchemaValue project.SequencePreset)
                  "defaultMockupDurationSec", Encode.float project.DefaultMockupDurationSec
                  "renderDefaults",
                  Encode.object [
                      "mockup", renderProfileEncoder project.RenderDefaults.Mockup
                      "bake", renderProfileEncoder project.RenderDefaults.Bake
                  ]
                  "blocks", encodeBlockList project.Blocks ]
                @ optional "createdAt" (project.CreatedAt |> Option.map (fun d -> Encode.string (d.ToString("O"))))
                @ optional "updatedAt" (project.UpdatedAt |> Option.map (fun d -> Encode.string (d.ToString("O"))))
                @ optional "brief" (project.Brief |> Option.map Encode.string)
                @ optional
                    "stylePack"
                    (project.StylePack
                     |> Option.map (fun sp ->
                         Encode.object (
                             [ yield!
                                   (if sp.DominantColors.IsEmpty then
                                        []
                                    else
                                        [ "dominantColors", encodeStringList sp.DominantColors ])
                               yield! optional "aspectRatio" (sp.AspectRatio |> Option.map Encode.string)
                               yield! optional "notes" (sp.Notes |> Option.map Encode.string) ]
                         )))
                @ optional "transitionsDefault" (project.TransitionsDefault |> Option.map transitionSpecEncoder)
            )

    let encodeBlock block = Encode.toString 0 (blockEncoder block)

    let encodeProject project = Encode.toString 2 (projectEncoder project)

    let decodeProject json =
        Decode.fromString projectDecoder json

    let decodeBlocks json =
        Decode.fromString (Decode.list blockDecoder) json
