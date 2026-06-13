namespace LMVideoStudio.Host

open System
open System.IO
open System.Net.Http
open System.Text
open System.Text.Json
open LMVideoStudio.Domain

module ErrorReporting =
    type WebhookFormat =
        | Generic
        | Discord
        | GitHubIssue

    type ErrorReportingConfig =
        { Enabled: bool
          WebhookUrl: string option
          WebhookFormat: WebhookFormat
          AutoUpload: bool
          DefaultUserConsent: bool }

    type SubmitResult =
        { ReportId: Guid
          StoredPath: string
          Uploaded: bool
          Queued: bool }

    let private defaultConfig =
        { Enabled = true
          WebhookUrl = None
          WebhookFormat = Generic
          AutoUpload = true
          DefaultUserConsent = false }

    let private parseWebhookFormat value =
        match value with
        | "discord" -> Discord
        | "github_issue" -> GitHubIssue
        | _ -> Generic

    let loadConfig (repoRoot: string) =
        let path = Path.Combine(repoRoot, "config", "error-reporting.json")

        if not (File.Exists path) then
            defaultConfig
        else
            try
                let json = File.ReadAllText path
                let doc = JsonDocument.Parse json
                let root = doc.RootElement

                let webhookUrl =
                    if root.TryGetProperty("webhookUrl") |> fst then
                        let v = root.GetProperty("webhookUrl").GetString()

                        if String.IsNullOrWhiteSpace v then
                            None
                        else
                            Some v
                    else
                        None

                let format =
                    if root.TryGetProperty("webhookFormat") |> fst then
                        root.GetProperty("webhookFormat").GetString() |> parseWebhookFormat
                    else
                        Generic

                { Enabled =
                    if root.TryGetProperty("enabled") |> fst then
                        root.GetProperty("enabled").GetBoolean()
                    else
                        true
                  WebhookUrl = webhookUrl
                  WebhookFormat = format
                  AutoUpload =
                    if root.TryGetProperty("autoUpload") |> fst then
                        root.GetProperty("autoUpload").GetBoolean()
                    else
                        true
                  DefaultUserConsent =
                    if root.TryGetProperty("defaultUserConsent") |> fst then
                        root.GetProperty("defaultUserConsent").GetBoolean()
                    else
                        false }
            with _ ->
                defaultConfig

    type ErrorReportingService(repoRoot: string) =
        let config = lazy (loadConfig repoRoot)
        let http = new HttpClient()

        let reportsRoot =
            let env = Environment.GetEnvironmentVariable("LMVS_REPORTS_ROOT")

            if not (String.IsNullOrWhiteSpace env) then
                env
            else
                Path.Combine(
                    Environment.GetFolderPath Environment.SpecialFolder.LocalApplicationData,
                    "LMVideoStudio",
                    "reports"
                )

        let queueDir = Path.Combine(reportsRoot, "queue")

        member _.ReportsRoot = reportsRoot

        member _.Config = config.Force()

        member this.EnsureDirectories() =
            Directory.CreateDirectory reportsRoot |> ignore
            Directory.CreateDirectory queueDir |> ignore

        member private this.ReportPath (reportId: Guid) =
            Path.Combine(reportsRoot, $"{reportId:N}.json")

        member private this.QueuePath (reportId: Guid) =
            Path.Combine(queueDir, $"{reportId:N}.json")

        member this.Persist(report: ErrorReport.ErrorReport) =
            this.EnsureDirectories()
            let path = this.ReportPath report.Id
            let json = ErrorReport.encodeToString report
            File.WriteAllText(path, json, Encoding.UTF8)
            path

        member private this.BuildWebhookBody (report: ErrorReport.ErrorReport) =
            let cfg = config.Value

            match cfg.WebhookFormat with
            | Discord ->
                let content =
                    $"**LMVideoStudio {report.Severity}** ({report.Source})\n{report.Message}"

                JsonSerializer.Serialize(
                    {| content = ErrorReport.truncate 1800 content |},
                    JsonSerializerOptions(PropertyNamingPolicy = JsonNamingPolicy.CamelCase)
                )
            | GitHubIssue ->
                JsonSerializer.Serialize(
                    {| title = $"[{report.Severity}] {ErrorReport.truncate 120 report.Message}"
                       body =
                        $"""## Error report
- **Id:** {report.Id}
- **Source:** {report.Source}
- **Severity:** {report.Severity}
- **App:** {report.System |> Option.map (fun s -> s.AppVersion) |> Option.defaultValue ErrorReport.appVersion}
- **OS:** {report.System |> Option.map (fun s -> s.Os) |> Option.defaultValue "unknown"}

### Message
```
{report.Message}
```

### Stack
```
{report.Stack |> Option.defaultValue "(none)"}
```""" |},
                    JsonSerializerOptions(PropertyNamingPolicy = JsonNamingPolicy.CamelCase)
                )
            | Generic ->
                ErrorReport.encodeToString report

        member private this.TryUploadReport (report: ErrorReport.ErrorReport) =
            task {
                let cfg = config.Value

                if not cfg.Enabled || not cfg.AutoUpload then
                    return false
                else
                    match cfg.WebhookUrl with
                    | None -> return false
                    | Some url when String.IsNullOrWhiteSpace url -> return false
                    | Some url ->
                        try
                            let body = this.BuildWebhookBody report
                            use content = new StringContent(body, Encoding.UTF8, "application/json")
                            let! resp = http.PostAsync(url, content)
                            return resp.IsSuccessStatusCode
                        with _ ->
                            return false
            }

        member private this.Enqueue(report: ErrorReport.ErrorReport) =
            this.EnsureDirectories()
            let path = this.QueuePath report.Id
            File.WriteAllText(path, ErrorReport.encodeToString report, Encoding.UTF8)
            path

        member this.FlushQueue() =
            task {
                this.EnsureDirectories()

                if not (Directory.Exists queueDir) then
                    return 0
                else
                    let files = Directory.GetFiles(queueDir, "*.json")
                    let mutable uploaded = 0

                    for file in files do
                        try
                            let json = File.ReadAllText file

                            let report =
                                match ErrorReport.decodeFromString json with
                                | Ok r -> Some r
                                | Error _ -> None

                            match report with
                            | None -> ()
                            | Some r ->
                                let! ok = this.TryUploadReport r

                                if ok then
                                    File.Delete file |> ignore
                                    uploaded <- uploaded + 1
                        with _ ->
                            ()

                    return uploaded
            }

        member this.Submit(rawJson: string, userConsented: bool) =
            task {
                this.EnsureDirectories()

                match ErrorReport.decodeFromString rawJson with
                | Error err -> return Error err
                | Ok parsed ->
                    let report =
                        { parsed with
                            UserConsented = userConsented || parsed.UserConsented }

                    match ErrorReport.validate report with
                    | Error err -> return Error err
                    | Ok valid ->
                        let sanitized = ErrorReport.sanitize valid
                        let path = this.Persist sanitized
                        let! uploaded = this.TryUploadReport sanitized

                        if not uploaded && config.Value.AutoUpload && config.Value.WebhookUrl.IsSome then
                            this.Enqueue sanitized |> ignore

                        let! _ = this.FlushQueue()

                        return
                            Ok
                                { ReportId = sanitized.Id
                                  StoredPath = path
                                  Uploaded = uploaded
                                  Queued = not uploaded && config.Value.WebhookUrl.IsSome }
            }

        member this.CaptureHostException (ex: exn) =
            task {
                let systemSnapshot : ErrorReport.SystemSnapshot =
                    { Os = Environment.OSVersion.ToString()
                      AppVersion = ErrorReport.appVersion
                      HostHealthy = Some true
                      OllamaReachable = None
                      WorkerReachable = None }

                let reportResult =
                    ErrorReport.create
                        "host"
                        "fatal"
                        ex.Message
                        (Some(ex.ToString()))
                        (Some(Map.ofList [ "type", ex.GetType().Name ]))
                        (Some systemSnapshot)
                        None
                        false

                match reportResult with
                | Error _ -> return None
                | Ok report ->
                    let json = ErrorReport.encodeToString report
                    let! result = this.Submit(json, false)
                    return result |> Result.toOption
            }
