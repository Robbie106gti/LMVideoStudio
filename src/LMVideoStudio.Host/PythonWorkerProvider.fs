namespace LMVideoStudio.Host

open System
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading.Tasks
open LMVideoStudio.Domain

module PythonWorkerProvider =
    type WorkerHealth =
        { Reachable: bool
          Rocm: bool option
          VramGb: float option
          DeviceName: string option
          Error: string option }

    type GenerateImageRequest =
        { Prompt: string
          Width: int
          Height: int
          Steps: int
          Seed: int }

    type GenerateImageResult =
        { ImageBase64: string
          Width: int
          Height: int }

    type GenerateVoiceoverResult =
        { AudioBase64: string
          Format: string }

    type UpscaleImageResult =
        { ImageBase64: string
          Width: int
          Height: int }

    let private requestGenerateImage (http: HttpClient) (baseUrl: string) (req: GenerateImageRequest) : Task<Result<GenerateImageResult, string>> =
        task {
            let payload =
                JsonSerializer.Serialize(
                    {| prompt = req.Prompt
                       width = req.Width
                       height = req.Height
                       steps = req.Steps
                       seed = req.Seed |}
                )

            use content = new StringContent(payload, Encoding.UTF8, "application/json")
            let! resp = http.PostAsync($"{baseUrl}/image/generate", content)

            if not resp.IsSuccessStatusCode then
                let! err = resp.Content.ReadAsStringAsync()
                return Error $"Worker generate failed: HTTP {(int resp.StatusCode)} {err}"
            else
                let! body = resp.Content.ReadAsStringAsync()

                try
                    let doc = JsonDocument.Parse body
                    let b64 = doc.RootElement.GetProperty("image_base64").GetString()

                    return
                        (Ok
                            { ImageBase64 = b64
                              Width = req.Width
                              Height = req.Height }
                         : Result<GenerateImageResult, string>)
                with ex ->
                    return Error ex.Message
        }

    let private requestGenerateVoiceover (http: HttpClient) (baseUrl: string) (script: string) : Task<Result<GenerateVoiceoverResult, string>> =
        task {
            let payload = JsonSerializer.Serialize {| text = script |}
            use content = new StringContent(payload, Encoding.UTF8, "application/json")
            let! resp = http.PostAsync($"{baseUrl}/audio/generate", content)

            if not resp.IsSuccessStatusCode then
                let! err = resp.Content.ReadAsStringAsync()
                return Error $"Worker TTS failed: HTTP {(int resp.StatusCode)} {err}"
            else
                let! body = resp.Content.ReadAsStringAsync()

                try
                    let doc = JsonDocument.Parse body
                    let b64 = doc.RootElement.GetProperty("audio_base64").GetString()

                    let format =
                        match doc.RootElement.TryGetProperty("format") with
                        | true, p -> p.GetString()
                        | _ -> "wav"

                    return Ok { AudioBase64 = b64; Format = format }
                with ex ->
                    return Error ex.Message
        }

    let private requestUpscaleImage (http: HttpClient) (baseUrl: string) (imageBase64: string) : Task<Result<UpscaleImageResult, string>> =
        task {
            let payload = JsonSerializer.Serialize {| image_base64 = imageBase64 |}
            use content = new StringContent(payload, Encoding.UTF8, "application/json")
            let! resp = http.PostAsync($"{baseUrl}/image/upscale", content)

            if not resp.IsSuccessStatusCode then
                let! err = resp.Content.ReadAsStringAsync()
                return Error $"Worker upscale failed: HTTP {(int resp.StatusCode)} {err}"
            else
                let! body = resp.Content.ReadAsStringAsync()

                try
                    let doc = JsonDocument.Parse body
                    let b64 = doc.RootElement.GetProperty("image_base64").GetString()

                    let width =
                        match doc.RootElement.TryGetProperty("width") with
                        | true, p -> p.GetInt32()
                        | _ -> 0

                    let height =
                        match doc.RootElement.TryGetProperty("height") with
                        | true, p -> p.GetInt32()
                        | _ -> 0

                    return (Ok { ImageBase64 = b64; Width = width; Height = height } : Result<UpscaleImageResult, string>)
                with ex ->
                    return Error ex.Message
        }

    type PythonWorkerProvider(baseUrl: string, ?httpClient: HttpClient) =
        let http =
            let client = defaultArg httpClient (new HttpClient())
            client.Timeout <- TimeSpan.FromMinutes 10.0
            client

        let baseUrl = baseUrl.TrimEnd('/')

        member _.BaseUrl = baseUrl

        member _.HealthCheck() : Task<WorkerHealth> =
            task {
                try
                    let! resp = http.GetAsync($"{baseUrl}/health")

                    if resp.IsSuccessStatusCode then
                        let! body = resp.Content.ReadAsStringAsync()

                        try
                            let doc = JsonDocument.Parse body

                            let rocm =
                                match doc.RootElement.TryGetProperty("rocm") with
                                | true, p -> Some(p.GetBoolean())
                                | _ -> None

                            let vram =
                                match doc.RootElement.TryGetProperty("vram_gb") with
                                | true, p -> Some(p.GetDouble())
                                | _ -> None

                            let deviceName =
                                match doc.RootElement.TryGetProperty("device_name") with
                                | true, p -> Some(p.GetString())
                                | _ -> None

                            return
                                { Reachable = true
                                  Rocm = rocm
                                  VramGb = vram
                                  DeviceName = deviceName
                                  Error = None }
                        with ex ->
                            return
                                { Reachable = true
                                  Rocm = None
                                  VramGb = None
                                  DeviceName = None
                                  Error = Some ex.Message }
                    else
                        return
                            { Reachable = false
                              Rocm = None
                              VramGb = None
                              DeviceName = None
                              Error = Some $"HTTP {(int resp.StatusCode)}" }
                with ex ->
                    return
                        { Reachable = false
                          Rocm = None
                          VramGb = None
                          DeviceName = None
                          Error = Some ex.Message }
            }

        member _.GenerateImage(req: GenerateImageRequest) : Task<Result<GenerateImageResult, string>> =
            requestGenerateImage http baseUrl req

        member this.GenerateForProfile(profile: RenderProfile, prompt: string, ?seed: int) =
            let seed = defaultArg seed 42
            let steps = if profile.Tier = RenderTier.Mockup then 15 else 25

            this.GenerateImage
                { Prompt = prompt
                  Width = profile.Width
                  Height = profile.Height
                  Steps = steps
                  Seed = seed }

        member _.GenerateVoiceover(script: string) : Task<Result<GenerateVoiceoverResult, string>> =
            requestGenerateVoiceover http baseUrl script

        member _.UpscaleImage(imageBase64: string) : Task<Result<UpscaleImageResult, string>> =
            requestUpscaleImage http baseUrl imageBase64

        interface IDisposable with
            member _.Dispose() =
                if isNull (box http) |> not then http.Dispose()
