namespace LMVideoStudio.Host

open System
open System.Net
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading.Tasks

module SdCppVideoProvider =
    type VideoHealth =
        { Ready: bool
          SupportedModes: string list
          ModelName: string option
          Error: string option }

    type GenerateVideoRequest =
        { Prompt: string
          Width: int
          Height: int
          Frames: int
          Fps: int
          Steps: int
          Seed: int
          InitImageBase64: string option }

    type GenerateVideoResult =
        { VideoBase64: string
          MimeType: string
          OutputFormat: string
          FrameCount: int
          Fps: int }

    let normalizeFrameCount requested =
        if requested < 1 then invalidArg "Frames" "Video frames must be positive"
        1 + 4 * ((requested - 1) / 4)

    let private validateBaseUrl (value: string) =
        let mutable uri = Unchecked.defaultof<Uri>

        if
            not (Uri.TryCreate(value, UriKind.Absolute, &uri))
            || uri.Scheme <> Uri.UriSchemeHttp
            || uri.Host <> IPAddress.Loopback.ToString()
            || uri.IsDefaultPort
            || not (String.IsNullOrEmpty uri.UserInfo)
            || not (String.IsNullOrEmpty uri.Query)
            || not (String.IsNullOrEmpty uri.Fragment)
        then
            invalidArg "baseUrl" "stable-diffusion.cpp URL must use explicit HTTP IPv4 loopback"

        value.TrimEnd('/')

    type SdCppVideoProvider
        (
            baseUrl: string,
            ?httpClient: HttpClient,
            ?pollInterval: TimeSpan,
            ?pollTimeout: TimeSpan
        ) =
        let baseUrl = validateBaseUrl baseUrl
        let http = defaultArg httpClient (new HttpClient())
        let pollInterval = defaultArg pollInterval (TimeSpan.FromSeconds 1.0)
        let pollTimeout = defaultArg pollTimeout (TimeSpan.FromMinutes 30.0)

        do http.Timeout <- TimeSpan.FromHours 1.0

        member _.HealthCheck() : Task<VideoHealth> =
            task {
                try
                    use! response = http.GetAsync($"{baseUrl}/sdcpp/v1/capabilities")

                    if not response.IsSuccessStatusCode then
                        return { Ready = false; SupportedModes = []; ModelName = None; Error = Some $"HTTP {(int response.StatusCode)}" }
                    else
                        let! body = response.Content.ReadAsStringAsync()
                        use doc = JsonDocument.Parse body

                        let modes =
                            match doc.RootElement.TryGetProperty "supported_modes" with
                            | true, values when values.ValueKind = JsonValueKind.Array ->
                                values.EnumerateArray()
                                |> Seq.choose (fun value ->
                                    if value.ValueKind = JsonValueKind.String then Option.ofObj (value.GetString()) else None)
                                |> Seq.toList
                            | _ -> []

                        let modelName =
                            match doc.RootElement.TryGetProperty "model" with
                            | true, model when model.ValueKind = JsonValueKind.Object ->
                                match model.TryGetProperty "name" with
                                | true, value when value.ValueKind = JsonValueKind.String -> Option.ofObj (value.GetString())
                                | _ -> None
                            | _ -> None

                        return
                            { Ready = modes |> List.contains "vid_gen"
                              SupportedModes = modes
                              ModelName = modelName
                              Error = if modes |> List.contains "vid_gen" then None else Some "Loaded model does not advertise vid_gen" }
                with ex ->
                    return { Ready = false; SupportedModes = []; ModelName = None; Error = Some ex.Message }
            }

        member this.Generate(request: GenerateVideoRequest) : Task<Result<GenerateVideoResult, string>> =
            task {
                let! health = this.HealthCheck()

                if not health.Ready then
                    return Error(health.Error |> Option.defaultValue "stable-diffusion.cpp video provider is not ready")
                else
                    let frames = normalizeFrameCount request.Frames
                    let fastWan =
                        health.ModelName
                        |> Option.exists (fun name -> name.Contains("FastWan", StringComparison.OrdinalIgnoreCase))

                    let steps = if request.Steps > 0 then request.Steps else if fastWan then 3 else 36
                    let scheduler = if fastWan then "lcm" else "smoothstep"
                    let flowShift = if fastWan then 3.0 else 5.0
                    let cfg = if fastWan then 1.0 else 5.0
                    let payload =
                        JsonSerializer.Serialize(
                            {| prompt = request.Prompt
                               negative_prompt = "deformation, duplicate subject, changing geometry, camera shake, jitter, flicker, sudden scene change, text, watermark"
                               width = request.Width
                               height = request.Height
                               seed = request.Seed
                               video_frames = frames
                               fps = request.Fps
                               strength = 0.60
                               init_image = request.InitImageBase64 |> Option.toObj
                               output_format = "webm"
                               sample_params =
                                {| scheduler = scheduler
                                   sample_method = "euler"
                                   sample_steps = steps
                                   flow_shift = flowShift
                                   guidance = {| txt_cfg = cfg; img_cfg = cfg |} |} |}
                        )

                    use content = new StringContent(payload, Encoding.UTF8, "application/json")
                    use! submitted = http.PostAsync($"{baseUrl}/sdcpp/v1/vid_gen", content)

                    if submitted.StatusCode <> HttpStatusCode.Accepted then
                        let! error = submitted.Content.ReadAsStringAsync()
                        return Error $"stable-diffusion.cpp video submit failed: HTTP {(int submitted.StatusCode)} {error}"
                    else
                        let! submissionBody = submitted.Content.ReadAsStringAsync()
                        use submission = JsonDocument.Parse submissionBody
                        let pollUrl = submission.RootElement.GetProperty("poll_url").GetString()

                        if String.IsNullOrWhiteSpace pollUrl || not (pollUrl.StartsWith("/sdcpp/v1/jobs/", StringComparison.Ordinal)) then
                            return Error "stable-diffusion.cpp returned an invalid poll URL"
                        else
                            let mutable completed = false
                            let mutable output: Result<GenerateVideoResult, string> option = None
                            let deadline = DateTimeOffset.UtcNow + pollTimeout

                            while not completed do
                                if DateTimeOffset.UtcNow >= deadline then
                                    completed <- true
                                    output <- Some(Error $"stable-diffusion.cpp video job exceeded {pollTimeout.TotalMinutes:g} minute poll timeout")
                                elif pollInterval > TimeSpan.Zero then
                                    do! Task.Delay pollInterval

                                if not completed then
                                    use! polled = http.GetAsync($"{baseUrl}{pollUrl}")

                                    if not polled.IsSuccessStatusCode then
                                        completed <- true
                                        output <- Some(Error $"stable-diffusion.cpp video poll failed: HTTP {(int polled.StatusCode)}")
                                    else
                                        let! body = polled.Content.ReadAsStringAsync()
                                        use doc = JsonDocument.Parse body
                                        let status = doc.RootElement.GetProperty("status").GetString()

                                        match status with
                                        | "completed" ->
                                            let result = doc.RootElement.GetProperty "result"
                                            completed <- true
                                            output <-
                                                Some(
                                                    Ok
                                                        { VideoBase64 = result.GetProperty("b64_json").GetString()
                                                          MimeType = result.GetProperty("mime_type").GetString()
                                                          OutputFormat = result.GetProperty("output_format").GetString()
                                                          FrameCount = result.GetProperty("frame_count").GetInt32()
                                                          Fps = result.GetProperty("fps").GetInt32() }
                                                )
                                        | "failed"
                                        | "cancelled" ->
                                            let message =
                                                match doc.RootElement.TryGetProperty "error" with
                                                | true, error when error.ValueKind = JsonValueKind.Object ->
                                                    match error.TryGetProperty "message" with
                                                    | true, value when value.ValueKind = JsonValueKind.String -> value.GetString()
                                                    | _ -> $"Video job {status}"
                                                | _ -> $"Video job {status}"

                                            completed <- true
                                            output <- Some(Error message)
                                        | _ -> ()

                            return output |> Option.defaultValue (Error "Video job ended without a result")
            }

        interface IDisposable with
            member _.Dispose() = http.Dispose()
