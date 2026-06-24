module LMVideoStudio.Client.PromptQuickButtons

open Fable.Core.JsInterop
open Thoth.Json.Net

type QuickButton =
    { Label: string
      Prompt: string }

let private storageKey = "lmvs_prompt_quick_buttons"

let builtIn =
    [ { Label = "Establishing"; Prompt = "Wide establishing shot, cinematic lighting, shallow depth of field" }
      { Label = "Close-up"; Prompt = "Tight close-up on subject, soft bokeh background, detailed texture" }
      { Label = "Product hero"; Prompt = "Product hero shot on clean surface, studio lighting, brand colors" }
      { Label = "CTA end card"; Prompt = "Bold end-card frame with space for logo and call-to-action text" } ]

let private decodeButton =
    Decode.object (fun get ->
        { Label = get.Required.Field "label" Decode.string
          Prompt = get.Required.Field "prompt" Decode.string })

let private encodeButton (b: QuickButton) =
    Encode.object [ "label", Encode.string b.Label; "prompt", Encode.string b.Prompt ]

let loadCustom () =
    try
        match Browser.Dom.window.localStorage.getItem storageKey with
        | null -> []
        | json when System.String.IsNullOrWhiteSpace json -> []
        | json ->
            match Decode.fromString (Decode.list decodeButton) json with
            | Ok items -> items
            | Error _ -> []
    with _ ->
        []

let saveCustom (buttons: QuickButton list) =
    try
        let json =
            buttons
            |> List.map encodeButton
            |> Encode.list
            |> fun enc -> Encode.toString 0 enc

        Browser.Dom.window.localStorage.setItem(storageKey, json)
    with _ ->
        ()

let loadAll () = builtIn @ loadCustom ()

let addCustom (labelInput: string) (promptInput: string) =
    let label = labelInput.Trim()
    let prompt = promptInput.Trim()

    if System.String.IsNullOrWhiteSpace label || System.String.IsNullOrWhiteSpace prompt then
        loadCustom ()
    else
        let existing = loadCustom ()

        let withoutDup =
            existing |> List.filter (fun b -> b.Label.ToLowerInvariant() <> label.ToLowerInvariant())

        let updated = { Label = label; Prompt = prompt } :: withoutDup
        saveCustom updated
        updated

let removeCustom (labelInput: string) =
    let labelLower = labelInput.Trim().ToLowerInvariant()

    loadCustom ()
    |> List.filter (fun b -> b.Label.ToLowerInvariant() <> labelLower)
    |> fun updated ->
        saveCustom updated
        updated
