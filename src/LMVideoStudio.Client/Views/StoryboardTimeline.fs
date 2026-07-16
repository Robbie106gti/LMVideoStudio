module LMVideoStudio.Client.Views.StoryboardTimeline

open System
open Feliz
open LMVideoStudio.Client.Api
open LMVideoStudio.Client.FormatHelpers
open LMVideoStudio.Client.PromptQuickButtons
open LMVideoStudio.Client.Views.SharePackPanel
open LMVideoStudio.Domain

type VariantModalMode =
    | Compare
    | Enlarge of string

type TimelineMsg =
    | ImportImage of Browser.Types.File
    | ImportStylePack of Browser.Types.File
    | MoveBlockUp of Guid
    | MoveBlockDown of Guid
    | DragStart of int
    | DropOnIndex of int
    | SelectBlock of Guid option
    | SetVoiceoverScript of string
    | SetImagePrompt of string
    | SetMoodTags of string
    | SetCrossfadeDuration of int
    | SetDirectorNotes of string
    | SetShotKind of BlockShotKind option
    | SetBakeDuration of string
    | ApplyRecommendedBakeDuration
    | SaveBlockFields
    | GenerateThumbnail
    | SelectThumbnailVariant of string
    | OpenVariantModal
    | CloseVariantModal
    | EnlargeVariant of string
    | BackToVariantCompare
    | ApplyPromptQuickButton of string
    | RefreshPromptQuickButtons
    | ImportReferenceImage of Browser.Types.File
    | ClearReferenceImage
    | UseThumbnailAsReference
    | SetReferenceStrength of float
    | ImportAudio of Browser.Types.File
    | RefreshMockupPreview
    | StartBake
    | ExportSharePack
    | SharePackMsg of SharePackMsg
    | PreviewFailed of string
    | BakeFailed of string
    | Save
    | BackToHub

type TimelineModel =
    { Project: Project
      Saving: bool
      Generating: bool
      Previewing: bool
      Baking: bool
      PreviewUrl: string option
      BakeUrl: string option
      PreviewJobId: Guid option
      BakeJobId: Guid option
      Error: string option
      DragIndex: int option
      SelectedBlockId: Guid option
      VoiceoverDraft: string
      ImagePromptDraft: string
      MoodTagsDraft: string
      CrossfadeDurationDraft: int
      DirectorNotesDraft: string
      ShotKindDraft: BlockShotKind option
      BakeDurationDraft: string
      ImagePromptQuickButtons: QuickButton list
      ReferenceStrengthDraft: float
      MediaRevision: int64
      VariantModal: VariantModalMode option
      SharePack: SharePackModel option }

module StoryboardTimeline =
    let init (project: Project) =
        { Project = project
          Saving = false
          Generating = false
          Previewing = false
          Baking = false
          PreviewUrl = None
          BakeUrl = None
          PreviewJobId = None
          BakeJobId = None
          Error = None
          DragIndex = None
          SelectedBlockId = None
          VoiceoverDraft = ""
          ImagePromptDraft = ""
          MoodTagsDraft = ""
          CrossfadeDurationDraft = 300
          DirectorNotesDraft = ""
          ShotKindDraft = None
          BakeDurationDraft = ""
          ImagePromptQuickButtons = loadAll ()
          ReferenceStrengthDraft = 0.32
          MediaRevision = 0L
          VariantModal = None
          SharePack = None }

    let private sortedBlocks (project: Project) =
        project.Blocks |> List.sortBy (fun b -> b.Order)

    let private mediaCacheBust (model: TimelineModel) =
        let projectBust =
            model.Project.UpdatedAt
            |> Option.map (fun d -> d.ToUnixTimeMilliseconds())
            |> Option.defaultValue 0L

        max model.MediaRevision projectBust
        |> fun bust ->
            if bust = 0L then
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            else
                bust

    let private mediaPreviewSrc (model: TimelineModel) (path: string) =
        let bust = mediaCacheBust model
        previewMediaUrl model.Project.Id path bust, $"{path}-{bust}"

    let private blockThumbnailUrl (model: TimelineModel) (block: StoryboardBlock) =
        block.ThumbnailPath
        |> Option.map (fun path ->
            let bust = mediaCacheBust model
            previewMediaUrl model.Project.Id path bust)

    let private looksLikeFilename (prompt: string) =
        if String.IsNullOrWhiteSpace prompt then
            false
        else
            let t = prompt.Trim()
            let lower = t.ToLowerInvariant()

            if
                lower.EndsWith ".png"
                || lower.EndsWith ".jpg"
                || lower.EndsWith ".jpeg"
                || lower.EndsWith ".webp"
                || lower.EndsWith ".gif"
                || (t.Contains('\\') && not (t.Contains ' '))
            then
                true
            else
                let digits = t |> Seq.filter Char.IsDigit |> Seq.length
                t.Length >= 12 && (digits >= t.Length * 2 / 3 || (t.Contains('_') && digits >= 8))

    /// Exported for App — filenames / social IDs are not valid SD prompts.
    let isUnusablePromptDraft = looksLikeFilename

    let private blockPlaceholderLabel (block: StoryboardBlock) =
        match block.Title with
        | Some t when not (looksLikeFilename t) -> t
        | _ ->
            match block.Source with
            | BlockSource.Generated -> "Generated"
            | BlockSource.Imported -> "No image"

    let private reorderByIndex (project: Project) (fromIdx: int) (toIdx: int) =
        let blocks = sortedBlocks project

        if
            fromIdx < 0
            || toIdx < 0
            || fromIdx >= blocks.Length
            || toIdx >= blocks.Length
            || fromIdx = toIdx
        then
            project
        else
            let item = List.item fromIdx blocks

            let without =
                blocks
                |> List.indexed
                |> List.choose (fun (i, b) -> if i = fromIdx then None else Some b)

            let toIdx' = if toIdx > fromIdx then toIdx - 1 else toIdx

            let reordered =
                without
                |> List.take toIdx'
                |> fun prefix -> prefix @ [ item ] @ (without |> List.skip toIdx')

            { project with Blocks = reordered |> List.mapi (fun i b -> { b with Order = i }) }

    let reorderByDrag model fromIdx toIdx =
        { model with
            Project = reorderByIndex model.Project fromIdx toIdx
            DragIndex = None }

    let private reorder (project: Project) (blockId: Guid) (direction: int) =
        let blocks = sortedBlocks project
        let idx = blocks |> List.findIndex (fun b -> b.Id = blockId)

        if idx + direction < 0 || idx + direction >= blocks.Length then
            project
        else
            let a = List.item idx blocks
            let b = List.item (idx + direction) blocks

            let swapped =
                blocks
                |> List.mapi (fun i block ->
                    if i = idx then b
                    elif i = idx + direction then a
                    else block)

            { project with Blocks = swapped |> List.mapi (fun i b -> { b with Order = i }) }

    let private selectedBlock (model: TimelineModel) =
        model.SelectedBlockId
        |> Option.bind (fun id ->
            model.Project.Blocks |> List.tryFind (fun b -> b.Id = id))

    let private blockCrossfadeMs (block: StoryboardBlock) (project: Project) =
        block.Transitions
        |> Option.bind (fun t -> t.ToNext)
        |> Option.orElse (project.TransitionsDefault |> Option.bind (fun t -> t.ToNext))
        |> Option.map (fun e -> e.DurationMs)
        |> Option.defaultValue 300

    let private clipGuidanceProfile = Minimal

    let private formatDuration (sec: float) =
        if abs (sec - round sec) < 0.01 then
            string (int (round sec))
        else
            formatFloat 1 sec

    let private bakeDurationDraftFromBlock (block: StoryboardBlock) =
        block.BakeDurationSec |> Option.map formatDuration |> Option.defaultValue ""

    let selectBlock model blockId =
        match blockId with
        | Some id ->
            match model.Project.Blocks |> List.tryFind (fun b -> b.Id = id) with
            | Some block ->
                { model with
                    SelectedBlockId = Some id
                    VoiceoverDraft = block.VoiceoverScript |> Option.defaultValue ""
                    ImagePromptDraft = block.ImagePrompt |> Option.defaultValue ""
                    MoodTagsDraft = String.concat ", " block.MoodTags
                    CrossfadeDurationDraft = blockCrossfadeMs block model.Project
                    DirectorNotesDraft = block.DirectorNotes |> Option.defaultValue ""
                    ShotKindDraft = block.ShotKind
                    BakeDurationDraft = bakeDurationDraftFromBlock block
                    VariantModal = None }
            | None -> { model with SelectedBlockId = None; VariantModal = None }
        | None ->
            { model with SelectedBlockId = None; VariantModal = None }

    let private imagePromptPlaceholder (block: StoryboardBlock) =
        if ClipGenerationGuidance.hasGuideFrame block then
            "Action, camera, pacing — guide frame already sets the look…"
        else
            "Geography and look — subject, setting, lighting…"

    let private shotKindOptions : (string * BlockShotKind option) list =
        [ "Auto", None
          BlockShotKind.label FaceCloseUp, Some FaceCloseUp
          BlockShotKind.label MediumClose, Some MediumClose
          BlockShotKind.label BackWide, Some BackWide
          BlockShotKind.label EnvironmentWide, Some EnvironmentWide ]

    let recommendedBakeDurationText (kind: BlockShotKind) =
        ClipGenerationGuidance.suggestedBakeDurationForShot kind |> formatDuration

    let applyRecommendedBakeDuration model =
        match model.ShotKindDraft with
        | Some kind ->
            { model with BakeDurationDraft = recommendedBakeDurationText kind }
        | None -> model

    let private variantModalView (model: TimelineModel) (block: StoryboardBlock) (variants: string list) dispatch =
        let variantCard vi path selected enlargeMsg =
            let src, imgKey = mediaPreviewSrc model path
            Html.div [
                prop.className "flex flex-col gap-2"
                prop.children [
                    Html.button [
                        prop.type' "button"
                        prop.className (
                            "rounded-lg border overflow-hidden bg-surface "
                            + (if selected then
                                   "border-accent ring-2 ring-accent"
                               else
                                   "border-surface-border hover:border-accent/60")
                        )
                        prop.onClick (fun _ -> dispatch enlargeMsg)
                        prop.children [
                            Html.img [
                                prop.key imgKey
                                prop.className "w-full aspect-video object-cover"
                                prop.src src
                                prop.alt $"Variant {vi + 1}"
                            ]
                        ]
                    ]
                    Html.div [
                        prop.className "flex gap-2"
                        prop.children [
                            Html.button [
                                prop.type' "button"
                                prop.className (
                                    "flex-1 px-2 py-1.5 rounded-md text-xs font-medium "
                                    + (if selected then
                                           "bg-accent text-white"
                                       else
                                           "border border-surface-border hover:border-accent")
                                )
                                prop.text (if selected then "Selected" else "Use this")
                                prop.onClick (fun _ -> dispatch (SelectThumbnailVariant path))
                            ]
                            Html.button [
                                prop.type' "button"
                                prop.className "px-2 py-1.5 rounded-md border border-surface-border text-xs hover:border-accent"
                                prop.text "Large"
                                prop.onClick (fun _ -> dispatch (EnlargeVariant path))
                            ]
                        ]
                    ]
                ]
            ]

        Html.div [
            prop.className "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            prop.onClick (fun ev ->
                if ev.target = ev.currentTarget then
                    dispatch CloseVariantModal)
            prop.children [
                Html.div [
                    prop.className "w-full max-w-5xl max-h-[90vh] rounded-xl border border-surface-border bg-surface-raised shadow-xl flex flex-col"
                    prop.onClick (fun ev -> ev.stopPropagation())
                    prop.children [
                        Html.div [
                            prop.className "px-5 py-4 border-b border-surface-border flex items-center justify-between gap-3"
                            prop.children [
                                Html.div [
                                    prop.children [
                                        Html.h2 [
                                            prop.className "text-lg font-semibold"
                                            prop.text "Compare thumbnail variants"
                                        ]
                                        Html.p [
                                            prop.className "text-xs text-slate-500 mt-0.5"
                                            prop.text "Pick one for this block, or open a variant full size."
                                        ]
                                    ]
                                ]
                                Html.button [
                                    prop.type' "button"
                                    prop.className "px-3 py-1.5 rounded-md border border-surface-border text-sm hover:border-accent"
                                    prop.text "Close"
                                    prop.onClick (fun _ -> dispatch CloseVariantModal)
                                ]
                            ]
                        ]
                        match model.VariantModal with
                        | Some (Enlarge path) ->
                            Html.div [
                                prop.className "p-5 flex-1 overflow-auto flex flex-col items-center gap-4"
                                prop.children [
                                    Html.button [
                                        prop.type' "button"
                                        prop.className "self-start px-3 py-1.5 rounded-md border border-surface-border text-sm hover:border-accent"
                                        prop.text "← Back to comparison"
                                        prop.onClick (fun _ -> dispatch BackToVariantCompare)
                                    ]
                                    (let src, imgKey = mediaPreviewSrc model path in
                                     Html.img [
                                         prop.key imgKey
                                         prop.className "max-w-full max-h-[70vh] object-contain rounded-lg border border-surface-border"
                                         prop.src src
                                         prop.alt "Variant full size"
                                     ])
                                    Html.button [
                                        prop.type' "button"
                                        prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium"
                                        prop.text "Use this variant"
                                        prop.onClick (fun _ -> dispatch (SelectThumbnailVariant path))
                                    ]
                                ]
                            ]
                        | _ ->
                            Html.div [
                                prop.className "p-5 overflow-auto"
                                prop.children [
                                    Html.div [
                                        prop.className "grid grid-cols-1 sm:grid-cols-3 gap-4"
                                        prop.children (
                                            variants
                                            |> List.mapi (fun vi path ->
                                                let selected =
                                                    block.ThumbnailPath
                                                    |> Option.map ((=) path)
                                                    |> Option.defaultValue (vi = 0)

                                                variantCard vi path selected (EnlargeVariant path))
                                        )
                                    ]
                                ]
                            ]
                    ]
                ]
            ]
        ]

    let view (model: TimelineModel) dispatch =
        let blocks = sortedBlocks model.Project
        let selected = selectedBlock model

        Html.div [
            prop.className "flex flex-col h-full"
            prop.children [
                Html.div [
                    prop.className "flex items-center justify-between px-6 py-4 border-b border-surface-border"
                    prop.children [
                        Html.div [
                            Html.h1 [
                                prop.className "text-xl font-bold"
                                prop.text model.Project.Name
                            ]
                            Html.p [
                                prop.className "text-sm text-slate-500"
                                prop.text $"{blocks.Length} blocks · {model.Project.DefaultMockupDurationSec}s mockup · plan as separate clips to stitch"
                            ]
                            model.Project.StylePack
                            |> Option.bind (fun sp ->
                                if sp.DominantColors.IsEmpty then None
                                else Some sp)
                            |> Option.map (fun sp ->
                                Html.div [
                                    prop.className "flex items-center gap-2 mt-1"
                                    prop.children [
                                        Html.span [
                                            prop.className "text-xs text-slate-500"
                                            prop.text "Style pack:"
                                        ]
                                        yield!
                                            sp.DominantColors
                                            |> List.map (fun hex ->
                                                Html.span [
                                                    prop.className "inline-block w-4 h-4 rounded border border-surface-border"
                                                    prop.style [ style.backgroundColor hex ]
                                                    prop.title hex
                                                ])
                                    ]
                                ])
                            |> Option.defaultValue Html.none
                        ]
                        Html.div [
                            prop.className "flex gap-2"
                            prop.children [
                                Html.label [
                                    prop.className "px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm"
                                    prop.children [
                                        Html.input [
                                            prop.type' "file"
                                            prop.accept "image/*"
                                            prop.className "hidden"
                                            prop.onChange (fun (ev: Browser.Types.Event) ->
                                                let input = ev.target :?> Browser.Types.HTMLInputElement
                                                let files = input.files

                                                if not (isNull files) && files.length > 0 then
                                                    dispatch (ImportStylePack files.[0]))
                                        ]
                                        Html.span [ prop.text "Import logo (style pack)" ]
                                    ]
                                ]
                                Html.label [
                                    prop.className "px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm"
                                    prop.children [
                                        Html.input [
                                            prop.type' "file"
                                            prop.accept "image/*"
                                            prop.className "hidden"
                                            prop.onChange (fun (ev: Browser.Types.Event) ->
                                                let input = ev.target :?> Browser.Types.HTMLInputElement
                                                let files = input.files

                                                if not (isNull files) && files.length > 0 then
                                                    let file = files.[0]
                                                    dispatch (ImportImage file))
                                        ]
                                        Html.span [ prop.text "Import image" ]
                                    ]
                                ]
                                Html.button [
                                    prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50"
                                    prop.disabled (model.Saving || model.Previewing)
                                    prop.title "Stitches block thumbnails with CPU FFmpeg Ken Burns zoom. Timing/layout check only — not AI video."
                                    prop.text (
                                        if model.Previewing then "Stitching preview…"
                                        else "Stitch Ken Burns preview"
                                    )
                                    prop.onClick (fun _ -> dispatch RefreshMockupPreview)
                                ]
                                Html.button [
                                    prop.className "px-4 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm font-medium disabled:opacity-50"
                                    prop.disabled (model.Baking || model.Saving)
                                    prop.title "1080p Ken Burns stitch; optional GPU upscale per block when enabled."
                                    prop.text (if model.Baking then "Baking…" else "Bake final MP4")
                                    prop.onClick (fun _ -> dispatch StartBake)
                                ]
                                Html.a [
                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent inline-block"
                                    prop.href (exportPremiereXmlUrl model.Project.Id)
                                    prop.target "_blank"
                                    prop.text "Export Premiere XML"
                                ]
                                Html.button [
                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50"
                                    prop.disabled model.Saving
                                    prop.text "Export share pack"
                                    prop.onClick (fun _ -> dispatch ExportSharePack)
                                ]
                                Html.button [
                                    prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50"
                                    prop.disabled model.Saving
                                    prop.text (if model.Saving then "Saving…" else "Save")
                                    prop.onClick (fun _ -> dispatch Save)
                                ]
                                Html.button [
                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm"
                                    prop.text "Close project"
                                    prop.onClick (fun _ -> dispatch BackToHub)
                                ]
                            ]
                        ]
                    ]
                ]
                model.PreviewUrl
                |> Option.map (fun url ->
                    Html.div [
                        prop.className "px-6 py-4 border-b border-surface-border bg-surface-raised"
                        prop.children [
                            Html.h2 [
                                prop.className "text-sm font-semibold mb-1"
                                prop.text "Quick preview (640p Ken Burns · CPU)"
                            ]
                            Html.p [
                                prop.className "text-xs text-slate-500 mb-2"
                                prop.text "Zoom/pan on still thumbnails for timing — not AI-generated motion."
                            ]
                            Html.video [
                                prop.className "w-full max-w-2xl rounded-lg border border-surface-border bg-black"
                                prop.controls true
                                prop.src url
                            ]
                        ]
                    ])
                |> Option.defaultValue Html.none
                model.BakeUrl
                |> Option.map (fun url ->
                    Html.div [
                        prop.className "px-6 py-4 border-b border-surface-border bg-surface-raised"
                        prop.children [
                            Html.h2 [
                                prop.className "text-sm font-semibold mb-1"
                                prop.text "Final export (1080p Ken Burns · CPU)"
                            ]
                            Html.p [
                                prop.className "text-xs text-slate-500 mb-2"
                                prop.text "Higher-resolution stitch; GPU upscale applies when enabled on blocks."
                            ]
                            Html.video [
                                prop.className "w-full max-w-2xl rounded-lg border border-surface-border bg-black"
                                prop.controls true
                                prop.src url
                            ]
                        ]
                    ])
                |> Option.defaultValue Html.none
                model.Error
                |> Option.map (fun e ->
                    Html.div [ prop.className "px-6 py-2 text-red-400 text-sm"; prop.text e ])
                |> Option.defaultValue Html.none
                model.SharePack
                |> Option.map (fun sp -> SharePackPanel.view sp (SharePackMsg >> dispatch))
                |> Option.defaultValue Html.none
                Html.div [
                    prop.className "flex flex-1 min-h-0"
                    prop.children [
                        Html.div [
                            prop.className "flex-1 overflow-x-auto px-6 py-6"
                            prop.children [
                                if List.isEmpty blocks then
                                    Html.div [
                                        prop.className "text-slate-500 text-center py-16 border border-dashed border-surface-border rounded-lg"
                                        prop.text "Import images to build your storyboard timeline."
                                    ]
                                else
                                    Html.div [
                                        prop.className "flex gap-4 min-h-[180px]"
                                        prop.children (
                                            blocks
                                            |> List.mapi (fun i block ->
                                                let isSelected =
                                                    model.SelectedBlockId
                                                    |> Option.map ((=) block.Id)
                                                    |> Option.defaultValue false

                                                Html.div [
                                                    prop.key (string block.Id)
                                                    prop.draggable true
                                                    prop.className (
                                                        "w-44 shrink-0 rounded-lg border overflow-hidden cursor-grab active:cursor-grabbing "
                                                        + (if model.DragIndex = Some i then "opacity-60 "
                                                           else "")
                                                        + if isSelected then
                                                            "border-accent bg-surface-raised ring-1 ring-accent"
                                                          else
                                                            "border-surface-border bg-surface-raised hover:border-accent/60"
                                                    )
                                                    prop.onDragStart (fun ev ->
                                                        ev.dataTransfer.setData("text/plain", string i) |> ignore
                                                        ev.dataTransfer.effectAllowed <- "move"
                                                        dispatch (DragStart i))
                                                    prop.onDragOver (fun ev -> ev.preventDefault())
                                                    prop.onDrop (fun ev ->
                                                        ev.preventDefault()
                                                        dispatch (DropOnIndex i))
                                                    prop.onClick (fun _ -> dispatch (SelectBlock(Some block.Id)))
                                                    prop.children [
                                                        match blockThumbnailUrl model block with
                                                        | Some url ->
                                                            let imgKey =
                                                                block.ThumbnailPath
                                                                |> Option.map (fun p ->
                                                                    let _, k = mediaPreviewSrc model p
                                                                    k)
                                                                |> Option.defaultValue url

                                                            Html.div [
                                                                prop.className "aspect-video bg-surface overflow-hidden"
                                                                prop.children [
                                                                    Html.img [
                                                                        prop.key imgKey
                                                                        prop.className "w-full h-full object-cover"
                                                                        prop.src url
                                                                        prop.alt (
                                                                            block.Title
                                                                            |> Option.defaultValue "Block thumbnail"
                                                                        )
                                                                    ]
                                                                ]
                                                            ]
                                                        | None ->
                                                            Html.div [
                                                                prop.className "aspect-video bg-surface flex items-center justify-center text-xs text-slate-600 px-2 text-center"
                                                                prop.text (blockPlaceholderLabel block)
                                                            ]
                                                        Html.div [
                                                            prop.className "p-2 text-xs space-y-2"
                                                            prop.children [
                                                                Html.div [
                                                                    prop.className "text-slate-400"
                                                                    prop.text (
                                                                        let mockupDur = Project.effectiveMockupDuration model.Project block
                                                                        let bakeDur = Project.effectiveBakeDuration model.Project block

                                                                        let durText =
                                                                            match block.MockupDurationSec with
                                                                            | Some d when abs (d - mockupDur) > 0.01 ->
                                                                                $"#{i + 1} · {mockupDur}s preview"
                                                                            | _ -> $"#{i + 1} · {mockupDur}s"

                                                                        let bakeText =
                                                                            if block.BakeDurationSec.IsSome && abs (bakeDur - mockupDur) > 0.01 then
                                                                                $" · {bakeDur}s bake"
                                                                            else
                                                                                ""

                                                                        let shotText =
                                                                            match block.ShotKind with
                                                                            | Some kind -> $" · {BlockShotKind.label kind}"
                                                                            | None -> ""

                                                                        durText + bakeText + shotText
                                                                    )
                                                                ]
                                                                Html.div [
                                                                    prop.className "flex gap-1"
                                                                    prop.children [
                                                                        Html.button [
                                                                            prop.className "flex-1 py-1 rounded border border-surface-border hover:border-accent"
                                                                            prop.text "↑"
                                                                            prop.onClick (fun ev ->
                                                                                ev.stopPropagation ()
                                                                                dispatch (MoveBlockUp block.Id))
                                                                        ]
                                                                        Html.button [
                                                                            prop.className "flex-1 py-1 rounded border border-surface-border hover:border-accent"
                                                                            prop.text "↓"
                                                                            prop.onClick (fun ev ->
                                                                                ev.stopPropagation ()
                                                                                dispatch (MoveBlockDown block.Id))
                                                                        ]
                                                                    ]
                                                                ]
                                                            ]
                                                        ]
                                                    ]
                                                ])
                                        )
                                    ]
                            ]
                        ]
                        selected
                        |> Option.map (fun block ->
                            Html.aside [
                                prop.className "w-80 border-l border-surface-border bg-surface-raised flex flex-col shrink-0"
                                prop.children [
                                    Html.div [
                                        prop.className "px-4 py-3 border-b border-surface-border font-semibold text-sm"
                                        prop.text (
                                            block.Title
                                            |> Option.defaultValue "Block inspector"
                                        )
                                    ]
                                    Html.div [
                                        prop.className "p-4 space-y-4 text-sm overflow-y-auto flex-1"
                                        prop.children [
                                            Html.div [
                                                prop.className "rounded-md border border-surface-border bg-surface p-3 space-y-1"
                                                prop.children [
                                                    Html.p [
                                                        prop.className "text-xs font-medium text-slate-400"
                                                        prop.text "Clip planning (local AI / LTX-style)"
                                                    ]
                                                    Html.p [
                                                        prop.className "text-xs text-slate-500"
                                                        prop.text (ClipGenerationGuidance.promptHint block)
                                                    ]
                                                    match model.ShotKindDraft with
                                                    | Some kind ->
                                                        Html.p [
                                                            prop.className "text-xs text-accent/90"
                                                            prop.text (
                                                                ClipGenerationGuidance.guidanceSummary clipGuidanceProfile kind
                                                            )
                                                        ]
                                                    | None ->
                                                        Html.p [
                                                            prop.className "text-xs text-slate-600"
                                                            prop.text "Pick a shot type below for resolution and max-duration hints."
                                                        ]
                                                    match ClipGenerationGuidance.continuationHint (List.findIndex (fun b -> b.Id = block.Id) blocks) (blocks |> List.tryFind (fun b -> b.Order = block.Order - 1)) with
                                                    | Some tip ->
                                                        Html.p [
                                                            prop.className "text-xs text-amber-400/80"
                                                            prop.text tip
                                                        ]
                                                    | None -> Html.none
                                                ]
                                            ]
                                            Html.div [
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Shot type (AI clip guidance)"
                                                    ]
                                                    Html.select [
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1.5 text-sm"
                                                        prop.value (
                                                            model.ShotKindDraft
                                                            |> Option.map BlockShotKind.toSchemaValue
                                                            |> Option.defaultValue ""
                                                        )
                                                        prop.onChange (fun (v: string) ->
                                                            let kind =
                                                                if System.String.IsNullOrWhiteSpace v then None
                                                                else BlockShotKind.fromSchemaValue v

                                                            dispatch (SetShotKind kind))
                                                        prop.children (
                                                            shotKindOptions
                                                            |> List.map (fun (label, kind) ->
                                                                Html.option [
                                                                    prop.value (
                                                                        kind
                                                                        |> Option.map BlockShotKind.toSchemaValue
                                                                        |> Option.defaultValue ""
                                                                    )
                                                                    prop.text label
                                                                ])
                                                        )
                                                    ]
                                                    match model.ShotKindDraft with
                                                    | Some kind ->
                                                        Html.button [
                                                            prop.type' "button"
                                                            prop.className "mt-2 w-full px-2 py-1.5 rounded-md border border-accent/40 text-xs text-accent hover:bg-accent/10"
                                                            prop.text (
                                                                $"Apply recommended bake length ({recommendedBakeDurationText kind}s)"
                                                            )
                                                            prop.onClick (fun _ -> dispatch ApplyRecommendedBakeDuration)
                                                        ]
                                                    | None -> Html.none
                                                ]
                                            ]
                                            Html.div [
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Bake clip length (seconds)"
                                                    ]
                                                    Html.input [
                                                        prop.type' "number"
                                                        prop.min 0.5
                                                        prop.max 120
                                                        prop.step 0.5
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm"
                                                        prop.placeholder (
                                                            let mockup = Project.effectiveMockupDuration model.Project block

                                                            $"Empty = mockup timing ({formatDuration mockup}s)"
                                                        )
                                                        prop.value model.BakeDurationDraft
                                                        prop.onChange (fun (v: string) -> dispatch (SetBakeDuration v))
                                                    ]
                                                    Html.p [
                                                        prop.className "mt-1 text-xs text-slate-500"
                                                        prop.text "Ken Burns preview uses mockup timing (3–4s). Bake final MP4 uses this length per block."
                                                    ]
                                                    match model.ShotKindDraft, model.BakeDurationDraft with
                                                    | Some kind, draft when not (System.String.IsNullOrWhiteSpace draft) ->
                                                        match System.Double.TryParse draft with
                                                        | true, sec when ClipGenerationGuidance.durationExceedsGuidance clipGuidanceProfile kind sec ->
                                                            Html.p [
                                                                prop.className "mt-1 text-xs text-amber-400/90"
                                                                prop.text (
                                                                    $"Above ~{int (ClipGenerationGuidance.recommendedMaxSeconds clipGuidanceProfile kind)}s recommended for {BlockShotKind.label kind} on 8 GB VRAM — may OOM in future AI clip export."
                                                                )
                                                            ]
                                                        | _ -> Html.none
                                                    | _ -> Html.none
                                                ]
                                            ]
                                            Html.div [
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Image prompt"
                                                    ]
                                                    Html.textarea [
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[60px]"
                                                        prop.placeholder (imagePromptPlaceholder block)
                                                        prop.value model.ImagePromptDraft
                                                        prop.onChange (fun v -> dispatch (SetImagePrompt v))
                                                    ]
                                                    Html.p [
                                                        prop.className "mt-1 text-xs text-slate-500"
                                                        prop.text "Prompts = behavior. Guide frames / thumbnails = geography. Use a cut for location changes."
                                                    ]
                                                    if looksLikeFilename model.ImagePromptDraft then
                                                        Html.p [
                                                            prop.className "mt-1 text-xs text-amber-400/90"
                                                            prop.text "This looks like a filename — use a text description for AI generation, or import the image instead."
                                                        ]
                                                    if not model.ImagePromptQuickButtons.IsEmpty then
                                                        Html.div [
                                                            prop.className "mt-2 space-y-1"
                                                            prop.children [
                                                                Html.p [
                                                                    prop.className "text-xs text-slate-500"
                                                                    prop.text "Quick prompts"
                                                                ]
                                                                Html.div [
                                                                    prop.className "flex flex-wrap gap-1.5"
                                                                    prop.children (
                                                                        model.ImagePromptQuickButtons
                                                                        |> List.map (fun qb ->
                                                                            Html.button [
                                                                                prop.type' "button"
                                                                                prop.className "px-2 py-1 rounded-md border border-surface-border text-xs hover:border-accent hover:text-accent"
                                                                                prop.title qb.Prompt
                                                                                prop.text qb.Label
                                                                                prop.onClick (fun _ ->
                                                                                    dispatch (ApplyPromptQuickButton qb.Prompt))
                                                                            ])
                                                                    )
                                                                ]
                                                            ]
                                                        ]
                                                ]
                                            ]
                                            Html.div [
                                                prop.className "space-y-2 rounded-md border border-surface-border p-3"
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Reference image (optional, img2img)"
                                                    ]
                                                    block.Generation
                                                    |> Option.bind (fun g -> g.ReferenceAssetPath)
                                                    |> Option.map (fun path ->
                                                        Html.div [
                                                            prop.className "space-y-2"
                                                            prop.children [
                                                                (let src, imgKey = mediaPreviewSrc model path in
                                                                 Html.img [
                                                                     prop.key imgKey
                                                                     prop.className "w-full max-h-32 object-contain rounded border border-surface-border bg-surface"
                                                                     prop.src src
                                                                     prop.alt "Reference for generation"
                                                                 ])
                                                                Html.p [
                                                                    prop.className "text-xs text-slate-500 truncate"
                                                                    prop.title path
                                                                    prop.text path
                                                                ]
                                                                Html.button [
                                                                    prop.type' "button"
                                                                    prop.className "w-full px-2 py-1.5 rounded-md border border-surface-border text-xs hover:border-red-400 hover:text-red-300"
                                                                    prop.text "Remove reference"
                                                                    prop.onClick (fun _ -> dispatch ClearReferenceImage)
                                                                ]
                                                            ]
                                                        ])
                                                    |> Option.defaultWith (fun () ->
                                                    Html.p [
                                                        prop.className "text-xs text-slate-500"
                                                        prop.text "Upload a photo or use the block thumbnail to guide GPU generation. Top bar Import image adds a timeline block — use this section to attach a reference for img2img."
                                                    ])
                                                    Html.label [
                                                        prop.className "block px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm text-center"
                                                        prop.children [
                                                            Html.input [
                                                                prop.type' "file"
                                                                prop.accept "image/*"
                                                                prop.className "hidden"
                                                                prop.onChange (fun (ev: Browser.Types.Event) ->
                                                                    let input = ev.target :?> Browser.Types.HTMLInputElement
                                                                    let files = input.files

                                                                    if not (isNull files) && files.length > 0 then
                                                                        dispatch (ImportReferenceImage files.[0]))
                                                            ]
                                                            Html.span [ prop.text "Upload reference image" ]
                                                        ]
                                                    ]
                                                    block.ThumbnailPath
                                                    |> Option.filter (fun thumb ->
                                                        block.Generation
                                                        |> Option.bind (fun g -> g.ReferenceAssetPath)
                                                        |> Option.map ((<>) thumb)
                                                        |> Option.defaultValue true)
                                                    |> Option.map (fun _ ->
                                                        Html.button [
                                                            prop.type' "button"
                                                            prop.className "w-full px-2 py-1.5 rounded-md border border-surface-border text-xs hover:border-accent"
                                                            prop.text "Use block thumbnail as reference"
                                                            prop.onClick (fun _ -> dispatch UseThumbnailAsReference)
                                                        ])
                                                    |> Option.defaultValue Html.none
                                                    Html.div [
                                                        prop.children [
                                                            Html.label [
                                                                prop.className "block text-xs text-slate-500 mb-1"
                                                                prop.text (
                                                                    $"Reference strength: {formatFloat 2 model.ReferenceStrengthDraft} (lower = closer to photo; 0.5–0.6 to add props/outfits)"
                                                                )
                                                            ]
                                                            Html.input [
                                                                prop.type' "range"
                                                                prop.min 0.15
                                                                prop.max 0.65
                                                                prop.step 0.05
                                                                prop.className "w-full"
                                                                prop.value (string model.ReferenceStrengthDraft)
                                                                prop.onChange (fun (v: string) ->
                                                                    match System.Double.TryParse v with
                                                                    | true, n -> dispatch (SetReferenceStrength n)
                                                                    | _ -> ())
                                                            ]
                                                        ]
                                                    ]
                                                ]
                                            ]
                                            Html.button [
                                                prop.className "w-full px-3 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50"
                                                prop.disabled model.Generating
                                                prop.text (
                                                    if model.Generating then
                                                        "Generating 3 variants…"
                                                    else
                                                        match block.Generation |> Option.bind (fun g -> g.ReferenceAssetPath) with
                                                        | Some _ -> "Generate 3 thumbnails from reference (GPU)"
                                                        | None -> "Generate 3 thumbnails (GPU)"
                                                )
                                                prop.onClick (fun _ -> dispatch GenerateThumbnail)
                                            ]
                                            block.Generation
                                            |> Option.bind (fun g -> g.ThumbnailVariants)
                                            |> Option.filter (fun vs -> vs.Length > 1)
                                            |> Option.map (fun variants ->
                                                Html.div [
                                                    prop.className "space-y-2"
                                                    prop.children [
                                                        Html.div [
                                                            prop.className "flex items-center justify-between gap-2"
                                                            prop.children [
                                                                Html.p [
                                                                    prop.className "text-xs text-slate-500"
                                                                    prop.text "Pick a variant"
                                                                ]
                                                                Html.button [
                                                                    prop.type' "button"
                                                                    prop.className "text-xs text-accent hover:underline"
                                                                    prop.text "Compare large…"
                                                                    prop.onClick (fun _ -> dispatch OpenVariantModal)
                                                                ]
                                                            ]
                                                        ]
                                                        Html.div [
                                                            prop.className "grid grid-cols-3 gap-2"
                                                            prop.children (
                                                                variants
                                                                |> List.mapi (fun vi path ->
                                                                    let selected =
                                                                        block.ThumbnailPath
                                                                        |> Option.map ((=) path)
                                                                        |> Option.defaultValue (vi = 0)

                                                                    let src, imgKey = mediaPreviewSrc model path

                                                                    Html.button [
                                                                        prop.key imgKey
                                                                        prop.type' "button"
                                                                        prop.className (
                                                                            "aspect-video rounded border overflow-hidden "
                                                                            + (if selected then
                                                                                   "border-accent ring-1 ring-accent"
                                                                               else
                                                                                   "border-surface-border hover:border-accent/60")
                                                                        )
                                                                        prop.onClick (fun _ -> dispatch (SelectThumbnailVariant path))
                                                                        prop.onDoubleClick (fun _ -> dispatch OpenVariantModal)
                                                                        prop.children [
                                                                            Html.img [
                                                                                prop.key imgKey
                                                                                prop.className "w-full h-full object-cover"
                                                                                prop.src src
                                                                                prop.alt $"Variant {vi + 1}"
                                                                            ]
                                                                        ]
                                                                    ])
                                                            )
                                                        ]
                                                    ]
                                                ])
                                            |> Option.defaultValue Html.none
                                            Html.div [
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Crossfade to next (ms)"
                                                    ]
                                                    Html.input [
                                                        prop.type' "number"
                                                        prop.min 0
                                                        prop.max 2000
                                                        prop.step 50
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm"
                                                        prop.value (string model.CrossfadeDurationDraft)
                                                        prop.onChange (fun (v: string) ->
                                                            match System.Int32.TryParse v with
                                                            | true, n -> dispatch (SetCrossfadeDuration n)
                                                            | _ -> ())
                                                    ]
                                                    Html.p [
                                                        prop.className "mt-1 text-xs text-slate-500"
                                                        prop.text "Crossfade between blocks in Ken Burns preview and bake. Use a hard cut (0 ms) when changing location — V2V continuation works best for motion, not geography."
                                                    ]
                                                ]
                                            ]
                                            Html.div [
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Director notes"
                                                    ]
                                                    Html.textarea [
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[56px]"
                                                        prop.placeholder "Editing intent: extend prior clip, new guide frame, cut on cottage reveal…"
                                                        prop.value model.DirectorNotesDraft
                                                        prop.onChange (fun v -> dispatch (SetDirectorNotes v))
                                                    ]
                                                ]
                                            ]
                                            Html.div [
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Voiceover script"
                                                    ]
                                                    Html.textarea [
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[80px]"
                                                        prop.placeholder "Narration for this block…"
                                                        prop.value model.VoiceoverDraft
                                                        prop.onChange (fun v -> dispatch (SetVoiceoverScript v))
                                                    ]
                                                ]
                                            ]
                                            Html.div [
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Mood / tone tags (comma-separated)"
                                                    ]
                                                    Html.input [
                                                        prop.type' "text"
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm"
                                                        prop.placeholder "calm, upbeat, cinematic"
                                                        prop.value model.MoodTagsDraft
                                                        prop.onChange (fun v -> dispatch (SetMoodTags v))
                                                    ]
                                                ]
                                            ]
                                            Html.label [
                                                prop.className "block px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm text-center"
                                                prop.children [
                                                    Html.input [
                                                        prop.type' "file"
                                                        prop.accept "audio/*"
                                                        prop.className "hidden"
                                                        prop.onChange (fun (ev: Browser.Types.Event) ->
                                                            let input = ev.target :?> Browser.Types.HTMLInputElement
                                                            let files = input.files

                                                            if not (isNull files) && files.length > 0 then
                                                                dispatch (ImportAudio files.[0]))
                                                    ]
                                                    Html.span [
                                                        prop.text (
                                                            match block.Audio with
                                                            | Some a when a.Path.IsSome -> "Replace audio"
                                                            | _ -> "Import audio"
                                                        )
                                                    ]
                                                ]
                                            ]
                                            block.Audio
                                            |> Option.bind (fun a -> a.Path)
                                            |> Option.map (fun p ->
                                                Html.p [
                                                    prop.className "text-xs text-slate-500 truncate"
                                                    prop.text $"Audio: {p}"
                                                ])
                                            |> Option.defaultValue Html.none
                                            Html.button [
                                                prop.className "w-full px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50"
                                                prop.disabled model.Saving
                                                prop.text (if model.Saving then "Saving…" else "Save block fields")
                                                prop.onClick (fun _ -> dispatch SaveBlockFields)
                                            ]
                                        ]
                                    ]
                                ]
                            ])
                        |> Option.defaultValue Html.none
                    ]
                ]
                match model.VariantModal, selected with
                | Some _, Some block ->
                    block.Generation
                    |> Option.bind (fun g -> g.ThumbnailVariants)
                    |> Option.filter (fun vs -> vs.Length > 1)
                    |> Option.map (fun variants -> variantModalView model block variants dispatch)
                    |> Option.defaultValue Html.none
                | _ -> Html.none
            ]
        ]

    let setDragIndex model idx =
        { model with DragIndex = Some idx }

    let moveUp model blockId =
        { model with Project = reorder model.Project blockId -1 }

    let moveDown model blockId =
        { model with Project = reorder model.Project blockId 1 }

    let withProject project model =
        selectBlock
            { model with
                Project = project
                Saving = false
                Generating = false
                Error = None }
            model.SelectedBlockId

    let withProjectAfterGenerate project model =
        let revision = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()

        let model' =
            selectBlock
                { model with
                    Project = project
                    Saving = false
                    Generating = false
                    Error = None
                    MediaRevision = revision }
                model.SelectedBlockId

        match selectedBlock model' with
        | Some block ->
            match block.Generation |> Option.bind (fun g -> g.ThumbnailVariants) with
            | Some vs when vs.Length > 1 -> { model' with VariantModal = Some Compare }
            | _ -> model'
        | None -> model'

    let withSharePack sharePack model =
        { model with SharePack = Some sharePack; Saving = false; Error = None }

    let updateSharePack f model =
        match model.SharePack with
        | None -> model
        | Some sp -> { model with SharePack = Some(f sp) }

    let clearSharePack model =
        { model with SharePack = None }

    let withPreviewUrl url model =
        { model with PreviewUrl = Some url; Previewing = false; Error = None }

    let withPreviewStarted jobId model =
        { model with Previewing = true; PreviewJobId = Some jobId; Error = None }

    let withPreviewError err model =
        { model with Previewing = false; Error = Some err }

    let withBakeStarted jobId model =
        { model with Baking = true; BakeJobId = Some jobId; Error = None }

    let withBakeUrl url model =
        { model with Baking = false; BakeUrl = Some url; Error = None }

    let withBakeError err model =
        { model with Baking = false; Error = Some err }
