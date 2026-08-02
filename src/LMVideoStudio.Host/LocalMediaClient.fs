namespace LMVideoStudio.Host

open System
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading.Tasks

module LocalMediaClient =
    type Config = { BaseUrl: string; ProviderId: string; ModelId: string; OutputRoot: string }
    type Health = { Ready: bool; Error: string option }
    type Job = { JobId: string; State: string; Output: string; ErrorCode: string option }

    let private validateBaseUrl value =
        let mutable uri = Unchecked.defaultof<Uri>
        if not (Uri.TryCreate(value, UriKind.Absolute, &uri)) || uri.Scheme <> Uri.UriSchemeHttp || uri.Host <> "127.0.0.1" || uri.IsDefaultPort || not (String.IsNullOrEmpty uri.UserInfo) || not (String.IsNullOrEmpty uri.Query) || not (String.IsNullOrEmpty uri.Fragment) then
            invalidArg "LMVS_LOCAL_MEDIA_BASE_URL" "Local media service URL must be explicit HTTP IPv4 loopback with a port"
        value.TrimEnd('/')

    type Client(config: Config, ?httpClient: HttpClient, ?pollInterval: TimeSpan, ?pollTimeout: TimeSpan) =
        let url = validateBaseUrl config.BaseUrl
        let http = defaultArg httpClient (new HttpClient())
        let interval = defaultArg pollInterval (TimeSpan.FromSeconds 1.0)
        let timeout = defaultArg pollTimeout (TimeSpan.FromMinutes 30.0)
        let parseJob (body: string) =
            use doc = JsonDocument.Parse body
            let root = doc.RootElement
            { JobId = root.GetProperty("job_id").GetString()
              State = root.GetProperty("state").GetString()
              Output = root.GetProperty("output").GetString()
              ErrorCode =
                match root.TryGetProperty "error_code" with
                | true, value when value.ValueKind = JsonValueKind.String -> Option.ofObj(value.GetString())
                | _ -> None }
        member _.Config = config
        member _.HealthCheck() : Task<Health> =
            task {
                try
                    use! response = http.GetAsync($"{url}/health")
                    if not response.IsSuccessStatusCode then
                        return { Ready = false; Error = Some $"Local media health returned HTTP {(int response.StatusCode)}" }
                    else
                        let! healthBody = response.Content.ReadAsStringAsync()
                        use health = JsonDocument.Parse healthBody
                        let healthy = match health.RootElement.TryGetProperty "status" with | true, value -> value.GetString() = "ok" | _ -> false
                        if not healthy then return { Ready = false; Error = Some "Local media health did not report status 'ok'" }
                        else
                            use! response = http.GetAsync($"{url}/v1/media/capabilities")
                            if not response.IsSuccessStatusCode then return { Ready = false; Error = Some $"Local media capabilities returned HTTP {(int response.StatusCode)}" }
                            else
                                let! body = response.Content.ReadAsStringAsync()
                                use doc = JsonDocument.Parse body
                                let available =
                                    match doc.RootElement.TryGetProperty "providers" with
                                    | true, providers when providers.ValueKind = JsonValueKind.Array -> providers.EnumerateArray() |> Seq.exists (fun provider ->
                                        match provider.TryGetProperty "provider_id", provider.TryGetProperty "models" with
                                        | (true, providerId), (true, models) when providerId.GetString() = config.ProviderId && models.ValueKind = JsonValueKind.Array -> models.EnumerateArray() |> Seq.exists (fun model ->
                                            match model.TryGetProperty "model_id", model.TryGetProperty "qualified", model.TryGetProperty "status" with
                                            | (true, modelId), (true, qualified), (true, status) -> modelId.GetString() = config.ModelId && qualified.GetBoolean() && status.GetString() = "available"
                                            | _ -> false)
                                        | _ -> false)
                                    | _ -> false
                                return if available then { Ready = true; Error = None } else { Ready = false; Error = Some $"Local media profile '{config.ModelId}' is unavailable or unqualified" }
                with ex -> return { Ready = false; Error = Some ex.Message }
            }
        member _.Submit(key: string, prompt: string, output: string) : Task<Result<Job,string>> =
            task {
                try
                    let payload = JsonSerializer.Serialize {| idempotency_key = key; provider_id = config.ProviderId; model_id = config.ModelId; operation = "image.generate"; input = {| prompt = prompt |}; output = {| path = output |} |}
                    use content = new StringContent(payload, Encoding.UTF8, "application/json")
                    use! response = http.PostAsync($"{url}/v1/media/jobs", content)
                    let! body = response.Content.ReadAsStringAsync()
                    return if (int response.StatusCode) = 202 then Ok(parseJob body) else Error $"Local media submit failed: HTTP {(int response.StatusCode)}"
                with ex -> return Error $"Local media submit failed: {ex.Message}"
            }
        member _.Get(id: string) : Task<Result<Job,string>> =
            task {
                try
                    use! response = http.GetAsync($"{url}/v1/media/jobs/{Uri.EscapeDataString id}")
                    let! body = response.Content.ReadAsStringAsync()
                    return if response.IsSuccessStatusCode then Ok(parseJob body) else Error $"Local media poll failed: HTTP {(int response.StatusCode)}"
                with ex -> return Error $"Local media poll failed: {ex.Message}"
            }
        member _.Cancel(id: string) : Task<Result<Job,string>> =
            task {
                try
                    use content = new StringContent("{}", Encoding.UTF8, "application/json")
                    use! response = http.PostAsync($"{url}/v1/media/jobs/{Uri.EscapeDataString id}/cancel", content)
                    let! body = response.Content.ReadAsStringAsync()
                    return if response.IsSuccessStatusCode then Ok(parseJob body) else Error $"Local media cancel failed: HTTP {(int response.StatusCode)}"
                with ex -> return Error $"Local media cancel failed: {ex.Message}"
            }
        member this.SubmitAndPoll(key: string, prompt: string, output: string, onState: string -> unit) : Task<Result<Job,string>> =
            task {
                let! submitted = this.Submit(key, prompt, output)
                match submitted with
                | Error error -> return Error error
                | Ok initial ->
                    onState initial.State
                    let deadline = DateTimeOffset.UtcNow + timeout
                    let mutable current = initial
                    let mutable failure: string option = None
                    while (current.State = "queued" || current.State = "running") && DateTimeOffset.UtcNow < deadline && failure.IsNone do
                        if interval > TimeSpan.Zero then do! Task.Delay interval
                        let! polled = this.Get current.JobId
                        match polled with | Ok next -> current <- next; onState next.State | Error error -> failure <- Some error
                    match failure, current.State with
                    | Some error, _ -> return Error error
                    | None, "completed" -> return Ok current
                    | None, ("failed" | "cancelled") -> return Error(current.ErrorCode |> Option.defaultValue $"Local media job {current.State}")
                    | None, _ -> return Error "Local media job exceeded poll timeout"
            }
        interface IDisposable with member _.Dispose() = http.Dispose()
