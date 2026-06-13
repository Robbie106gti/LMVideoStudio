namespace LMVideoStudio.Host

open System
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading.Tasks

module OllamaProvider =
    type OllamaHealth =
        { Reachable: bool
          ModelCount: int option
          Error: string option }

    type OllamaProvider(baseUrl: string, ?httpClient: HttpClient) =
        let http = defaultArg httpClient (new HttpClient())
        let baseUrl = baseUrl.TrimEnd('/')

        member _.BaseUrl = baseUrl

        member _.HealthCheck() : Task<OllamaHealth> =
            task {
                try
                    let! resp = http.GetAsync($"{baseUrl}/api/tags")

                    if resp.IsSuccessStatusCode then
                        let! body = resp.Content.ReadAsStringAsync()
                        let count =
                            try
                                let doc = JsonDocument.Parse body
                                doc.RootElement.GetProperty("models").GetArrayLength() |> Some
                            with _ ->
                                None

                        return
                            { Reachable = true
                              ModelCount = count
                              Error = None }
                    else
                        return
                            { Reachable = false
                              ModelCount = None
                              Error = Some $"HTTP {(int resp.StatusCode)}" }
                with ex ->
                    return
                        { Reachable = false
                          ModelCount = None
                          Error = Some ex.Message }
            }

        member _.GenerateStub(prompt: string, ?model: string) =
            task {
                let model = defaultArg model "llama3.1:latest"
                let payload =
                    JsonSerializer.Serialize(
                        {| model = model
                           prompt = prompt
                           stream = false |}
                    )

                use content = new StringContent(payload, Encoding.UTF8, "application/json")
                let! resp = http.PostAsync($"{baseUrl}/api/generate", content)

                if not resp.IsSuccessStatusCode then
                    return Error $"Ollama generate failed: HTTP {(int resp.StatusCode)}"
                else
                    let! body = resp.Content.ReadAsStringAsync()

                    try
                        let doc = JsonDocument.Parse body
                        let text = doc.RootElement.GetProperty("response").GetString()
                        return Ok text
                    with ex ->
                        return Error ex.Message
            }

        interface IDisposable with
            member _.Dispose() =
                if isNull (box http) |> not then http.Dispose()
