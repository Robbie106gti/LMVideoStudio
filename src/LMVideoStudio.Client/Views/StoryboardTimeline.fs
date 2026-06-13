module LMVideoStudio.Client.Views.StoryboardTimeline

open System
open Feliz
open LMVideoStudio.Client.Api
open LMVideoStudio.Domain

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
    | SetCrossfadeDuration of int
    | SaveBlockFields
    | GenerateThumbnail
    | SelectThumbnailVariant of string
    | ImportAudio of Browser.Types.File
    | RefreshMockupPreview
    | StartBake
    | ExportSharePack
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
      CrossfadeDurationDraft: int }

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
          CrossfadeDurationDraft = 300 }

    let private sortedBlocks (project: Project) =
        project.Blocks |> List.sortBy (fun b -> b.Order)

    let private mediaCacheBust (project: Project) =
        project.UpdatedAt
        |> Option.map (fun d -> d.ToUnixTimeMilliseconds())
        |> Option.defaultValue (DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())

    let private blockThumbnailUrl (projectId: Guid) (project: Project) (block: StoryboardBlock) =
        block.ThumbnailPath
        |> Option.map (fun path -> previewMediaUrl projectId path (mediaCacheBust project))

    let private looksLikeFilename (prompt: string) =
        if String.IsNullOrWhiteSpace prompt then
            false
        else
            let lower = prompt.Trim().ToLowerInvariant()

            lower.EndsWith ".png"
            || lower.EndsWith ".jpg"
            || lower.EndsWith ".jpeg"
            || lower.EndsWith ".webp"
            || lower.EndsWith ".gif"
            || (prompt.Contains('\\') && not (prompt.Contains ' '))

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

    let selectBlock model blockId =
        match blockId with
        | Some id ->
            match model.Project.Blocks |> List.tryFind (fun b -> b.Id = id) with
            | Some block ->
                { model with
                    SelectedBlockId = Some id
                    VoiceoverDraft = block.VoiceoverScript |> Option.defaultValue ""
                    ImagePromptDraft = block.ImagePrompt |> Option.defaultValue ""
                    CrossfadeDurationDraft = blockCrossfadeMs block model.Project }
            | None -> { model with SelectedBlockId = None }
        | None ->
            { model with SelectedBlockId = None }

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
                                prop.text $"{blocks.Length} blocks · default {model.Project.DefaultMockupDurationSec}s mockup (3–4s)"
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
                                    prop.title "CPU FFmpeg libx264 stitch — not GPU"
                                    prop.text (
                                        if model.Previewing then "Rendering preview…"
                                        else "Refresh mockup preview"
                                    )
                                    prop.onClick (fun _ -> dispatch RefreshMockupPreview)
                                ]
                                Html.button [
                                    prop.className "px-4 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm font-medium disabled:opacity-50"
                                    prop.disabled (model.Baking || model.Saving)
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
                                prop.className "text-sm font-semibold mb-2"
                                prop.text "Mockup preview (640p Ken Burns stitch)"
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
                                prop.className "text-sm font-semibold mb-2"
                                prop.text "Bake export (1080p Ken Burns stitch)"
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
                                                        match blockThumbnailUrl model.Project.Id model.Project block with
                                                        | Some url ->
                                                            Html.div [
                                                                prop.className "aspect-video bg-surface overflow-hidden"
                                                                prop.children [
                                                                    Html.img [
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
                                                                        let dur = Project.effectiveMockupDuration model.Project block

                                                                        match block.MockupDurationSec with
                                                                        | Some d when abs (d - dur) > 0.01 ->
                                                                            $"#{i + 1} · {dur}s (from audio)"
                                                                        | _ -> $"#{i + 1} · {dur}s"
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
                                                prop.children [
                                                    Html.label [
                                                        prop.className "block text-xs text-slate-500 mb-1"
                                                        prop.text "Image prompt"
                                                    ]
                                                    Html.textarea [
                                                        prop.className "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[60px]"
                                                        prop.placeholder "Describe the scene to generate…"
                                                        prop.value model.ImagePromptDraft
                                                        prop.onChange (fun v -> dispatch (SetImagePrompt v))
                                                    ]
                                                    if looksLikeFilename model.ImagePromptDraft then
                                                        Html.p [
                                                            prop.className "mt-1 text-xs text-amber-400/90"
                                                            prop.text "This looks like a filename — use a text description for AI generation, or import the image instead."
                                                        ]
                                                ]
                                            ]
                                            Html.button [
                                                prop.className "w-full px-3 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50"
                                                prop.disabled model.Generating
                                                prop.text (
                                                    if model.Generating then "Generating 3 variants…" else "Generate 3 thumbnail variants"
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
                                                        Html.p [
                                                            prop.className "text-xs text-slate-500"
                                                            prop.text "Pick a variant"
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

                                                                    Html.button [
                                                                        prop.type' "button"
                                                                        prop.className (
                                                                            "aspect-video rounded border overflow-hidden "
                                                                            + (if selected then
                                                                                   "border-accent ring-1 ring-accent"
                                                                               else
                                                                                   "border-surface-border hover:border-accent/60")
                                                                        )
                                                                        prop.onClick (fun _ -> dispatch (SelectThumbnailVariant path))
                                                                        prop.children [
                                                                            Html.img [
                                                                                prop.className "w-full h-full object-cover"
                                                                                prop.src (
                                                                                    previewMediaUrl model.Project.Id path (mediaCacheBust model.Project)
                                                                                )
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
                                                        prop.text "Per-block transition override for mockup preview and bake."
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
            ]
        ]

    let setDragIndex model idx =
        { model with DragIndex = Some idx }

    let moveUp model blockId =
        { model with Project = reorder model.Project blockId -1 }

    let moveDown model blockId =
        { model with Project = reorder model.Project blockId 1 }

    let withProject project model =
        let model' =
            selectBlock
                { model with
                    Project = project
                    Saving = false
                    Generating = false
                    Error = None }
                model.SelectedBlockId

        model'

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
