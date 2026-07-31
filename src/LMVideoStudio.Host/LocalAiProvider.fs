namespace LMVideoStudio.Host

open System
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading.Tasks

module LocalAiProvider =
    type ProviderKind =
        | Lemonade
        | Ollama

        member this.Name =
            match this with
            | Lemonade -> "lemonade"
            | Ollama -> "ollama"

    type LocalAiConfig =
        { Provider: ProviderKind
          BaseUrl: string
          Model: string }

    type LocalAiHealth =
        { Reachable: bool
          Provider: string
          ModelCount: int option
          ConfiguredModelAvailable: bool option
          LoadedModels: string list
          Version: string option
          Error: string option }

    let private environmentValue name fallback =
        let value = Environment.GetEnvironmentVariable name
        if String.IsNullOrWhiteSpace value then fallback else value.Trim()

    let configFromEnvironment () =
        let provider =
            match environmentValue "LMVS_LOCAL_AI_PROVIDER" "lemonade" |> fun value -> value.ToLowerInvariant() with
            | "lemonade" -> Lemonade
            | "ollama" -> Ollama
            | value ->
                invalidArg
                    "LMVS_LOCAL_AI_PROVIDER"
                    $"Unsupported local AI provider '{value}'. Expected 'lemonade' or 'ollama'."

        let defaultBaseUrl, defaultModel =
            match provider with
            | Lemonade -> "http://127.0.0.1:13305", "Bonsai-8B-gguf"
            | Ollama -> "http://127.0.0.1:11434", "llama3.1:latest"

        { Provider = provider
          BaseUrl = environmentValue "LMVS_LOCAL_AI_BASE_URL" defaultBaseUrl
          Model = environmentValue "LMVS_LOCAL_AI_MODEL" defaultModel }

    type LocalAiProvider(config: LocalAiConfig, ?httpClient: HttpClient) =
        let http = defaultArg httpClient (new HttpClient())
        let baseUrl = config.BaseUrl.TrimEnd('/')

        let errorHealth message =
            { Reachable = false
              Provider = config.Provider.Name
              ModelCount = None
              ConfiguredModelAvailable = None
              LoadedModels = []
              Version = None
              Error = Some message }

        let modelNames (root: JsonElement) (propertyName: string) =
            match root.TryGetProperty propertyName with
            | true, models when models.ValueKind = JsonValueKind.Array ->
                models.EnumerateArray()
                |> Seq.choose (fun model ->
                    match model.TryGetProperty "id" with
                    | true, id when id.ValueKind = JsonValueKind.String -> Option.ofObj (id.GetString())
                    | _ -> None)
                |> Seq.toList
            | _ -> []

        let postJson path payload =
            task {
                let json = JsonSerializer.Serialize payload
                use content = new StringContent(json, Encoding.UTF8, "application/json")
                return! http.PostAsync($"{baseUrl}{path}", content)
            }

        let lemonadeOperationResult operation (response: HttpResponseMessage) =
            task {
                if not response.IsSuccessStatusCode then
                    return Error $"Lemonade {operation} failed: HTTP {(int response.StatusCode)}"
                else
                    let! body = response.Content.ReadAsStringAsync()

                    try
                        use doc = JsonDocument.Parse body
                        let root = doc.RootElement
                        let status = root.GetProperty("status").GetString()

                        if String.Equals(status, "success", StringComparison.OrdinalIgnoreCase) then
                            return Ok()
                        else
                            let message =
                                match root.TryGetProperty "message" with
                                | true, value when value.ValueKind = JsonValueKind.String -> value.GetString()
                                | _ -> $"Lemonade {operation} returned status '{status}'"

                            return Error message
                    with ex ->
                        return Error $"Invalid Lemonade {operation} response: {ex.Message}"
            }

        member _.Config = config
        member _.BaseUrl = baseUrl
        member _.ProviderName = config.Provider.Name
        member _.DefaultModel = config.Model
        member _.SupportsExplicitLifecycle = config.Provider = Lemonade

        member _.HealthCheck() : Task<LocalAiHealth> =
            task {
                try
                    match config.Provider with
                    | Lemonade ->
                        use! healthResponse = http.GetAsync($"{baseUrl}/api/v1/health")

                        if not healthResponse.IsSuccessStatusCode then
                            return errorHealth $"HTTP {(int healthResponse.StatusCode)} from /api/v1/health"
                        else
                            let! healthBody = healthResponse.Content.ReadAsStringAsync()
                            use healthDoc = JsonDocument.Parse healthBody
                            let healthRoot = healthDoc.RootElement

                            let statusOk =
                                match healthRoot.TryGetProperty "status" with
                                | true, status -> String.Equals(status.GetString(), "ok", StringComparison.OrdinalIgnoreCase)
                                | _ -> false

                            if not statusOk then
                                return errorHealth "Lemonade health response did not report status 'ok'"
                            else
                                use! modelsResponse = http.GetAsync($"{baseUrl}/api/v1/models")

                                if not modelsResponse.IsSuccessStatusCode then
                                    return errorHealth $"HTTP {(int modelsResponse.StatusCode)} from /api/v1/models"
                                else
                                    let! modelsBody = modelsResponse.Content.ReadAsStringAsync()
                                    use modelsDoc = JsonDocument.Parse modelsBody
                                    let names = modelNames modelsDoc.RootElement "data"

                                    let loaded =
                                        match healthRoot.TryGetProperty "all_models_loaded" with
                                        | true, models when models.ValueKind = JsonValueKind.Array ->
                                            models.EnumerateArray()
                                            |> Seq.choose (fun model ->
                                                match model.TryGetProperty "model_name" with
                                                | true, name when name.ValueKind = JsonValueKind.String ->
                                                    Option.ofObj (name.GetString())
                                                | _ -> None)
                                            |> Seq.toList
                                        | _ -> []

                                    let version =
                                        match healthRoot.TryGetProperty "version" with
                                        | true, value when value.ValueKind = JsonValueKind.String ->
                                            Option.ofObj (value.GetString())
                                        | _ -> None

                                    return
                                        { Reachable = true
                                          Provider = config.Provider.Name
                                          ModelCount = Some names.Length
                                          ConfiguredModelAvailable =
                                            Some(names |> List.exists (fun name -> String.Equals(name, config.Model, StringComparison.OrdinalIgnoreCase)))
                                          LoadedModels = loaded
                                          Version = version
                                          Error = None }
                    | Ollama ->
                        use! response = http.GetAsync($"{baseUrl}/api/tags")

                        if not response.IsSuccessStatusCode then
                            return errorHealth $"HTTP {(int response.StatusCode)} from /api/tags"
                        else
                            let! body = response.Content.ReadAsStringAsync()
                            use doc = JsonDocument.Parse body

                            let names =
                                match doc.RootElement.TryGetProperty "models" with
                                | true, models when models.ValueKind = JsonValueKind.Array ->
                                    models.EnumerateArray()
                                    |> Seq.choose (fun model ->
                                        let tryName (propertyName: string) =
                                            match model.TryGetProperty propertyName with
                                            | true, name when name.ValueKind = JsonValueKind.String ->
                                                Option.ofObj (name.GetString())
                                            | _ -> None

                                        tryName "name" |> Option.orElseWith (fun () -> tryName "model"))
                                    |> Seq.toList
                                | _ -> []

                            return
                                { Reachable = true
                                  Provider = config.Provider.Name
                                  ModelCount = Some names.Length
                                  ConfiguredModelAvailable =
                                    Some(names |> List.exists (fun name -> String.Equals(name, config.Model, StringComparison.OrdinalIgnoreCase)))
                                  LoadedModels = []
                                  Version = None
                                  Error = None }
                with ex ->
                    return errorHealth ex.Message
            }

        member _.Generate(prompt: string, ?model: string) =
            task {
                let model = defaultArg model config.Model

                match config.Provider with
                | Lemonade ->
                    let payload =
                        {| model = model
                           messages = [| {| role = "user"; content = prompt |} |]
                           stream = false |}

                    use! response = postJson "/api/v1/chat/completions" payload

                    if not response.IsSuccessStatusCode then
                        return Error $"Lemonade completion failed: HTTP {(int response.StatusCode)}"
                    else
                        let! body = response.Content.ReadAsStringAsync()

                        try
                            use doc = JsonDocument.Parse body
                            let text =
                                doc.RootElement.GetProperty("choices").[0].GetProperty("message").GetProperty("content").GetString()

                            if String.IsNullOrWhiteSpace text then
                                return Error "Lemonade completion returned empty content"
                            else
                                return Ok text
                        with ex ->
                            return Error $"Invalid Lemonade completion response: {ex.Message}"
                | Ollama ->
                    let payload =
                        {| model = model
                           prompt = prompt
                           stream = false |}

                    use! response = postJson "/api/generate" payload

                    if not response.IsSuccessStatusCode then
                        return Error $"Ollama generate failed: HTTP {(int response.StatusCode)}"
                    else
                        let! body = response.Content.ReadAsStringAsync()

                        try
                            use doc = JsonDocument.Parse body
                            let text = doc.RootElement.GetProperty("response").GetString()

                            if String.IsNullOrWhiteSpace text then
                                return Error "Ollama generate returned empty content"
                            else
                                return Ok text
                        with ex ->
                            return Error $"Invalid Ollama generate response: {ex.Message}"
            }

        member this.GenerateStub(prompt: string, ?model: string) =
            this.Generate(prompt, ?model = model)

        member _.LoadModel(?model: string) =
            task {
                match config.Provider with
                | Ollama -> return Error "Explicit model loading is only available with the Lemonade provider"
                | Lemonade ->
                    let model = defaultArg model config.Model
                    use! response = postJson "/api/v1/load" {| model_name = model |}
                    return! lemonadeOperationResult "load" response
            }

        member _.UnloadModel(?model: string) =
            task {
                match config.Provider with
                | Ollama -> return Error "Explicit model unloading is only available with the Lemonade provider"
                | Lemonade ->
                    let model = defaultArg model config.Model
                    use! response = postJson "/api/v1/unload" {| model_name = model |}
                    return! lemonadeOperationResult "unload" response
            }

        interface IDisposable with
            member _.Dispose() = http.Dispose()
