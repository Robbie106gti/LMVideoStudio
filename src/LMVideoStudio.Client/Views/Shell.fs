module LMVideoStudio.Client.Views.Shell

open Feliz
open LMVideoStudio.Client.Api
open LMVideoStudio.Client.ActivityPanel

type ShellTab =
    | Hub
    | Timeline
    | Settings

type ShellModel =
    { Tab: ShellTab
      Activity: ActivityPanelState
      SystemStatus: SystemStatusDto option }

type ShellMsg =
    | SelectTab of ShellTab
    | EventReceived of JobEventDto
    | SseConnected
    | StatusLoaded of SystemStatusDto

module Shell =
    let init activity =
        { Tab = Hub
          Activity = activity
          SystemStatus = None }

    let private formatPhase phase =
        match phase with
        | "mockup_preview" -> "Preview"
        | "image_generate" -> "Generate"
        | "bootstrap" -> "Bootstrap"
        | "bake" -> "Bake"
        | "audio_generate" -> "Voiceover"
        | other -> other.Replace('_', ' ')

    let statusBar (status: SystemStatusDto option) (activity: ActivityPanelState) =
        let gpuJob =
            activeGpuHint activity.Events
            |> Option.map (fun e ->
                let cold =
                    e.IsColdRun
                    |> Option.map (fun b -> if b then " (cold — first GPU compile may take several minutes)" else " (warm)")
                    |> Option.defaultValue ""

                $"{formatPhase e.Phase}: {e.Message}{cold}")

        Html.footer [
            prop.className "h-8 border-t border-surface-border bg-surface-raised px-4 flex items-center gap-4 text-xs text-slate-500 min-w-0"
            prop.children [
                Html.span [ prop.className "shrink-0"; prop.text "LMVideoStudio" ]
                status
                |> Option.map (fun s ->
                    let ollama = if s.Ollama then "✓" else "—"
                    let worker = if s.Worker then "✓" else "—"

                    let warmup =
                        if s.WarmupComplete then "warm"
                        else "cold"

                    let gpuHint =
                        s.WorkerDevice
                        |> Option.bind (fun d ->
                            if d.Rocm = Some true then
                                d.VramGb |> Option.map (fun gb -> $"GPU {gb:F0}GB · {warmup}")
                            else
                                None)

                    Html.span [
                        prop.className "shrink-0"
                        prop.text (
                            match gpuHint with
                            | Some g -> $"Host OK · Ollama {ollama} · Worker {worker} · {g}"
                            | None -> $"Host OK · Ollama {ollama} · Worker {worker}"
                        )
                    ])
                |> Option.defaultValue (Html.span [ prop.className "shrink-0"; prop.text "Host —" ])
                gpuJob
                |> Option.map (fun text ->
                    Html.span [
                        prop.className "truncate text-amber-400/90"
                        prop.title text
                        prop.text text
                    ])
                |> Option.defaultValue Html.none
            ]
        ]

    let navButton (label: string) tab current dispatch =
        Html.button [
            prop.className (
                if tab = current then
                    "px-3 py-2 text-sm font-medium text-accent border-b-2 border-accent"
                else
                    "px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
            )
            prop.text label
            prop.onClick (fun _ -> dispatch (SelectTab tab))
        ]

    let chrome tab activity status content dispatch =
        Html.div [
            prop.className "flex flex-col h-screen"
            prop.children [
                Html.header [
                    prop.className "border-b border-surface-border bg-surface-raised"
                    prop.children [
                        Html.div [
                            prop.className "px-4 flex items-center gap-6"
                            prop.children [
                                Html.span [
                                    prop.className "font-semibold tracking-tight py-3"
                                    prop.text "LMVideoStudio"
                                ]
                                navButton "Projects" Hub tab dispatch
                                navButton "Timeline" Timeline tab dispatch
                                navButton "Settings" Settings tab dispatch
                            ]
                        ]
                    ]
                ]
                Html.div [
                    prop.className "flex flex-1 min-h-0"
                    prop.children [ content; view activity ]
                ]
                statusBar status activity
            ]
        ]
