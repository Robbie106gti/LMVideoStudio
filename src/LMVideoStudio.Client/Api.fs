module LMVideoStudio.Client.Api

open System
open Fable.Core
open Fable.Core.JsInterop
open Thoth.Json
open LMVideoStudio.Domain
open LMVideoStudio.Domain.HostHealthPoll
open LMVideoStudio.Client.ProjectJson
open LMVideoStudio.Client.ErrorReporting

let defaultHostBase = "http://127.0.0.1:17170"

let hostBase () =
    try
        let cfg = Browser.Dom.window?``__LMVS_HOST__`` |> unbox<string option>

        match cfg with
        | Some v when not (System.String.IsNullOrWhiteSpace v) -> v
        | _ -> defaultHostBase
    with _ ->
        defaultHostBase

type ProjectSummaryDto =
    { Id: Guid
      Name: string
      Path: string
      BlockCount: int }

type WorkerDeviceDto =
    { Rocm: bool option
      VramGb: float option
      DeviceName: string option }

type SystemStatusDto =
    { Host: string
      Ollama: bool
      Worker: bool
      WarmupComplete: bool
      Ffmpeg: bool option
      WorkerDevice: WorkerDeviceDto option }

type ModelStatusDto =
    { OllamaReachable: bool
      WorkerReachable: bool
      ManifestPath: string
      ManifestExists: bool }

type JobEventDto =
    { JobId: Guid
      Phase: string
      Step: string
      Message: string
      Status: string
      Timestamp: string
      Hardware: string option
      ElapsedMs: int64 option
      IsColdRun: bool option
      StepIndex: int option
      StepTotal: int option }

let private summaryDecoder =
    Decode.object (fun get ->
        { Id = get.Required.Field "id" Decode.guid
          Name = get.Required.Field "name" Decode.string
          Path = get.Required.Field "path" Decode.string
          BlockCount = get.Required.Field "blockCount" Decode.int })

let private summariesDecoder = Decode.list summaryDecoder

let private jobEventDecoder =
    Decode.object (fun get ->
        { JobId = get.Required.Field "jobId" Decode.guid
          Phase = get.Required.Field "phase" Decode.string
          Step = get.Required.Field "step" Decode.string
          Message = get.Required.Field "message" Decode.string
          Status = get.Required.Field "status" Decode.string
          Timestamp = get.Required.Field "timestamp" Decode.string
          Hardware = get.Optional.Field "hardware" Decode.string
          ElapsedMs = get.Optional.Field "elapsedMs" Decode.int64
          IsColdRun = get.Optional.Field "isColdRun" Decode.bool
          StepIndex = get.Optional.Field "stepIndex" Decode.int
          StepTotal = get.Optional.Field "stepTotal" Decode.int })

[<Import("fetchJson", from="./fetch.js")>]
let private fetchJson: string -> string -> string option -> JS.Promise<int * string> = jsNative

[<Import("importFile", from="./fetch.js")>]
let private importFile: string -> Browser.Types.File -> JS.Promise<int * string> = jsNative

[<Import("subscribeSse", from="./fetch.js")>]
let private subscribeSse: string -> (string -> unit) -> obj = jsNative

let private reportApiFailure (method: string) (path: string) status message =
    logActivity $"{method} {path} -> {status}: {message}"

    if path.Contains("/api/v1/reports") then
        None
    elif status = 0 || status >= 500 then
        Some
            { Source = "api"
              Severity = if status = 0 then "error" else "warning"
              Message = $"{method} {path} failed ({status}): {message}"
              Stack = None
              Context =
                Map.ofList [
                    "method", method
                    "path", path
                    "status", string status
                ] }
    else
        None

let private fetchAsync url method body =
    async {
        try
            let! result = fetchJson url method body |> Async.AwaitPromise
            let status, text = result

            match reportApiFailure method url status text with
            | Some req -> tryCapture req
            | None -> ()

            return result
        with ex ->
            let message = ex.Message

            tryCapture
                { Source = "api"
                  Severity = "error"
                  Message = $"{method} {url} failed: {message}"
                  Stack = Some ex.Message
                  Context = Map.ofList [ "method", method; "url", url ] }

            return (0, message)
    }

let private isHostHealthy () =
    async {
        let! status, text = fetchAsync $"{hostBase()}/health" "GET" None
        return status >= 200 && status < 300 && text.Contains("ok")
    }

/// Poll Host `/health` with exponential backoff before the UI loads projects.
let waitForHostHealth () =
    async {
        let config = defaultConfig
        let mutable attempt = 0
        let mutable result = None

        while attempt < config.MaxAttempts && result.IsNone do
            attempt <- attempt + 1
            let! healthy = isHostHealthy ()

            match evaluateAttempt attempt healthy config with
            | Success -> result <- Some(Ok ())
            | Exhausted -> result <- Some(Error "Host did not become ready within 60 seconds")
            | Retry delayMs -> do! Async.Sleep delayMs

        return
            match result with
            | Some r -> r
            | None -> Error "Host did not become ready within 60 seconds"
    }

let getProjects () =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects" "GET" None

        if status = 0 then
            return Error $"Host request failed: {text}"
        elif status >= 200 && status < 300 then
            match Decode.fromString summariesDecoder text with
            | Ok items -> return Ok items
            | Error err -> return Error err
        else
            return Error text
    }

let createProject (name: string) =
    async {
        let body = Encode.object [ "name", Encode.string name ] |> Encode.toString 0
        let! status, text = fetchAsync $"{hostBase()}/projects" "POST" (Some body)

        if status = 0 then
            return Error $"Host request failed: {text}"
        elif status >= 200 && status < 300 then
            match decodeProject text with
            | Ok project -> return Ok project
            | Error err -> return Error err
        else
            return Error text
    }

let getProject (projectId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}" "GET" None

        if status >= 200 && status < 300 then
            match decodeProject text with
            | Ok project -> return Ok project
            | Error err -> return Error err
        else
            return Error text
    }

let private extractProjectJsonField (text: string) =
    try
        let doc = JS.JSON.parse text
        Some (doc?projectJson |> unbox<string>)
    with _ ->
        try
            let doc = JS.JSON.parse text
            Some (JS.JSON.stringify (doc?projectJson))
        with _ ->
            None

let private decodeProjectFromResponse text projectId =
    async {
        match extractProjectJsonField text with
        | Some json ->
            match decodeProject json with
            | Ok project -> return Ok project
            | Error _ -> return! getProject projectId
        | None -> return! getProject projectId
    }

let deleteProject (projectId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}" "DELETE" None

        if status = 0 then
            return Error $"Host request failed: {text}"
        elif status = 204 then
            return Ok projectId
        elif status = 404 then
            return Error "Project not found"
        else
            return Error text
    }

let reorderBlocks (projectId: Guid) (blockIds: Guid list) =
    async {
        let ids = blockIds |> List.map Encode.guid |> List.toArray |> Encode.array
        let body = Encode.object [ "blockIds", ids ] |> Encode.toString 0
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/blocks/reorder" "POST" (Some body)

        if status >= 200 && status < 300 then
            match decodeProject text with
            | Ok p -> return Ok p
            | Error err -> return Error err
        else
            return Error text
    }

let importBlockImage (projectId: Guid) (file: Browser.Types.File) =
    async {
        try
            let! status, text =
                importFile $"{hostBase()}/projects/{projectId}/blocks/import" file
                |> Async.AwaitPromise

            if status = 0 then
                return Error $"Host request failed: {text}"
            elif status >= 200 && status < 300 then
                let projectJson =
                    try
                        let doc = JS.JSON.parse text
                        let nested = doc?projectJson |> unbox<string>
                        Some nested
                    with _ ->
                        None

                match projectJson with
                | Some json -> return decodeProject json
                | None -> return! getProject projectId
            else
                return Error text
        with ex ->
            return Error ex.Message
    }

let getSystemStatus () =
    async {
        let! status, text = fetchAsync $"{hostBase()}/system/status" "GET" None

        if status >= 200 && status < 300 then
            let workerDeviceDecoder =
                Decode.object (fun get ->
                    { Rocm = get.Optional.Field "rocm" Decode.bool
                      VramGb = get.Optional.Field "vramGb" Decode.float
                      DeviceName = get.Optional.Field "deviceName" Decode.string })

            let decoder =
                Decode.object (fun get ->
                    { Host = get.Required.Field "host" Decode.string
                      Ollama = get.Required.Field "ollama" Decode.bool
                      Worker = get.Required.Field "worker" Decode.bool
                      WarmupComplete = get.Optional.Field "warmupComplete" Decode.bool |> Option.defaultValue false
                      Ffmpeg = get.Optional.Field "ffmpeg" Decode.bool
                      WorkerDevice = get.Optional.Field "workerDevice" workerDeviceDecoder })

            match Decode.fromString decoder text with
            | Ok dto -> return Ok dto
            | Error err -> return Error err
        else
            return Error text
    }

let runBootstrap () =
    async {
        let! _status, _text = fetchAsync $"{hostBase()}/system/bootstrap" "POST" (Some "")
        return ()
    }

let runConflictScan () =
    async {
        let! _status, _text = fetchAsync $"{hostBase()}/system/conflicts/scan" "POST" (Some "")
        return ()
    }

let runRepair () =
    async {
        let! _status, _text = fetchAsync $"{hostBase()}/system/repair" "POST" (Some "")
        return ()
    }

let generateBlockThumbnail (projectId: Guid) (blockId: Guid) (prompt: string option) (variantCount: int) (referenceStrength: float) (useThumbnailAsReference: bool) =
    async {
        let fields =
            [ "profile", Encode.string "mockup"
              "variantCount", Encode.int variantCount
              "upscale", Encode.bool true
              "referenceStrength", Encode.float referenceStrength
              "useThumbnailAsReference", Encode.bool useThumbnailAsReference ]
            @ (prompt
               |> Option.filter (not << System.String.IsNullOrWhiteSpace)
               |> Option.map (fun p -> [ "prompt", Encode.string p ])
               |> Option.defaultValue [])

        let body = Encode.object fields |> Encode.toString 0 |> Some

        let! status, text =
            fetchAsync $"{hostBase()}/projects/{projectId}/blocks/{blockId}/generate" "POST" body

        if status >= 200 && status < 300 then
            return! decodeProjectFromResponse text projectId
        else
            return Error text
    }

let updateBlock
    (projectId: Guid)
    (blockId: Guid)
    (voiceoverScript: string)
    (imagePrompt: string option)
    (crossfadeDurationMs: int option)
    (moodTags: string list option)
    (directorNotes: string option)
    (shotKind: BlockShotKind option)
    (bakeDurationSec: float option)
    (clearBakeDuration: bool)
    =
    async {
        let transitionFields =
            crossfadeDurationMs
            |> Option.map (fun ms ->
                [ "transitions",
                  Encode.object [
                      "toNext",
                      Encode.object [
                          "type", Encode.string "crossfade"
                          "durationMs", Encode.int ms
                      ]
                  ] ])
            |> Option.defaultValue []

        let moodFields =
            moodTags
            |> Option.map (fun tags ->
                [ "moodTags", tags |> List.map Encode.string |> List.toArray |> Encode.array ])
            |> Option.defaultValue []

        let directorFields =
            directorNotes
            |> Option.map (fun n -> [ "directorNotes", Encode.string n ])
            |> Option.defaultValue []

        let shotKindFields =
            shotKind
            |> Option.map (fun k -> [ "shotKind", Encode.string (BlockShotKind.toSchemaValue k) ])
            |> Option.defaultValue []

        let bakeDurationFields =
            match bakeDurationSec with
            | Some d -> [ "bakeDurationSec", Encode.float d ]
            | None -> []

        let clearBakeFields =
            if clearBakeDuration then [ "clearBakeDurationSec", Encode.bool true ] else []

        let fields =
            [ "voiceoverScript", Encode.string voiceoverScript ]
            @ (imagePrompt
               |> Option.map (fun p -> [ "imagePrompt", Encode.string p ])
               |> Option.defaultValue [])
            @ transitionFields
            @ moodFields
            @ directorFields
            @ shotKindFields
            @ bakeDurationFields
            @ clearBakeFields

        let body = Encode.object fields |> Encode.toString 0
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/blocks/{blockId}" "PATCH" (Some body)

        if status >= 200 && status < 300 then
            return decodeProject text
        else
            return Error text
    }

let private importBlockAssetResponse projectId status text =
    async {
        if status = 0 then
            return Error $"Host request failed: {text}"
        elif status >= 200 && status < 300 then
            let projectJson =
                try
                    let doc = JS.JSON.parse text
                    let nested = doc?projectJson |> unbox<string>
                    Some nested
                with _ ->
                    None

            match projectJson with
            | Some json -> return decodeProject json
            | None -> return! getProject projectId
        else
            return Error text
    }

let importBlockReferenceImage (projectId: Guid) (blockId: Guid) (file: Browser.Types.File) =
    async {
        try
            let! status, text =
                importFile $"{hostBase()}/projects/{projectId}/blocks/{blockId}/reference-image/import" file
                |> Async.AwaitPromise

            return! importBlockAssetResponse projectId status text
        with ex ->
            return Error ex.Message
    }

let useBlockThumbnailAsReference (projectId: Guid) (blockId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/blocks/{blockId}/reference-image/use-thumbnail" "POST" (Some "")

        return! importBlockAssetResponse projectId status text
    }

let clearBlockReferenceImage (projectId: Guid) (blockId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/blocks/{blockId}/reference-image" "DELETE" None

        return! importBlockAssetResponse projectId status text
    }

let importBlockAudio (projectId: Guid) (blockId: Guid) (file: Browser.Types.File) =
    async {
        try
            let! status, text =
                importFile $"{hostBase()}/projects/{projectId}/blocks/{blockId}/audio/import" file
                |> Async.AwaitPromise

            if status = 0 then
                return Error $"Host request failed: {text}"
            elif status >= 200 && status < 300 then
                let projectJson =
                    try
                        let doc = JS.JSON.parse text
                        let nested = doc?projectJson |> unbox<string>
                        Some nested
                    with _ ->
                        None

                match projectJson with
                | Some json -> return decodeProject json
                | None -> return! getProject projectId
            else
                return Error text
        with ex ->
            return Error ex.Message
    }

type PreviewStartDto =
    { JobId: Guid
      PreviewPath: string
      EventsUrl: string }

type PreviewStatusDto =
    { PreviewPath: string
      MediaUrl: string }

let private previewStartDecoder =
    Decode.object (fun get ->
        { JobId = get.Required.Field "jobId" Decode.guid
          PreviewPath = get.Required.Field "previewPath" Decode.string
          EventsUrl = get.Required.Field "eventsUrl" Decode.string })

let private previewStatusDecoder =
    Decode.object (fun get ->
        { PreviewPath = get.Required.Field "previewPath" Decode.string
          MediaUrl = get.Required.Field "mediaUrl" Decode.string })

let refreshMockupPreview (projectId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/preview" "POST" (Some "")

        if status >= 200 && status < 300 then
            match Decode.fromString previewStartDecoder text with
            | Ok dto -> return Ok dto
            | Error err -> return Error err
        else
            return Error text
    }

let getMockupPreviewStatus (projectId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/preview" "GET" None

        if status >= 200 && status < 300 then
            let ready =
                try
                    let doc = JS.JSON.parse text
                    let raw = doc?ready
                    if isNull raw then true else unbox<bool> raw
                with _ ->
                    true

            if not ready then
                return Ok None
            else
                match Decode.fromString previewStatusDecoder text with
                | Ok dto -> return Ok(Some dto)
                | Error err -> return Error err
        elif status = 404 then
            return Ok None
        else
            return Error text
    }

let previewMediaUrl (projectId: Guid) (relativePath: string) (cacheBust: int64) =
    let path = relativePath.TrimStart('/').Replace("\\", "/")
    $"{hostBase()}/projects/{projectId}/media/{path}?v={cacheBust}"

let startBake (projectId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/bake" "POST" (Some "")

        if status >= 200 && status < 300 then
            try
                let doc = JS.JSON.parse text
                let jobId = doc?jobId |> unbox<string>
                return Ok jobId
            with ex ->
                return Error ex.Message
        else
            return Error text
    }

type OutlineBlockDto =
    { Title: string
      VoiceoverScript: string
      ImagePrompt: string }

let private outlineBlockDecoder =
    Decode.object (fun get ->
        { Title = get.Required.Field "title" Decode.string
          VoiceoverScript = get.Required.Field "voiceoverScript" Decode.string
          ImagePrompt = get.Required.Field "imagePrompt" Decode.string })

let generateOutline (projectId: Guid) (brief: string) =
    async {
        let body = Encode.object [ "brief", Encode.string brief ] |> Encode.toString 0
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/outline/generate" "POST" (Some body)

        if status >= 200 && status < 300 then
            let decoder =
                Decode.object (fun get -> get.Required.Field "blocks" (Decode.list outlineBlockDecoder))

            match Decode.fromString decoder text with
            | Ok blocks -> return Ok blocks
            | Error err -> return Error err
        else
            return Error text
    }

let applyOutline (projectId: Guid) (brief: string) (blocks: OutlineBlockDto list) =
    async {
        let blockEnc =
            blocks
            |> List.map (fun b ->
                Encode.object [
                    "title", Encode.string b.Title
                    "voiceoverScript", Encode.string b.VoiceoverScript
                    "imagePrompt", Encode.string b.ImagePrompt
                ])
            |> List.toArray
            |> Encode.array

        let body =
            Encode.object [ "brief", Encode.string brief; "blocks", blockEnc ]
            |> Encode.toString 0

        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/outline/apply" "POST" (Some body)

        if status >= 200 && status < 300 then
            return decodeProject text
        else
            return Error text
    }

let importStylePackLogo (projectId: Guid) (file: Browser.Types.File) =
    async {
        try
            let! status, text =
                importFile $"{hostBase()}/projects/{projectId}/style-pack/import" file
                |> Async.AwaitPromise

            if status >= 200 && status < 300 then
                let projectJson =
                    try
                        let doc = JS.JSON.parse text
                        let nested = doc?projectJson |> unbox<string>
                        Some nested
                    with _ ->
                        None

                match projectJson with
                | Some json -> return decodeProject json
                | None -> return! getProject projectId
            else
                return Error text
        with ex ->
            return Error ex.Message
    }

let exportPremiereXmlUrl (projectId: Guid) =
    $"{hostBase()}/projects/{projectId}/export/premiere"

let getModelStatus () =
    async {
        let! status, text = fetchAsync $"{hostBase()}/models/status" "GET" None

        if status >= 200 && status < 300 then
            let decoder =
                Decode.object (fun get ->
                    { OllamaReachable = get.Required.Field "ollamaReachable" Decode.bool
                      WorkerReachable = get.Required.Field "workerReachable" Decode.bool
                      ManifestPath = get.Required.Field "manifestPath" Decode.string
                      ManifestExists = get.Required.Field "manifestExists" Decode.bool })

            match Decode.fromString decoder text with
            | Ok dto -> return Ok dto
            | Error err -> return Error err
        else
            return Error text
    }

let syncModels (pull: bool) =
    async {
        let body = if pull then Some "{\"pull\":true}" else Some ""
        let! status, text = fetchAsync $"{hostBase()}/models/sync" "POST" body

        if status >= 200 && status < 300 then
            return Ok text
        else
            return Error text
    }

let selectBlockThumbnail (projectId: Guid) (blockId: Guid) (thumbnailPath: string) =
    async {
        let body =
            Encode.object [ "thumbnailPath", Encode.string thumbnailPath ]
            |> Encode.toString 0

        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/blocks/{blockId}" "PATCH" (Some body)

        if status >= 200 && status < 300 then
            return decodeProject text
        else
            return Error text
    }

let exportSharePack (projectId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/export/share-pack" "POST" (Some "")

        if status >= 200 && status < 300 then
            return Ok text
        else
            return Error text
    }
[<Import("checkForUpdatesTauri", from="./tauriInterop.js")>]
let private checkForUpdatesTauri: unit -> JS.Promise<string> = jsNative

[<Import("checkForUpdatesFallback", from="./tauriInterop.js")>]
let private checkForUpdatesFallback: string -> JS.Promise<string> = jsNative

let checkForUpdates () =
    async {
        try
            let flavor =
                try
                    Browser.Dom.window?``__LMVS_BUILD_FLAVOR__`` |> unbox<string option>
                with _ ->
                    None

            if flavor = Some "microsoft-store" then
                return Ok "Updates are managed by the Microsoft Store"
            else
                let! tauriResult = checkForUpdatesTauri () |> Async.AwaitPromise

                if not (isNull tauriResult) && not (System.String.IsNullOrWhiteSpace tauriResult) then
                    return Ok tauriResult
                else
                    let! fallback = checkForUpdatesFallback "0.1.0" |> Async.AwaitPromise
                    return Ok fallback
        with ex ->
            return Error ex.Message
    }

let subscribeEvents (onEvent: JobEventDto -> unit) =
    subscribeSse $"{hostBase()}/events" (fun data ->
        match Decode.fromString jobEventDecoder data with
        | Ok dto -> onEvent dto
        | Error _ -> ())

let submitErrorReport (json: string) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/api/v1/reports" "POST" (Some json)

        if status >= 200 && status < 300 then
            return Ok text
        elif status = 0 then
            return Error $"Host request failed: {text}"
        else
            return Error text
    }

let flushErrorReports () =
    async {
        let! status, text = fetchAsync $"{hostBase()}/api/v1/reports/flush" "POST" (Some "")

        if status >= 200 && status < 300 then
            return Ok text
        else
            return Error text
    }

[<Import("writeErrorReportTauri", from="./tauriInterop.js")>]
let private writeErrorReportTauri: string -> JS.Promise<string> = jsNative

let submitErrorReportFallback (json: string) =
    async {
        try
            let! path = writeErrorReportTauri json |> Async.AwaitPromise
            return Ok path
        with ex ->
            return Error ex.Message
    }

type ConnectedAccountDto =
    { Provider: string
      Connected: bool
      AccountName: string option
      AccountId: string option
      PageName: string option
      ExpiresAtUtc: string option
      Configured: bool }

type ConnectedAccountsDto =
    { Configured: bool
      Accounts: ConnectedAccountDto list }

type SharePackExportDto =
    { OutputDir: string
      Files: string list
      CaptionPath: string
      CaptionText: string
      ReadmePath: string
      MediaBase: string }

type OAuthStartDto = { AuthorizationUrl: string; State: string; Provider: string }

type SharePackUploadResultDto =
    { Platform: string
      VideoId: string option
      Url: string option
      Message: string }

let private connectedAccountDecoder =
    Decode.object (fun get ->
        { Provider = get.Required.Field "provider" Decode.string
          Connected = get.Required.Field "connected" Decode.bool
          AccountName = get.Optional.Field "accountName" Decode.string
          AccountId = get.Optional.Field "accountId" Decode.string
          PageName = get.Optional.Field "pageName" Decode.string
          ExpiresAtUtc = get.Optional.Field "expiresAtUtc" Decode.string
          Configured = get.Required.Field "configured" Decode.bool })

let private connectedAccountsDecoder =
    Decode.object (fun get ->
        { Configured = get.Required.Field "configured" Decode.bool
          Accounts = get.Required.Field "accounts" (Decode.list connectedAccountDecoder) })

let private sharePackExportDecoder =
    Decode.object (fun get ->
        { OutputDir = get.Required.Field "outputDir" Decode.string
          Files = get.Required.Field "files" (Decode.list Decode.string)
          CaptionPath = get.Required.Field "captionPath" Decode.string
          CaptionText =
            get.Optional.Field "captionText" Decode.string
            |> Option.defaultValue ""
          ReadmePath = get.Required.Field "readmePath" Decode.string
          MediaBase = get.Required.Field "mediaBase" Decode.string })

let private oauthStartDecoder =
    Decode.object (fun get ->
        { AuthorizationUrl = get.Required.Field "authorizationUrl" Decode.string
          State = get.Required.Field "state" Decode.string
          Provider = get.Required.Field "provider" Decode.string })

let private sharePackUploadResultDecoder =
    Decode.object (fun get ->
        { Platform = get.Required.Field "platform" Decode.string
          VideoId = get.Optional.Field "videoId" Decode.string
          Url = get.Optional.Field "url" Decode.string
          Message = get.Required.Field "message" Decode.string })

let getConnectedAccounts () =
    async {
        let! status, text = fetchAsync $"{hostBase()}/settings/connected-accounts" "GET" None

        if status >= 200 && status < 300 then
            match Decode.fromString connectedAccountsDecoder text with
            | Ok dto -> return Ok dto
            | Error err -> return Error err
        else
            return Error text
    }

let startOAuth provider =
    async {
        let! status, text = fetchAsync $"{hostBase()}/oauth/{provider}/start" "GET" None

        if status >= 200 && status < 300 then
            match Decode.fromString oauthStartDecoder text with
            | Ok dto -> return Ok dto
            | Error err -> return Error err
        else
            return Error text
    }

let disconnectOAuth provider =
    async {
        let! status, text = fetchAsync $"{hostBase()}/oauth/{provider}" "DELETE" None

        if status >= 200 && status < 300 then
            return Ok text
        else
            return Error text
    }

let exportSharePackDetailed (projectId: Guid) =
    async {
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/export/share-pack" "POST" (Some "")

        if status >= 200 && status < 300 then
            match Decode.fromString sharePackExportDecoder text with
            | Ok dto -> return Ok dto
            | Error err -> return Error err
        else
            return Error text
    }

let uploadSharePack (projectId: Guid) (platform: string) (title: string option) (description: string option) =
    async {
        let fields =
            [ "platform", Encode.string platform ]
            @ (title |> Option.map (fun t -> [ "title", Encode.string t ]) |> Option.defaultValue [])
            @ (description |> Option.map (fun d -> [ "description", Encode.string d ]) |> Option.defaultValue [])

        let body = Encode.object fields |> Encode.toString 0
        let! status, text = fetchAsync $"{hostBase()}/projects/{projectId}/export/share-pack/upload" "POST" (Some body)

        if status >= 200 && status < 300 then
            match Decode.fromString sharePackUploadResultDecoder text with
            | Ok dto -> return Ok dto
            | Error err -> return Error err
        else
            return Error text
    }
