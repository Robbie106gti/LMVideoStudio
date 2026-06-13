module LMVideoStudio.Client.Views.ProjectHub



open Feliz

open Fable.Core.JsInterop

open LMVideoStudio.Client.Api



type ProjectHubMsg =

    | SetNewName of string

    | CreateClicked

    | OpenProject of System.Guid

    | SelectOutlineProject of System.Guid

    | Refresh

    | SetBrief of string

    | GenerateOutline

    | ApproveOutline

    | DiscardOutline

    | DeleteProject of System.Guid



type ProjectHubModel =

    { Summaries: ProjectSummaryDto list

      NewName: string

      Loading: bool

      Error: string option

      BriefText: string

      OutlineProjectId: System.Guid option

      OutlineBlocks: OutlineBlockDto list option

      OutlineWorking: bool }



module ProjectHub =

    let init () =

        { Summaries = []

          NewName = ""

          Loading = true

          Error = None

          BriefText = ""

          OutlineProjectId = None

          OutlineBlocks = None

          OutlineWorking = false }



    let view (model: ProjectHubModel) dispatch =

        Html.div [

            prop.className "max-w-3xl mx-auto p-8 space-y-8"

            prop.children [

                Html.h1 [

                    prop.className "text-2xl font-bold mb-2"

                    prop.text "Projects"

                ]

                Html.p [

                    prop.className "text-slate-400 mb-6"

                    prop.text "Create a storyboard project — import images, reorder blocks, save without a terminal."

                ]

                model.Error

                |> Option.map (fun err ->

                    Html.div [

                        prop.className "mb-4 text-red-400 text-sm"

                        prop.text err

                    ])

                |> Option.defaultValue Html.none

                Html.div [

                    prop.className "flex gap-2 mb-8"

                    prop.children [

                        Html.input [

                            prop.className "flex-1 rounded-md bg-surface-raised border border-surface-border px-3 py-2"

                            prop.placeholder "New project name"

                            prop.value model.NewName

                            prop.onChange (SetNewName >> dispatch)

                        ]

                        Html.button [

                            prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted font-medium disabled:opacity-50"

                            prop.disabled (model.Loading || System.String.IsNullOrWhiteSpace model.NewName)

                            prop.text "Create"

                            prop.onClick (fun _ -> dispatch CreateClicked)

                        ]

                        Html.button [

                            prop.className "px-3 py-2 rounded-md border border-surface-border text-slate-300"

                            prop.text "Refresh"

                            prop.onClick (fun _ -> dispatch Refresh)

                        ]

                    ]

                ]



                Html.div [

                    prop.className "rounded-lg border border-surface-border p-4 space-y-3"

                    prop.children [

                        Html.h2 [

                            prop.className "text-sm font-semibold"

                            prop.text "Brief → outline (Ollama)"

                        ]

                        Html.p [

                            prop.className "text-xs text-slate-500"

                            prop.text "Select a project below, paste a brief, generate an outline, then approve to create blocks."

                        ]

                        Html.textarea [

                            prop.className "w-full rounded-md bg-surface border border-surface-border px-3 py-2 text-sm min-h-[100px]"

                            prop.placeholder "Paste marketing brief or script notes…"

                            prop.value model.BriefText

                            prop.onChange (SetBrief >> dispatch)

                        ]

                        Html.button [

                            prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50"

                            prop.disabled (

                                model.OutlineWorking

                                || model.OutlineProjectId.IsNone

                                || System.String.IsNullOrWhiteSpace model.BriefText

                            )

                            prop.text (if model.OutlineWorking then "Generating…" else "Generate outline")

                            prop.onClick (fun _ -> dispatch GenerateOutline)

                        ]

                        model.OutlineProjectId

                        |> Option.map (fun id ->

                            Html.p [

                                prop.className "text-xs text-slate-500"

                                prop.text $"Target project: {id}"

                            ])

                        |> Option.defaultValue (

                            Html.p [

                                prop.className "text-xs text-amber-400/90"

                                prop.text "Click a project below to select it for outline generation."

                            ]

                        )

                        model.OutlineBlocks

                        |> Option.map (fun blocks ->

                            Html.div [

                                prop.className "space-y-3 border-t border-surface-border pt-3"

                                prop.children [

                                    Html.p [

                                        prop.className "text-sm font-medium"

                                        prop.text $"{blocks.Length} proposed blocks"

                                    ]

                                    Html.ul [

                                        prop.className "space-y-2 text-sm max-h-48 overflow-y-auto"

                                        prop.children (

                                            blocks

                                            |> List.mapi (fun i b ->

                                                Html.li [

                                                    prop.className "rounded border border-surface-border p-2"

                                                    prop.children [

                                                        Html.div [

                                                            prop.className "font-medium"

                                                            prop.text $"{i + 1}. {b.Title}"

                                                        ]

                                                        Html.div [

                                                            prop.className "text-xs text-slate-500 mt-1"

                                                            prop.text b.VoiceoverScript

                                                        ]

                                                    ]

                                                ])

                                        )

                                    ]

                                    Html.div [

                                        prop.className "flex gap-2"

                                        prop.children [

                                            Html.button [

                                                prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm disabled:opacity-50"

                                                prop.disabled model.OutlineWorking

                                                prop.text "Approve → create blocks"

                                                prop.onClick (fun _ -> dispatch ApproveOutline)

                                            ]

                                            Html.button [

                                                prop.className "px-3 py-2 rounded-md border border-surface-border text-sm"

                                                prop.text "Discard"

                                                prop.onClick (fun _ -> dispatch DiscardOutline)

                                            ]

                                        ]

                                    ]

                                ]

                            ])

                        |> Option.defaultValue Html.none

                    ]

                ]



                if model.Loading then

                    Html.p [ prop.className "text-slate-500"; prop.text "Loading…" ]

                else

                    Html.ul [

                        prop.className "space-y-2"

                        prop.children (

                            model.Summaries

                            |> List.map (fun s ->

                                let selected =

                                    model.OutlineProjectId

                                    |> Option.map ((=) s.Id)

                                    |> Option.defaultValue false



                                Html.li [

                                    prop.className "flex items-start gap-2"

                                    prop.children [

                                        Html.button [

                                            prop.className (

                                                "flex-1 text-left rounded-lg border px-4 py-3 hover:border-accent "

                                                + if selected then

                                                    "border-accent bg-surface-raised ring-1 ring-accent"

                                                  else

                                                    "border-surface-border bg-surface-raised"

                                            )

                                            prop.onClick (fun _ -> dispatch (OpenProject s.Id))

                                            prop.children [

                                                Html.div [

                                                    prop.className "font-medium"

                                                    prop.text s.Name

                                                ]

                                                Html.div [

                                                    prop.className "text-xs text-slate-500 mt-1"

                                                    prop.text $"{s.BlockCount} blocks · click to open timeline"

                                                ]

                                            ]

                                        ]

                                        Html.button [

                                            prop.className "mt-1 px-2 py-1 rounded-md border border-red-500/40 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"

                                            prop.disabled model.Loading

                                            prop.text "Delete"

                                            prop.onClick (fun ev ->

                                                ev.stopPropagation ()

                                                let confirmed =

                                                    Browser.Dom.window.confirm (

                                                        $"Delete project \"{s.Name}\"? This removes all files and cannot be undone."

                                                    )

                                                if confirmed then

                                                    dispatch (DeleteProject s.Id))

                                        ]

                                        Html.button [

                                            prop.className "mt-1 text-xs text-accent hover:underline ml-0"

                                            prop.text (

                                                if selected then "Selected for outline" else "Select for outline"

                                            )

                                            prop.onClick (fun _ -> dispatch (SelectOutlineProject s.Id))

                                        ]

                                    ]

                                ]

                        )

                    )

                    ]

            ]

        ]


