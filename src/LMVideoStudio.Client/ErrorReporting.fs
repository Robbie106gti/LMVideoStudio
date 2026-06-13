module LMVideoStudio.Client.ErrorReporting

open System
open Fable.Core
open Fable.Core.JsInterop
open Fable.Core.JS.Constructors
open Thoth.Json
open LMVideoStudio.Domain.ErrorReport

type LastErrorSummary =
    { Message: string
      Source: string
      Severity: string
      Timestamp: DateTimeOffset }

type CaptureRequest =
    { Source: string
      Severity: string
      Message: string
      Stack: string option
      Context: Map<string, string> }

[<Import("readErrorReportingConsent", from="./errorReporting.js")>]
let private readErrorReportingConsent: unit -> bool = jsNative

[<Import("writeErrorReportingConsent", from="./errorReporting.js")>]
let private writeErrorReportingConsent: bool -> unit = jsNative

[<Import("appendActivityLine", from="./errorReporting.js")>]
let private appendActivityLine: string -> unit = jsNative

[<Import("getActivityTail", from="./errorReporting.js")>]
let private getActivityTail: unit -> string array = jsNative

[<Import("installErrorHooks", from="./errorReporting.js")>]
let private installErrorHooks: (obj -> unit) -> unit = jsNative

[<Import("detectOs", from="./errorReporting.js")>]
let private detectOs: unit -> string = jsNative

let consentKey = "lmvs_error_reporting_consent"

let readConsent () = readErrorReportingConsent ()

let setConsent enabled = writeErrorReportingConsent enabled

let logActivity line = appendActivityLine line

let private systemSnapshot hostHealthy ollamaReachable workerReachable =
    { Os = detectOs ()
      AppVersion = appVersion
      HostHealthy = hostHealthy
      OllamaReachable = ollamaReachable
      WorkerReachable = workerReachable }

let private toSummary (report: ErrorReport) =
    { Message = report.Message
      Source = report.Source
      Severity = report.Severity
      Timestamp = report.Timestamp }

let buildReport
    (req: CaptureRequest)
    hostHealthy
    ollamaReachable
    workerReachable
    userConsented
    =
    create
        req.Source
        req.Severity
        req.Message
        req.Stack
        (Some req.Context)
        (Some(systemSnapshot hostHealthy ollamaReachable workerReachable))
        (Some(getActivityTail () |> Array.toList))
        userConsented

let installHooks onCaptured =
    installErrorHooks (fun raw ->
        let message =
            try
                raw?message |> unbox<string>
            with _ ->
                "Unknown error"

        let stack =
            try
                let s = raw?stack

                if isNull s then
                    None
                else
                    Some(unbox<string> s)
            with _ ->
                None

        let source =
            try
                raw?source |> unbox<string>
            with _ ->
                "client"

        let severity =
            try
                raw?severity |> unbox<string>
            with _ ->
                "error"

        let context =
            try
                let ctx = raw?context

                if isNull ctx then
                    Map.empty
                else
                    ctx
                    |> Object.keys
                    |> Seq.map (fun k -> k, unbox<string> (ctx?(k)))
                    |> Map.ofSeq
            with _ ->
                Map.empty

        onCaptured
            { Source = source
              Severity = severity
              Message = message
              Stack = stack
              Context = context })

let shouldAutoSubmit severity userConsented =
    userConsented || severity = "fatal"

let encodeForSubmit (report: ErrorReport) = encodeToString report

let decodeSummaryFromJson json =
    match decodeFromString json with
    | Ok report -> Ok(toSummary report)
    | Error err -> Error err

let private captureHandler = ref None

let setCaptureHandler handler = captureHandler.Value <- Some handler

let tryCapture (req: CaptureRequest) =
    match captureHandler.Value with
    | Some handler -> handler req
    | None -> ()
