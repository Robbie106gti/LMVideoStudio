namespace LMVideoStudio.Host

open System
open System.Collections.Concurrent
open System.Threading
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

type GpuQueueService(queue: IGpuJobQueue) =
    member _.Enqueue(kind: GpuJobKind, ?profile: HardwareProfile) =
        let request =
            { Id = Guid.NewGuid()
              Kind = kind
              Profile = defaultArg profile HardwareProfile.defaultProfile
              EnqueuedAt = DateTimeOffset.UtcNow }

        (queue :> IGpuJobQueue).Enqueue request

    member _.Status() =
        {| current = (queue :> IGpuJobQueue).Current
           queuedHint = "single-flight" |}
