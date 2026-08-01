namespace LMVideoStudio.Host

open System
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading.Tasks

module MediaGenerationProvider =
    type ImageProviderMode =
        | Auto
        | Lemonade
        | Worker

        member this.Name =
            match this with
            | Auto -> "auto"
            | Lemonade -> "lemonade"
            | Worker -> "worker"

    type MediaGenerationConfig =
        { Mode: ImageProviderMode
          LemonadeBaseUrl: string
          LemonadeModel: string }

    type ImageProviderHealth =
        { SelectedProvider: string
          LemonadeReachable: bool
          LemonadeModelAvailable: bool
          WorkerReachable: bool
          Ready: bool
          Error: string option }

    type GenerateImageOutput =
        { Provider: string
          Image: PythonWorkerProvider.GenerateImageResult }

    let private environmentValue name fallback =
        let value = Environment.GetEnvironmentVariable name
        if String.IsNullOrWhiteSpace value then fallback else value.Trim()

    let configFromEnvironment () =
        let mode =
            match environmentValue "LMVS_IMAGE_PROVIDER" "auto" |> fun value -> value.ToLowerInvariant() with
            | "auto" -> Auto
            | "lemonade" -> Lemonade
            | "worker" -> Worker
            | value ->
                invalidArg
                    "LMVS_IMAGE_PROVIDER"
                    $"Unsupported image provider '{value}'. Expected 'auto', 'lemonade', or 'worker'."

        { Mode = mode
          LemonadeBaseUrl = environmentValue "LMVS_IMAGE_BASE_URL" "http://127.0.0.1:13305"
          LemonadeModel = environmentValue "LMVS_IMAGE_MODEL" "user.Z-Image-Turbo-Q6" }

    type MediaGenerationProvider
        (
            config: MediaGenerationConfig,
            worker: PythonWorkerProvider.PythonWorkerProvider,
            ?httpClient: HttpClient
        ) =
        let http = defaultArg httpClient (new HttpClient())
        let baseUrl = config.LemonadeBaseUrl.TrimEnd('/')

        do http.Timeout <- TimeSpan.FromMinutes 30.0

        let lemonadeReadiness () =
            task {
                try
                    use! healthResponse = http.GetAsync($"{baseUrl}/api/v1/health")

                    if not healthResponse.IsSuccessStatusCode then
                        return false, false, Some $"Lemonade health returned HTTP {(int healthResponse.StatusCode)}"
                    else
                        let! healthBody = healthResponse.Content.ReadAsStringAsync()
                        use healthDoc = JsonDocument.Parse healthBody

                        let healthy =
                            match healthDoc.RootElement.TryGetProperty "status" with
                            | true, status when status.ValueKind = JsonValueKind.String ->
                                String.Equals(status.GetString(), "ok", StringComparison.OrdinalIgnoreCase)
                            | _ -> false

                        if not healthy then
                            return true, false, Some "Lemonade health did not report status 'ok'"
                        else
                            use! modelsResponse = http.GetAsync($"{baseUrl}/api/v1/models")

                            if not modelsResponse.IsSuccessStatusCode then
                                return true, false, Some $"Lemonade models returned HTTP {(int modelsResponse.StatusCode)}"
                            else
                                let! body = modelsResponse.Content.ReadAsStringAsync()
                                use doc = JsonDocument.Parse body

                                let available =
                                    match doc.RootElement.TryGetProperty "data" with
                                    | true, models when models.ValueKind = JsonValueKind.Array ->
                                        models.EnumerateArray()
                                        |> Seq.exists (fun model ->
                                            let nameMatches =
                                                match model.TryGetProperty "id" with
                                                | true, id when id.ValueKind = JsonValueKind.String ->
                                                    String.Equals(id.GetString(), config.LemonadeModel, StringComparison.OrdinalIgnoreCase)
                                                | _ -> false

                                            let downloaded =
                                                match model.TryGetProperty "downloaded" with
                                                | true, value when value.ValueKind = JsonValueKind.False -> false
                                                | _ -> true

                                            nameMatches && downloaded)
                                    | _ -> false

                                return true, available, None
                with ex ->
                    return false, false, Some ex.Message
            }

        let generateWithLemonade (request: PythonWorkerProvider.GenerateImageRequest) =
            task {
                if request.ImageBase64.IsSome then
                    return Error "Lemonade text-to-image mode does not accept a reference image; use the worker fallback"
                else
                    let payload =
                        JsonSerializer.Serialize(
                            {| model = config.LemonadeModel
                               prompt = request.Prompt
                               size = $"{request.Width}x{request.Height}"
                               n = 1
                               response_format = "b64_json"
                               // Z-Image-Turbo is designed for a short 8-9 step schedule. Keep
                               // the caller's higher legacy-worker quality settings separate.
                               steps = min request.Steps 9
                               cfg_scale = 0.0
                               seed = request.Seed |}
                        )

                    use content = new StringContent(payload, Encoding.UTF8, "application/json")
                    use! response = http.PostAsync($"{baseUrl}/api/v1/images/generations", content)

                    if not response.IsSuccessStatusCode then
                        let! error = response.Content.ReadAsStringAsync()
                        return Error $"Lemonade image generation failed: HTTP {(int response.StatusCode)} {error}"
                    else
                        let! body = response.Content.ReadAsStringAsync()

                        try
                            use doc = JsonDocument.Parse body
                            let encoded = doc.RootElement.GetProperty("data").[0].GetProperty("b64_json").GetString()

                            if String.IsNullOrWhiteSpace encoded then
                                return Error "Lemonade image generation returned empty image data"
                            else
                                let image: PythonWorkerProvider.GenerateImageResult =
                                    { ImageBase64 = encoded
                                      Width = request.Width
                                      Height = request.Height
                                      Mode = Some "txt2img" }

                                return Ok image
                        with ex ->
                            return Error $"Invalid Lemonade image response: {ex.Message}"
            }

        let unloadLemonade () =
            task {
                try
                    let payload = JsonSerializer.Serialize {| model_name = config.LemonadeModel |}
                    use content = new StringContent(payload, Encoding.UTF8, "application/json")
                    use! response = http.PostAsync($"{baseUrl}/api/v1/unload", content)
                    return response.IsSuccessStatusCode
                with _ ->
                    return false
            }

        member _.Config = config

        member _.HealthCheck() : Task<ImageProviderHealth> =
            task {
                match config.Mode with
                | Worker ->
                    let! workerHealth = worker.HealthCheck()
                    return
                        { SelectedProvider = "worker"
                          LemonadeReachable = false
                          LemonadeModelAvailable = false
                          WorkerReachable = workerHealth.Reachable
                          Ready = workerHealth.Reachable
                          Error = workerHealth.Error }
                | Lemonade ->
                    let! lemonadeReachable, modelAvailable, lemonadeError = lemonadeReadiness ()
                    return
                        { SelectedProvider = "lemonade"
                          LemonadeReachable = lemonadeReachable
                          LemonadeModelAvailable = modelAvailable
                          WorkerReachable = false
                          Ready = lemonadeReachable && modelAvailable
                          Error =
                            if lemonadeReachable && not modelAvailable then
                                Some $"Lemonade image model '{config.LemonadeModel}' is not downloaded"
                            else
                                lemonadeError }
                | Auto ->
                    let! lemonadeReachable, modelAvailable, lemonadeError = lemonadeReadiness ()

                    if lemonadeReachable && modelAvailable then
                        return
                            { SelectedProvider = "lemonade"
                              LemonadeReachable = true
                              LemonadeModelAvailable = true
                              WorkerReachable = false
                              Ready = true
                              Error = None }
                    else
                        let! workerHealth = worker.HealthCheck()
                        return
                            { SelectedProvider = "worker"
                              LemonadeReachable = lemonadeReachable
                              LemonadeModelAvailable = modelAvailable
                              WorkerReachable = workerHealth.Reachable
                              Ready = workerHealth.Reachable
                              Error = workerHealth.Error |> Option.orElse lemonadeError }
            }

        member this.GenerateImage(request: PythonWorkerProvider.GenerateImageRequest) : Task<Result<GenerateImageOutput, string>> =
            task {
                if request.ImageBase64.IsSome && config.Mode <> Lemonade then
                    let! workerHealth = worker.HealthCheck()

                    if not workerHealth.Reachable then
                        return Error(workerHealth.Error |> Option.defaultValue "The image worker is required for reference-image generation")
                    else
                        let! result = worker.GenerateImage request
                        return result |> Result.map (fun image -> { Provider = "worker"; Image = image })
                else
                    let! health = this.HealthCheck()

                    if not health.Ready then
                        return Error(health.Error |> Option.defaultValue "No image provider is ready")
                    elif health.SelectedProvider = "lemonade" then
                        let! result = generateWithLemonade request
                        let! _ = unloadLemonade ()
                        return result |> Result.map (fun image -> { Provider = "lemonade"; Image = image })
                    else
                        let! result = worker.GenerateImage request
                        return result |> Result.map (fun image -> { Provider = "worker"; Image = image })
            }

        member this.GenerateForProfile(profile: LMVideoStudio.Domain.RenderProfile, prompt: string, ?seed: int, ?imageBase64: string, ?strength: float) =
            let seed = defaultArg seed 42
            let strength = defaultArg strength 0.35

            let steps =
                match profile.Tier, imageBase64 with
                | LMVideoStudio.Domain.RenderTier.Mockup, Some _ -> 28
                | LMVideoStudio.Domain.RenderTier.Mockup, None -> 15
                | LMVideoStudio.Domain.RenderTier.Bake, Some _ -> 28
                | LMVideoStudio.Domain.RenderTier.Bake, None -> 25

            this.GenerateImage
                { Prompt = prompt
                  Width = profile.Width
                  Height = profile.Height
                  Steps = steps
                  Seed = seed
                  ImageBase64 = imageBase64
                  Strength = strength }

        interface IDisposable with
            member _.Dispose() = http.Dispose()
