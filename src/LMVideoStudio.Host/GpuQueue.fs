namespace LMVideoStudio.Host

open System
open System.Collections.Concurrent
open System.Diagnostics
open System.IO
open System.Threading
open System.Threading.Tasks
open LMVideoStudio.Domain

type SingleFlightGpuQueue() =
    let queue = ConcurrentQueue<GpuJobRequest>()
    let current = ref None
    let lockObj = obj ()

    interface IGpuJobQueue with
        member _.Enqueue request =
            async {
                queue.Enqueue request
                return request
            }

        member _.TryDequeue() =
            lock lockObj (fun () ->
                match !current with
                | Some _ -> None
                | None ->
                    match queue.TryDequeue() with
                    | true, job ->
                        current := Some job
                        Some job
                    | false, _ -> None)

        member _.Current = !current

        member _.CompleteCurrent status =
            lock lockObj (fun () ->
                current := None
                ignore status)

type GpuQueueService(queue: IGpuJobQueue, worker: PythonWorkerProvider.PythonWorkerProvider, repoRoot: string) =
    let gate = new SemaphoreSlim(1, 1)
    let warmupMarkerPath = Path.Combine(repoRoot, ".lmvs", "warmup_complete")

    let coldTimeout = TimeSpan.FromSeconds 300.0
    let warmTimeout = TimeSpan.FromSeconds 120.0

    let isWarmRun () = File.Exists warmupMarkerPath

    let timeoutForKind (kind: GpuJobKind) =
        match kind with
        | GpuJobKind.ImageGenerate when isWarmRun () -> warmTimeout
        | GpuJobKind.ImageUpscale when isWarmRun () -> warmTimeout
        | GpuJobKind.AudioGenerate -> warmTimeout
        | _ when isWarmRun () -> warmTimeout
        | _ -> coldTimeout

    let logTiming (kind: GpuJobKind) (started: DateTimeOffset) (status: string) (ex: exn option) =
        let elapsed = DateTimeOffset.UtcNow - started
        let warm = isWarmRun ()
        let label = $"{kind}"

        match ex with
        | Some e ->
            Trace.WriteLine(
                $"[gpu-queue] {label} {status} elapsedMs={(int elapsed.TotalMilliseconds)} warm={warm} error={e.Message}"
            )
        | None ->
            Trace.WriteLine(
                $"[gpu-queue] {label} {status} elapsedMs={(int elapsed.TotalMilliseconds)} warm={warm}"
            )

    member _.IsWarmRun() = isWarmRun()

    member _.WarmupMarkerPath = warmupMarkerPath

    member _.Enqueue(kind: GpuJobKind, ?profile: HardwareProfile) =
        let request =
            { Id = Guid.NewGuid()
              Kind = kind
              Profile = defaultArg profile HardwareProfile.defaultProfile
              EnqueuedAt = DateTimeOffset.UtcNow }

        queue.Enqueue request

    member _.Status() =
        {| current = queue.Current
           queuedHint = "single-flight"
           warmRun = isWarmRun() |}

    /// Serialize GPU worker calls (SD / Real-ESRGAN / TTS) and unload VRAM between jobs.
    member _.RunJob<'T>(kind: GpuJobKind, work: unit -> Task<'T>) : Task<'T> =
        task {
            let! _ = gate.WaitAsync()
            let started = DateTimeOffset.UtcNow
            let warm = isWarmRun ()
            let timeout = timeoutForKind kind

            try
                let! _ =
                    queue
                        .Enqueue
                            { Id = Guid.NewGuid()
                              Kind = kind
                              Profile = HardwareProfile.defaultProfile
                              EnqueuedAt = started }
                    |> Async.StartAsTask

                use cts = new CancellationTokenSource(timeout)

                try
                    let workTask = work ()
                    let! completed = Task.WhenAny(workTask, Task.Delay(Timeout.InfiniteTimeSpan, cts.Token))

                    if completed = workTask then
                        let! result = workTask
                        queue.CompleteCurrent Completed
                        logTiming kind started "completed" None
                        return result
                    else
                        queue.CompleteCurrent Failed
                        logTiming kind started "timeout" None

                        let warmLabel = if warm then "warm" else "cold"

                        return
                            raise (
                                TimeoutException(
                                    $"GPU job {kind} exceeded {(int timeout.TotalSeconds)}s ({warmLabel} limit)"
                                )
                            )
                with ex ->
                    queue.CompleteCurrent Failed
                    logTiming kind started "failed" (Some ex)
                    return raise ex
            finally
                try
                    worker.UnloadAll().GetAwaiter().GetResult() |> ignore
                with _ ->
                    ()

                gate.Release() |> ignore
        }
