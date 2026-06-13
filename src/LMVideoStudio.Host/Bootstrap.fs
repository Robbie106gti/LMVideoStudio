namespace LMVideoStudio.Host

open System
open System.Diagnostics
open System.IO
open System.Net.Http
open System.Threading.Tasks

module ModelSync =
    type ModelSyncService(repoRoot: string, events: JobEventHub) =
        let http = new HttpClient()

        let tryReach (url: string) =
            task {
                try
                    let! resp = http.GetAsync url
                    return resp.IsSuccessStatusCode
                with _ ->
                    return false
            }

        let runScript (extraArgs: string) : Task<Result<obj, string>> =
            task {
                let script = Path.Combine(repoRoot, "scripts", "sync_models.ps1")
                let jobId = Guid.NewGuid()

                events.Publish(
                    JobEvent.create jobId ModelCatalogSync "model_sync_start" "Checking model catalog…" Running
                )

                if not (File.Exists script) then
                    events.Publish(
                        JobEvent.create jobId ModelCatalogSync "model_sync_failed" "sync_models.ps1 missing" Failed
                    )

                    return Error "sync_models.ps1 not found"
                else
                    let psi = ProcessStartInfo()
                    psi.FileName <- "powershell.exe"
                    psi.Arguments <- $"-NoProfile -ExecutionPolicy Bypass -File \"{script}\" {extraArgs}"
                    psi.RedirectStandardOutput <- true
                    psi.RedirectStandardError <- true
                    psi.UseShellExecute <- false
                    psi.CreateNoWindow <- true
                    psi.WorkingDirectory <- repoRoot

                    use proc = Process.Start psi
                    let stdout = proc.StandardOutput.ReadToEnd()
                    let stderr = proc.StandardError.ReadToEnd()
                    proc.WaitForExit()

                    let status =
                        if proc.ExitCode = 0 then Completed else Failed

                    let detail =
                        if String.IsNullOrWhiteSpace stderr then stdout else stderr

                    events.Publish(
                        { JobEvent.create jobId ModelCatalogSync "model_sync_done" "Model sync finished" status with
                            Error =
                                if proc.ExitCode = 0 then None else Some detail }
                    )

                    return
                        if proc.ExitCode = 0 then
                            Ok(
                                box
                                    {| exitCode = proc.ExitCode
                                       output = stdout |}
                            )
                        else
                            Error detail
            }

        member _.RunCheck() = runScript "-Check"

        member _.RunPull() = runScript "-Pull"

        member _.GetStatus() =
            task {
                let! ollamaOk = tryReach "http://localhost:11434/api/tags"
                let! workerOk = tryReach "http://127.0.0.1:8765/health"

                let manifestPath = Path.Combine(repoRoot, "config", "models.manifest.json")
                let manifestExists = File.Exists manifestPath

                return
                    {| ollamaReachable = ollamaOk
                       workerReachable = workerOk
                       manifestPath = manifestPath
                       manifestExists = manifestExists |}
            }

        interface IDisposable with
            member _.Dispose() = http.Dispose()

module Bootstrap =
    type BootstrapService
        (
            repoRoot: string,
            events: JobEventHub,
            modelSync: ModelSync.ModelSyncService,
            ollama: OllamaProvider.OllamaProvider,
            worker: PythonWorkerProvider.PythonWorkerProvider,
            gpu: GpuQueueService
        ) =
        let warmupMarkerPath = Path.Combine(repoRoot, ".lmvs", "warmup_complete")
        let runSetupScript (scriptName: string, args: string) =
            task {
                let script = Path.Combine(repoRoot, "scripts", scriptName)

                if not (File.Exists script) then
                    return Error $"{scriptName} not found"
                else
                    let psi = ProcessStartInfo()
                    psi.FileName <- "powershell.exe"
                    psi.Arguments <- $"-NoProfile -ExecutionPolicy Bypass -File \"{script}\" {args}"
                    psi.RedirectStandardOutput <- true
                    psi.RedirectStandardError <- true
                    psi.UseShellExecute <- false
                    psi.CreateNoWindow <- true
                    psi.WorkingDirectory <- repoRoot

                    use proc = Process.Start psi
                    let stdout = proc.StandardOutput.ReadToEnd()
                    let stderr = proc.StandardError.ReadToEnd()
                    proc.WaitForExit()

                    if proc.ExitCode = 0 then
                        return Ok stdout
                    else
                        let detail =
                            if String.IsNullOrWhiteSpace stderr then stdout else stderr

                        return Error detail
            }

        let ffmpegAvailable () =
            FfmpegExport.findFfmpegForBootstrap repoRoot |> Option.isSome

        member _.RunBootstrap() =
            task {
                let jobId = Guid.NewGuid()
                let steps =
                    [ "preflight", "Checking system requirements…"
                      "conflicts", "Scanning for GPU conflicts…"
                      "ollama", "Verifying Ollama…"
                      "python", "Verifying Python worker…"
                      "models", "Syncing model catalog…"
                      "sidecars", "Checking sidecar health…"
                      "ffmpeg", "Verifying FFmpeg…"
                      "warmup", "GPU warmup (optional)…"
                      "done", "Bootstrap complete" ]

                let total = steps.Length

                for i, (step, message) in steps |> List.indexed do
                    events.Publish(
                        { JobEvent.create jobId Bootstrap step message Running with
                            StepIndex = Some i
                            StepTotal = Some total
                            Hardware =
                                if step = "warmup" then Some "gpu"
                                elif step = "models" then Some "network"
                                else Some "cpu" }
                    )

                    match step with
                    | "conflicts" ->
                        let conflicts = ConflictScan.ConflictScanService repoRoot

                        match conflicts.RunScan() with
                        | Ok doc ->
                            let count =
                                match doc.TryGetProperty("conflicts") with
                                | true, arr -> arr.GetArrayLength()
                                | _ -> 0

                            let msg =
                                if count = 0 then
                                    "No competing GPU apps detected"
                                else
                                    $"Advisory: {count} competing GPU app(s) detected"

                            events.Publish(
                                JobEvent.create jobId Bootstrap "conflicts" msg Running
                            )
                        | Error err ->
                            events.Publish(
                                JobEvent.create jobId Bootstrap "conflicts" $"Scan skipped: {err}" Running
                            )
                    | "ollama" ->
                        let! health = ollama.HealthCheck()

                        if not health.Reachable then
                            events.Publish(
                                JobEvent.create jobId Bootstrap "ollama_setup" "Running setup-ollama.ps1…" Running
                            )

                            let! setup = runSetupScript ("setup-ollama.ps1", "")

                            match setup with
                            | Error err ->
                                events.Publish(
                                    JobEvent.create jobId Bootstrap "ollama_missing" $"Ollama setup: {err}" Running
                                )
                            | Ok _ ->
                                let! recheck = ollama.HealthCheck()

                                if not recheck.Reachable then
                                    events.Publish(
                                        JobEvent.create jobId Bootstrap "ollama_missing" "Ollama not running (install on first run)" Running
                                    )
                    | "python" ->
                        let! health = worker.HealthCheck()

                        if not health.Reachable then
                            events.Publish(
                                JobEvent.create jobId Bootstrap "python_setup" "Running setup-python.ps1…" Running
                            )

                            let! setup = runSetupScript ("setup-python.ps1", "-SkipSidecar")

                            match setup with
                            | Error err ->
                                events.Publish(
                                    JobEvent.create jobId Bootstrap "worker_missing" $"Python setup: {err}" Running
                                )
                            | Ok _ -> ()
                    | "models" ->
                        let! syncResult = modelSync.RunCheck()

                        match syncResult with
                        | Error err ->
                            events.Publish(
                                JobEvent.create jobId Bootstrap "models_check" $"Model catalog issues: {err}" Running
                            )
                        | Ok _ -> ()
                    | "sidecars" ->
                        let! status = modelSync.GetStatus()

                        if not status.workerReachable then
                            events.Publish(
                                JobEvent.create jobId Bootstrap "sidecar" "Worker offline — start sidecars/lmvs_worker/run_worker.cmd" Running
                            )
                    | "ffmpeg" ->
                        if not (ffmpegAvailable ()) then
                            events.Publish(
                                JobEvent.create jobId Bootstrap "ffmpeg" "FFmpeg not found (Ken Burns export unavailable)" Running
                            )
                    | "warmup" ->
                        let! health = worker.HealthCheck()

                        if health.Reachable && (health.Rocm |> Option.defaultValue false) then
                            try
                                let! _ =
                                    gpu.RunJob(
                                        LMVideoStudio.Domain.GpuJobKind.ImageGenerate,
                                        fun () ->
                                            worker.GenerateImage
                                                { Prompt = "warmup test frame, simple gradient"
                                                  Width = 256
                                                  Height = 256
                                                  Steps = 8
                                                  Seed = 0 }
                                    )

                                let markerDir = Path.GetDirectoryName warmupMarkerPath

                                if not (String.IsNullOrEmpty markerDir) then
                                    Directory.CreateDirectory markerDir |> ignore

                                File.WriteAllText(warmupMarkerPath, DateTimeOffset.UtcNow.ToString("O"))

                                events.Publish(
                                    JobEvent.create jobId Bootstrap "warmup_done" "GPU warmup complete (SD cold compile done)" Completed
                                )
                            with ex ->
                                events.Publish(
                                    JobEvent.create jobId Bootstrap "warmup_skip" $"GPU warmup skipped: {ex.Message}" Running
                                )
                    | _ -> ()

                    do! Task.Delay 100

                events.Publish(
                    { JobEvent.create jobId Bootstrap "done" "Bootstrap complete" Completed with
                        StepIndex = Some (total - 1)
                        StepTotal = Some total }
                )

                return jobId
            }

        member _.GetSystemStatus() =
            task {
                let! modelStatus = modelSync.GetStatus()
                let! ollamaHealth = ollama.HealthCheck()
                let! workerHealth = worker.HealthCheck()
                let conflictsScript = Path.Combine(repoRoot, "scripts", "detect_gpu_conflicts.ps1")

                let workerDevice =
                    if workerHealth.Reachable then
                        Some
                            {| rocm = workerHealth.Rocm |> Option.defaultValue false
                               vramGb = workerHealth.VramGb
                               deviceName = workerHealth.DeviceName |}
                    else
                        None

                return
                    {| host = "ok"
                       ollama = ollamaHealth.Reachable
                       worker = workerHealth.Reachable
                       workerDevice = workerDevice
                       ffmpeg = ffmpegAvailable ()
                       conflictsScriptExists = File.Exists conflictsScript
                       warmupComplete = File.Exists warmupMarkerPath |}
            }

        member _.Repair() =
            task {
                let jobId = Guid.NewGuid()

                events.Publish(
                    JobEvent.create jobId Repair "start" "Repair setup started…" Running
                )

                let! _ = runSetupScript ("setup-ollama.ps1", "-PullOnly")
                let! _ = runSetupScript ("setup-python.ps1", "")
                let! sync = modelSync.RunPull()

                match sync with
                | Ok _ ->
                    events.Publish(
                        JobEvent.create jobId Repair "done" "Repair complete" Completed
                    )
                | Error err ->
                    events.Publish(
                        JobEvent.create jobId Repair "sync" err Failed
                    )

                return jobId
            }
