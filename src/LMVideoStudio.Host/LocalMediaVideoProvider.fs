namespace LMVideoStudio.Host

open System
open System.IO
open System.Threading.Tasks

module LocalMediaVideoProvider =
    type LocalMediaVideoProvider(config: LocalMediaClient.Config, ?httpClient: System.Net.Http.HttpClient, ?pollInterval: TimeSpan) =
        let client = new LocalMediaClient.Client(config, ?httpClient = httpClient, ?pollInterval = pollInterval, pollTimeout = TimeSpan.FromHours 2.0)

        let containedOutput (relative: string) =
            let root = Path.GetFullPath config.OutputRoot
            let full = Path.GetFullPath(Path.Combine(root, relative.Replace('/', Path.DirectorySeparatorChar)))
            if String.IsNullOrWhiteSpace config.OutputRoot || not (full.StartsWith(root + string Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) then None else Some full

        member _.HealthCheck() : Task<SdCppVideoProvider.VideoHealth> =
            task {
                let! health = client.HealthCheck()
                let modes = if health.Ready then [ "vid_gen" ] else []
                let modelName = if health.Ready then Some config.ModelId else None
                return ({ Ready = health.Ready; SupportedModes = modes; ModelName = modelName; Error = health.Error }: SdCppVideoProvider.VideoHealth)
            }

        member _.Generate(request: SdCppVideoProvider.GenerateVideoRequest) : Task<Result<SdCppVideoProvider.GenerateVideoResult, string>> =
            task {
                let frames = SdCppVideoProvider.normalizeFrameCount request.Frames
                let relative = $"lmvs/{Guid.NewGuid():N}.webm"
                match containedOutput relative with
                | None -> return Error "Local media output root is missing or invalid"
                | Some full ->
                    let steps = if request.Steps > 0 then request.Steps else 9
                    let! completed = client.SubmitAndPollMedia(Guid.NewGuid().ToString("N"), "video.generate", request.Prompt, relative, request.Width, request.Height, steps, request.Seed, ignore, frames = frames, fps = request.Fps, ?initImage = request.InitImageBase64)
                    match completed with
                    | Error error -> return Error error
                    | Ok job when job.Output <> relative -> return Error "Local media returned an unexpected output path"
                    | Ok _ when not (File.Exists full) -> return Error "Local media video output is missing"
                    | Ok _ ->
                        let bytes = File.ReadAllBytes full
                        let isWebM = bytes.Length >= 4 && bytes[0..3] = [| 0x1Auy; 0x45uy; 0xDFuy; 0xA3uy |]
                        let isMp4 = bytes.Length >= 12 && bytes[4..7] = [| byte 'f'; byte 't'; byte 'y'; byte 'p' |]
                        if not isWebM && not isMp4 then return Error "Local media returned an invalid video"
                        else
                            let format, mimeType = if isWebM then "webm", "video/webm" else "mp4", "video/mp4"
                            let result: SdCppVideoProvider.GenerateVideoResult = { VideoBase64 = Convert.ToBase64String bytes; MimeType = mimeType; OutputFormat = format; FrameCount = frames; Fps = request.Fps }
                            return Ok result
            }

        interface SdCppVideoProvider.IVideoProvider with
            member this.HealthCheck() = this.HealthCheck()
            member this.Generate(request) = this.Generate(request)

        interface IDisposable with member _.Dispose() = (client :> IDisposable).Dispose()
