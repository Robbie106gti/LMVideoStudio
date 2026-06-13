namespace LMVideoStudio.Domain

open System
open System.Text.RegularExpressions
open Thoth.Json.Net

/// Local-first error report shape shared by Client, Host, and tests.
module ErrorReport =
    type SystemSnapshot =
        { Os: string
          AppVersion: string
          HostHealthy: bool option
          OllamaReachable: bool option
          WorkerReachable: bool option }

    type ErrorReport =
        { Id: Guid
          Timestamp: DateTimeOffset
          Source: string
          Severity: string
          Message: string
          Stack: string option
          Context: Map<string, string>
          System: SystemSnapshot option
          ActivityTail: string list
          UserConsented: bool }

    let appVersion = "0.1.0"

    let private maxFieldLength = 4000
    let private maxActivityLines = 20

    let private secretPatterns =
        [| Regex(@"api[_-]?key\s*[:=]\s*\S+", RegexOptions.IgnoreCase)
           Regex(@"bearer\s+\S+", RegexOptions.IgnoreCase)
           Regex(@"authorization\s*[:=]\s*\S+", RegexOptions.IgnoreCase)
           Regex(@"password\s*[:=]\s*\S+", RegexOptions.IgnoreCase)
           Regex(@"secret\s*[:=]\s*\S+", RegexOptions.IgnoreCase)
           Regex(@"token\s*[:=]\s*\S+", RegexOptions.IgnoreCase) |]

    let private projectPathPattern =
        Regex(@"(projects[/\\][^/\\]+[/\\].+)", RegexOptions.IgnoreCase)

    let truncate (maxLen: int) (value: string) =
        if String.IsNullOrEmpty value then
            value
        elif value.Length <= maxLen then
            value
        else
            value.Substring(0, maxLen) + "…"

    let redactSecrets (text: string) =
        if String.IsNullOrEmpty text then
            text
        else
            secretPatterns
            |> Array.fold (fun acc pattern -> pattern.Replace(acc, "[redacted]")) text

    let redactProjectPaths (text: string) =
        if String.IsNullOrEmpty text then
            text
        else
            projectPathPattern.Replace(text, "[project-path]")

    let sanitizeText (text: string) =
        text |> redactSecrets |> redactProjectPaths |> truncate maxFieldLength

    let sanitizeContext (ctx: Map<string, string>) =
        ctx
        |> Map.map (fun _ v -> sanitizeText v)
        |> Map.filter (fun k _ ->
            let key = k.ToLowerInvariant()

            not (
                key.Contains "apikey"
                || key.Contains "api_key"
                || key.Contains "password"
                || key.Contains "secret"
                || key.Contains "token"
                || key.Contains "authorization"
                || key.Contains "projectjson"
                || key.Contains "project_json"
            ))

    let sanitize (report: ErrorReport) =
        { report with
            Message = sanitizeText report.Message
            Stack = report.Stack |> Option.map sanitizeText
            Context = sanitizeContext report.Context
            ActivityTail =
                report.ActivityTail
                |> List.map sanitizeText
                |> List.truncate maxActivityLines }

    let validate (report: ErrorReport) =
        if String.IsNullOrWhiteSpace report.Message then
            Error "message is required"
        elif report.Message.Length > maxFieldLength then
            Error "message too long"
        elif
            report.Stack
            |> Option.map (fun s -> s.Length > maxFieldLength)
            |> Option.defaultValue false
        then
            Error "stack too long"
        elif List.length report.ActivityTail > maxActivityLines then
            Error "activity tail too long"
        else
            Ok report

    let create
        source
        severity
        message
        stack
        context
        systemSnapshot
        activityTail
        userConsented
        =
        let report =
            { Id = Guid.NewGuid()
              Timestamp = DateTimeOffset.UtcNow
              Source = source
              Severity = severity
              Message = message
              Stack = stack
              Context = defaultArg context Map.empty
              System = systemSnapshot
              ActivityTail = defaultArg activityTail []
              UserConsented = userConsented }

        report |> sanitize |> validate

    let private encodeSystemSnapshot (s: SystemSnapshot) =
        Encode.object [
            "os", Encode.string s.Os
            "appVersion", Encode.string s.AppVersion
            if s.HostHealthy.IsSome then
                "hostHealthy", Encode.bool s.HostHealthy.Value
            if s.OllamaReachable.IsSome then
                "ollamaReachable", Encode.bool s.OllamaReachable.Value
            if s.WorkerReachable.IsSome then
                "workerReachable", Encode.bool s.WorkerReachable.Value
        ]

    let private systemSnapshotDecoder =
        Decode.object (fun get ->
            { Os = get.Required.Field "os" Decode.string
              AppVersion = get.Required.Field "appVersion" Decode.string
              HostHealthy = get.Optional.Field "hostHealthy" Decode.bool
              OllamaReachable = get.Optional.Field "ollamaReachable" Decode.bool
              WorkerReachable = get.Optional.Field "workerReachable" Decode.bool })

    let encode (report: ErrorReport) =
        Encode.object [
            "id", Encode.guid report.Id
            "timestamp", Encode.string (report.Timestamp.ToString("o"))
            "source", Encode.string report.Source
            "severity", Encode.string report.Severity
            "message", Encode.string report.Message
            if report.Stack.IsSome then
                "stack", Encode.string report.Stack.Value
            if not (Map.isEmpty report.Context) then
                "context",
                (report.Context
                 |> Map.toList
                 |> List.map (fun (k, v) -> k, Encode.string v)
                 |> Encode.object)
            if report.System.IsSome then
                "system", encodeSystemSnapshot report.System.Value
            if not (List.isEmpty report.ActivityTail) then
                "activityTail",
                (report.ActivityTail
                 |> List.map Encode.string
                 |> List.toArray
                 |> Encode.array)
            "userConsented", Encode.bool report.UserConsented
        ]

    let decode =
        Decode.object (fun get ->
            let context =
                get.Optional.Field "context" (Decode.dict Decode.string)
                |> Option.defaultValue Map.empty

            { Id = get.Required.Field "id" Decode.guid
              Timestamp =
                get.Required.Field "timestamp" Decode.string
                |> fun s ->
                    match DateTimeOffset.TryParse s with
                    | true, dto -> dto
                    | _ -> DateTimeOffset.UtcNow
              Source = get.Required.Field "source" Decode.string
              Severity = get.Required.Field "severity" Decode.string
              Message = get.Required.Field "message" Decode.string
              Stack = get.Optional.Field "stack" Decode.string
              Context = context
              System = get.Optional.Field "system" systemSnapshotDecoder
              ActivityTail =
                get.Optional.Field "activityTail" (Decode.list Decode.string)
                |> Option.defaultValue []
              UserConsented =
                get.Optional.Field "userConsented" Decode.bool
                |> Option.defaultValue false })

    let encodeToString report = encode report |> Encode.toString 0

    let decodeFromString json =
        Decode.fromString decode json |> Result.mapError (fun e -> e.ToString())
