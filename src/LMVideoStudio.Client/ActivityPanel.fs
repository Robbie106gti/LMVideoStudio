module LMVideoStudio.Client.ActivityPanel

open Feliz
open LMVideoStudio.Client.Api

type ActivityPanelState =
    { Events: JobEventDto list
      Connected: bool }

let private maxEvents = 30

let private isActiveStatus status =
    status = "running" || status = "pending"

let private isTerminalStatus status =
    status = "completed" || status = "failed" || status = "cancelled"

let private eventKey (e: JobEventDto) = e.JobId, e.Phase, e.Step

/// Merge an incoming SSE event into the activity feed, replacing stale running
/// entries for the same job phase and upserting by job + phase + step.
let mergeEvent (incoming: JobEventDto) (events: JobEventDto list) : JobEventDto list =
    let withoutStaleRunning =
        events
        |> List.filter (fun e ->
            not (
                e.JobId = incoming.JobId
                && e.Phase = incoming.Phase
                && isActiveStatus e.Status
                && (isTerminalStatus incoming.Status
                    || (isActiveStatus incoming.Status && e.Step <> incoming.Step))
            ))

    let merged =
        match withoutStaleRunning |> List.tryFindIndex (fun e -> eventKey e = eventKey incoming) with
        | Some index ->
            withoutStaleRunning
            |> List.mapi (fun i e -> if i = index then incoming else e)
        | None -> incoming :: withoutStaleRunning

    merged |> List.truncate maxEvents

let init () =
    { Events = []
      Connected = false }

let private titleCaseWords (s: string) =
    s.Split(' ')
    |> Array.map (fun w ->
        if w.Length = 0 then w
        else w.Substring(0, 1).ToUpperInvariant() + w.Substring(1).ToLowerInvariant())
    |> String.concat " "

let private formatPhase phase =
    match phase with
    | "mockup_preview" -> "Mockup preview (CPU FFmpeg)"
    | "image_generate" -> "Image generate (GPU worker)"
    | "model_sync" -> "Model sync"
    | "bootstrap" -> "Bootstrap"
    | "bake" -> "Bake"
    | other -> other.Replace('_', ' ') |> titleCaseWords

let private statusClass status =
    match status with
    | "completed" -> "text-emerald-400"
    | "failed" -> "text-red-400"
    | "cancelled" -> "text-slate-500"
    | "running"
    | "pending" -> "text-amber-400"
    | _ -> "text-slate-400"

let private statusLabel status =
    match status with
    | "running" -> "running"
    | "pending" -> "pending"
    | "completed" -> "done"
    | "failed" -> "failed"
    | "cancelled" -> "cancelled"
    | other -> other

let view (state: ActivityPanelState) =
    Html.aside [
        prop.className "w-72 border-l border-surface-border bg-surface-raised flex flex-col"
        prop.children [
            Html.div [
                prop.className "px-4 py-3 border-b border-surface-border font-semibold text-sm uppercase tracking-wide text-slate-400"
                prop.text "Activity"
            ]
            Html.div [
                prop.className "px-4 py-2 text-xs text-slate-500 border-b border-surface-border"
                prop.text (
                    if state.Connected then "Listening to Host events (SSE)" else "Connecting to event stream…"
                )
            ]
            if List.isEmpty state.Events then
                Html.p [
                    prop.className "px-4 py-3 text-sm text-slate-500"
                    prop.text "No recent activity."
                ]
            else
                Html.ul [
                    prop.className "flex-1 overflow-y-auto p-3 space-y-2 text-sm"
                    prop.children (
                        state.Events
                        |> List.truncate 20
                        |> List.map (fun e ->
                            Html.li [
                                prop.className "rounded-md bg-surface p-2 border border-surface-border"
                                prop.children [
                                    Html.div [
                                        prop.className "text-xs mb-1 flex items-center justify-between gap-2"
                                        prop.children [
                                            Html.span [
                                                prop.className "text-slate-500 truncate"
                                                prop.text (formatPhase e.Phase)
                                            ]
                                            Html.span [
                                                prop.className $"{statusClass e.Status} shrink-0"
                                                prop.text (statusLabel e.Status)
                                            ]
                                        ]
                                    ]
                                    Html.div [ prop.text e.Message ]
                                ]
                            ])
                    )
                ]
        ]
    ]
