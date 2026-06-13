module LMVideoStudio.Client.Views.Settings



open Feliz
open Fable.Core.JsInterop
open LMVideoStudio.Client.Api
open LMVideoStudio.Client.ErrorReporting



type SettingsMsg =

    | CheckUpdates

    | RunBootstrap

    | ScanConflicts

    | RepairSetup

    | RefreshModelStatus

    | SyncModelsCheck

    | SyncModelsPull

    | DismissFirstRun

    | CloseProject

    | ToggleErrorReportingConsent

    | FlushErrorReports

    | SendPendingErrorReport



type SettingsModel =

    { Status: SystemStatusDto option

      ModelStatus: ModelStatusDto option

      Message: string option

      CheckingUpdates: bool

      SyncingModels: bool

      ShowFirstRunBanner: bool

      ErrorReportingConsent: bool

      ErrorReportingBusy: bool }



module Settings =

    let private bootstrapDoneKey = "lmvs_bootstrap_done"

    let private allSystemsOk (s: SystemStatusDto) =
        s.Host = "ok" && s.Ollama && s.Worker

    let private warmupLabel (s: SystemStatusDto) =
        if s.WarmupComplete then "GPU warmup: complete"
        else "GPU warmup: not run yet (optional)"



    let private readBootstrapDone () =

        try

            Browser.Dom.window.localStorage.getItem bootstrapDoneKey = "1"

        with _ ->

            false



    let init () =

        { Status = None

          ModelStatus = None

          Message = None

          CheckingUpdates = false

          SyncingModels = false

          ShowFirstRunBanner = not (readBootstrapDone ())

          ErrorReportingConsent = readConsent ()

          ErrorReportingBusy = false }



    let markBootstrapStarted () =

        try

            Browser.Dom.window.localStorage.setItem(bootstrapDoneKey, "1")

        with _ ->

            ()



    let view (model: SettingsModel) dispatch =

        Html.div [

            prop.className "max-w-xl mx-auto p-8 space-y-6"

            prop.children [

                Html.h1 [ prop.className "text-2xl font-bold"; prop.text "Settings" ]



                Html.p [

                    prop.className "text-sm text-slate-400"

                    prop.text "Mockup export uses CPU (FFmpeg libx264). AI thumbnails and upscale use GPU (Python worker / ROCm). Check Task Manager GPU tab during Generate, not during mockup refresh."

                ]



                if model.ShowFirstRunBanner then

                    Html.div [

                        prop.className "rounded-lg border border-accent/40 bg-accent/10 p-4 space-y-3"

                        prop.children [

                            Html.p [

                                prop.className "text-sm"

                                prop.text "First run — bootstrap checks Ollama, Python worker, model catalog, FFmpeg, and sidecar health."

                            ]

                            Html.div [

                                prop.className "flex gap-2"

                                prop.children [

                                    Html.button [

                                        prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium"

                                        prop.text "Run first-run bootstrap"

                                        prop.onClick (fun _ -> dispatch RunBootstrap)

                                    ]

                                    Html.button [

                                        prop.className "px-3 py-2 rounded-md border border-surface-border text-sm"

                                        prop.text "Dismiss"

                                        prop.onClick (fun _ -> dispatch DismissFirstRun)

                                    ]

                                ]

                            ]

                        ]

                    ]



                model.Status

                |> Option.map (fun s ->

                    Html.div [

                        prop.className "space-y-3"

                        prop.children [

                            if allSystemsOk s then

                                Html.div [

                                    prop.className "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"

                                    prop.text "All systems OK — Host, Ollama, and Worker are reachable."

                                ]

                            Html.div [

                                prop.className "rounded-lg border border-surface-border p-4 space-y-2 text-sm"

                                prop.children [

                                    Html.div [ prop.text $"Host: {s.Host}" ]

                                    Html.div [

                                        prop.text (

                                            if s.Ollama then "Ollama: reachable" else "Ollama: offline"

                                        )

                                    ]

                                    Html.div [

                                        prop.text (

                                            if s.Worker then "Worker: reachable" else "Worker: offline"

                                        )

                                    ]

                                    s.WorkerDevice

                                    |> Option.map (fun d ->

                                        let rocm =
                                            match d.Rocm with
                                            | Some true -> "ROCm/CUDA active"
                                            | Some false -> "CPU only (no GPU)"
                                            | None -> "GPU status unknown"

                                        let vram =
                                            d.VramGb
                                            |> Option.map (fun gb -> $"{gb:F1} GB VRAM")
                                            |> Option.defaultValue "VRAM unknown"

                                        let device =
                                            d.DeviceName |> Option.defaultValue "GPU device unknown"

                                        Html.div [

                                            prop.text $"Worker GPU: {device} — {rocm}, {vram}"

                                        ])

                                    |> Option.defaultValue Html.none

                                    Html.div [ prop.text (warmupLabel s) ]

                                    s.Ffmpeg

                                    |> Option.map (fun ok ->

                                        Html.div [

                                            prop.text (if ok then "FFmpeg: available" else "FFmpeg: not found")

                                        ])

                                    |> Option.defaultValue Html.none

                                ]

                            ]

                        ]

                    ])

                |> Option.defaultValue Html.none



                Html.div [

                    prop.className "rounded-lg border border-surface-border p-4 space-y-3"

                    prop.children [

                        Html.h2 [

                            prop.className "text-sm font-semibold"

                            prop.text "Model catalog"

                        ]

                        model.ModelStatus

                        |> Option.map (fun m ->

                            Html.div [

                                prop.className "text-sm space-y-1 text-slate-400"

                                prop.children [

                                    Html.div [

                                        prop.text (

                                            if m.ManifestExists then "Manifest: present" else "Manifest: missing"

                                        )

                                    ]

                                    Html.div [

                                        prop.text (

                                            if m.OllamaReachable then "Ollama registry: reachable"

                                            else "Ollama registry: offline"

                                        )

                                    ]

                                    Html.div [

                                        prop.className "truncate"

                                        prop.title m.ManifestPath

                                        prop.text m.ManifestPath

                                    ]

                                ]

                            ])

                        |> Option.defaultValue (

                            Html.p [ prop.className "text-sm text-slate-500"; prop.text "Loading model status…" ]

                        )

                        Html.div [

                            prop.className "flex flex-wrap gap-2"

                            prop.children [

                                Html.button [

                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50"

                                    prop.disabled model.SyncingModels

                                    prop.text "Refresh status"

                                    prop.onClick (fun _ -> dispatch RefreshModelStatus)

                                ]

                                Html.button [

                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50"

                                    prop.disabled model.SyncingModels

                                    prop.text "Check models"

                                    prop.onClick (fun _ -> dispatch SyncModelsCheck)

                                ]

                                Html.button [

                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50"

                                    prop.disabled model.SyncingModels

                                    prop.text "Sync / pull models"

                                    prop.onClick (fun _ -> dispatch SyncModelsPull)

                                ]

                            ]

                        ]

                    ]

                ]



                Html.div [

                    prop.className "rounded-lg border border-surface-border p-4 space-y-3"

                    prop.children [

                        Html.h2 [

                            prop.className "text-sm font-semibold"

                            prop.text "Error reporting"

                        ]

                        Html.p [

                            prop.className "text-sm text-slate-400"

                            prop.text "Crash and API errors are saved locally under %LOCALAPPDATA%\\LMVideoStudio\\reports. With consent, reports are sent to the developer webhook configured in config/error-reporting.json."

                        ]

                        Html.label [

                            prop.className "flex items-center gap-2 text-sm"

                            prop.children [

                                Html.input [

                                    prop.type'.checkbox

                                    prop.isChecked model.ErrorReportingConsent

                                    prop.onChange (fun (v: bool) -> dispatch ToggleErrorReportingConsent)

                                ]

                                Html.span [ prop.text "Send error reports automatically (default off)" ]

                            ]

                        ]

                        Html.div [

                            prop.className "flex flex-wrap gap-2"

                            prop.children [

                                Html.button [

                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50"

                                    prop.disabled model.ErrorReportingBusy

                                    prop.text "Send queued reports"

                                    prop.onClick (fun _ -> dispatch FlushErrorReports)

                                ]

                                Html.button [

                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50"

                                    prop.disabled model.ErrorReportingBusy

                                    prop.text "Send last captured error"

                                    prop.onClick (fun _ -> dispatch SendPendingErrorReport)

                                ]

                            ]

                        ]

                    ]

                ]



                Html.div [
                    prop.className "rounded-lg border border-surface-border p-4 space-y-2"
                    prop.children [
                        Html.h2 [
                            prop.className "text-sm font-semibold text-slate-300"
                            prop.text "Social upload (OAuth)"
                        ]
                        Html.p [
                            prop.className "text-xs text-slate-500"
                            prop.text "Direct YouTube / Meta upload requires OAuth app credentials (client ID + secret). Share Pack copy-to-clipboard and open-upload assist work today without OAuth."
                        ]
                    ]
                ]



                Html.div [

                    prop.className "flex flex-col gap-2"

                    prop.children [

                        Html.button [

                            prop.className "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent"

                            prop.text "Close project"

                            prop.onClick (fun _ -> dispatch CloseProject)

                        ]

                        Html.button [

                            prop.className "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent"

                            prop.text "Check for updates"

                            prop.disabled model.CheckingUpdates

                            prop.onClick (fun _ -> dispatch CheckUpdates)

                        ]

                        Html.button [

                            prop.className "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent"

                            prop.text "Run bootstrap"

                            prop.onClick (fun _ -> dispatch RunBootstrap)

                        ]

                        Html.button [

                            prop.className "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent"

                            prop.text "Repair setup"

                            prop.onClick (fun _ -> dispatch RepairSetup)

                        ]

                        Html.button [

                            prop.className "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent"

                            prop.text "Scan GPU conflicts"

                            prop.onClick (fun _ -> dispatch ScanConflicts)

                        ]

                    ]

                ]

                model.Message

                |> Option.map (fun m -> Html.p [ prop.className "text-sm text-slate-400"; prop.text m ])

                |> Option.defaultValue Html.none

            ]

        ]


