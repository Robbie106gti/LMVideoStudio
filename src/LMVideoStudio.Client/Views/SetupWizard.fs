module LMVideoStudio.Client.Views.SetupWizard

open Feliz
open Fable.Core.JsInterop

type SetupWizardStep =
    | Welcome
    | Bootstrap
    | Complete

type SetupWizardMsg =
    | Next
    | Back
    | RunBootstrap
    | Finish

type SetupWizardModel =
    { Step: SetupWizardStep
      Message: string option }

module SetupWizard =
    let private wizardDoneKey = "lmvs_setup_wizard_done"

    let isComplete () =
        try
            Browser.Dom.window.localStorage.getItem wizardDoneKey = "1"
        with _ ->
            false

    let markComplete () =
        try
            Browser.Dom.window.localStorage.setItem(wizardDoneKey, "1")
        with _ ->
            ()

    let init () =
        { Step = Welcome
          Message = None }

    let view (model: SetupWizardModel) dispatch =
        Html.div [
            prop.className "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            prop.children [
                Html.div [
                    prop.className "w-full max-w-lg rounded-xl border border-surface-border bg-surface-raised shadow-xl"
                    prop.children [
                        Html.div [
                            prop.className "px-6 py-4 border-b border-surface-border"
                            prop.children [
                                Html.h2 [
                                    prop.className "text-lg font-semibold"
                                    prop.text "Welcome to LMVideoStudio"
                                ]
                                Html.p [
                                    prop.className "text-sm text-slate-400 mt-1"
                                    prop.text "First-run setup — verify local AI stack before editing projects."
                                ]
                            ]
                        ]
                        Html.div [
                            prop.className "px-6 py-5 space-y-4 text-sm"
                            prop.children [
                                match model.Step with
                                | Welcome ->
                                    Html.p [
                                        prop.text "This wizard runs bootstrap checks for Host, Ollama, Python worker, FFmpeg, and the model catalog. You can re-run bootstrap anytime from Settings."
                                    ]
                                | Bootstrap ->
                                    Html.p [
                                        prop.text "Click Continue to open Settings and run bootstrap. Sidecars start automatically in the Tauri desktop app."
                                    ]
                                | Complete ->
                                    Html.p [
                                        prop.text "Setup marked complete. Import images on the timeline, generate thumbnail variants, and refresh your mockup preview."
                                    ]
                                model.Message
                                |> Option.map (fun m ->
                                    Html.p [ prop.className "text-accent text-xs"; prop.text m ])
                                |> Option.defaultValue Html.none
                            ]
                        ]
                        Html.div [
                            prop.className "px-6 py-4 border-t border-surface-border flex justify-between gap-2"
                            prop.children [
                                Html.button [
                                    prop.className "px-3 py-2 rounded-md border border-surface-border text-sm disabled:opacity-40"
                                    prop.disabled (model.Step = Welcome)
                                    prop.text "Back"
                                    prop.onClick (fun _ -> dispatch Back)
                                ]
                                Html.div [
                                    prop.className "flex gap-2"
                                    prop.children [
                                        if model.Step = Bootstrap then
                                            Html.button [
                                                prop.className "px-3 py-2 rounded-md border border-accent text-accent text-sm"
                                                prop.text "Run bootstrap"
                                                prop.onClick (fun _ -> dispatch RunBootstrap)
                                            ]
                                        Html.button [
                                            prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium"
                                            prop.text (
                                                match model.Step with
                                                | Complete -> "Get started"
                                                | _ -> "Continue"
                                            )
                                            prop.onClick (fun _ ->
                                                match model.Step with
                                                | Complete -> dispatch Finish
                                                | _ -> dispatch Next)
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]

    let next model =
        match model.Step with
        | Welcome -> { model with Step = Bootstrap }
        | Bootstrap -> { model with Step = Complete }
        | Complete -> model

    let back model =
        match model.Step with
        | Welcome -> model
        | Bootstrap -> { model with Step = Welcome }
        | Complete -> { model with Step = Bootstrap }
