module LMVideoStudio.Client.Views.SharePackPanel

open Feliz
open Fable.Core.JsInterop
open LMVideoStudio.Client.Api

type SharePackModel =
    { OutputDir: string
      Files: string list
      CaptionPath: string
      CaptionText: string
      ReadmePath: string
      MediaBase: string
      Uploading: string option
      UploadMessage: string option
      ConnectedAccounts: ConnectedAccountsDto option }

type SharePackMsg =
    | CopyCaption
    | OpenYouTubeUpload
    | OpenMetaUpload
    | UploadToYouTube
    | UploadToMeta
    | Dismiss

module SharePackPanel =
    let fromExport (dto: SharePackExportDto) (accounts: ConnectedAccountsDto option) =
        { OutputDir = dto.OutputDir
          Files = dto.Files
          CaptionPath = dto.CaptionPath
          CaptionText = dto.CaptionText
          ReadmePath = dto.ReadmePath
          MediaBase = dto.MediaBase
          Uploading = None
          UploadMessage = None
          ConnectedAccounts = accounts }

    let private isConnected (accounts: ConnectedAccountsDto option) provider =
        accounts
        |> Option.bind (fun a -> a.Accounts |> List.tryFind (fun x -> x.Provider = provider))
        |> Option.map (fun a -> a.Connected && a.Configured)
        |> Option.defaultValue false

    let private isConfigured (accounts: ConnectedAccountsDto option) =
        accounts |> Option.map (fun a -> a.Configured) |> Option.defaultValue false

    let private copyToClipboard (text: string) =
        try
            Browser.Navigator.clipboard.writeText(text) |> ignore
            Ok "Caption copied to clipboard"
        with ex ->
            Error ex.Message

    let private openUrl (url: string) =
        Browser.Dom.window.open(url, "_blank") |> ignore

    let view (model: SharePackModel) dispatch =
        let youtubeConnected = isConnected model.ConnectedAccounts "youtube"
        let metaConnected = isConnected model.ConnectedAccounts "meta"
        let oauthConfigured = isConfigured model.ConnectedAccounts

        Html.div [
            prop.className "mx-6 mb-4 rounded-lg border border-accent/40 bg-surface-raised p-4 space-y-3"
            prop.children [
                Html.div [
                    prop.className "flex items-start justify-between gap-4"
                    prop.children [
                        Html.div [
                            Html.h2 [
                                prop.className "text-sm font-semibold text-slate-200"
                                prop.text "Share Pack ready"
                            ]
                            Html.p [
                                prop.className "text-xs text-slate-500 mt-1"
                                prop.text $"Exported to {model.OutputDir} — YouTube 16:9 and Reels 9:16 presets."
                            ]
                        ]
                        Html.button [
                            prop.className "text-xs text-slate-500 hover:text-slate-300"
                            prop.text "Dismiss"
                            prop.onClick (fun _ -> dispatch Dismiss)
                        ]
                    ]
                ]
                Html.div [
                    prop.className "flex flex-wrap gap-2 text-xs text-slate-400"
                    prop.children (
                        model.Files
                        |> List.map (fun f ->
                            Html.span [
                                prop.className "px-2 py-1 rounded border border-surface-border"
                                prop.text f
                            ])
                    )
                ]
                Html.div [
                    prop.className "rounded-md bg-surface border border-surface-border p-3 text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto"
                    prop.text (
                        if System.String.IsNullOrWhiteSpace model.CaptionText then
                            "(No caption — edit caption.txt in the export folder)"
                        else
                            model.CaptionText
                    )
                ]
                Html.div [
                    prop.className "flex flex-wrap gap-2"
                    prop.children [
                        Html.button [
                            prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent"
                            prop.text "Copy caption"
                            prop.onClick (fun _ -> dispatch CopyCaption)
                        ]
                        Html.button [
                            prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent"
                            prop.text "Open YouTube upload"
                            prop.onClick (fun _ -> dispatch OpenYouTubeUpload)
                        ]
                        Html.button [
                            prop.className "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent"
                            prop.text "Open Meta Business Suite"
                            prop.onClick (fun _ -> dispatch OpenMetaUpload)
                        ]
                        Html.button [
                            prop.className "px-3 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm disabled:opacity-50"
                            prop.disabled (not youtubeConnected || model.Uploading.IsSome)
                            prop.title (
                                if not oauthConfigured then
                                    "Configure OAuth in config/social-oauth.json and connect in Settings"
                                elif not youtubeConnected then
                                    "Connect YouTube in Settings"
                                else
                                    "Upload youtube_16x9.mp4 via YouTube Data API"
                            )
                            prop.text (
                                if model.Uploading = Some "youtube" then "Uploading to YouTube…"
                                else "Upload to YouTube"
                            )
                            prop.onClick (fun _ -> dispatch UploadToYouTube)
                        ]
                        Html.button [
                            prop.className "px-3 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm disabled:opacity-50"
                            prop.disabled (not metaConnected || model.Uploading.IsSome)
                            prop.title (
                                if not oauthConfigured then
                                    "Configure OAuth in config/social-oauth.json and connect in Settings"
                                elif not metaConnected then
                                    "Connect Meta in Settings"
                                else
                                    "Upload reels_9x16.mp4 to connected Facebook Page"
                            )
                            prop.text (
                                if model.Uploading = Some "meta" then "Uploading to Meta…"
                                else "Upload to Meta"
                            )
                            prop.onClick (fun _ -> dispatch UploadToMeta)
                        ]
                    ]
                ]
                if not oauthConfigured then
                    Html.p [
                        prop.className "text-xs text-amber-400/90"
                        prop.text "OAuth direct upload is optional. Copy caption and use Open upload, or configure config/social-oauth.json and connect accounts in Settings."
                    ]
                elif not youtubeConnected && not metaConnected then
                    Html.p [
                        prop.className "text-xs text-amber-400/90"
                        prop.text "OAuth is configured but no accounts connected — use Settings → Social upload to connect YouTube or Meta."
                    ]
                else
                    Html.none
                model.UploadMessage
                |> Option.map (fun msg ->
                    Html.p [ prop.className "text-xs text-slate-400"; prop.text msg ])
                |> Option.defaultValue Html.none
            ]
        ]

    let handleCopyCaption model =
        copyToClipboard model.CaptionText

    let handleOpenYouTube () =
        openUrl "https://studio.youtube.com/channel/UC/videos/upload?d=ud"

    let handleOpenMeta () =
        openUrl "https://business.facebook.com/latest/composer"
