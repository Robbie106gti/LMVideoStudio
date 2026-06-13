namespace LMVideoStudio.Host

open System
open System.Collections.Concurrent
open System.Threading.Channels
open LMVideoStudio.Domain

type JobPhase =
    | Bootstrap
    | Repair
    | Outline
    | ImageGenerate
    | ImageUpscale
    | AudioGenerate
    | Export
    | MockupPreview
    | Bake
    | ModelCatalogSync

module JobPhase =
    let toSchemaValue =
        function
        | Bootstrap -> "bootstrap"
        | Repair -> "repair"
        | Outline -> "outline"
        | ImageGenerate -> "image_generate"
        | ImageUpscale -> "image_upscale"
        | AudioGenerate -> "audio_generate"
        | Export -> "export"
        | MockupPreview -> "mockup_preview"
        | Bake -> "bake"
        | ModelCatalogSync -> "model_sync"

type JobStatus =
    | Pending
    | Running
    | Completed
    | Failed
    | Cancelled

module JobStatus =
    let toSchemaValue =
        function
        | Pending -> "pending"
        | Running -> "running"
        | Completed -> "completed"
        | Failed -> "failed"
        | Cancelled -> "cancelled"

type JobEvent =
    { JobId: Guid
      Phase: JobPhase
      Step: string
      StepIndex: int option
      StepTotal: int option
      Message: string
      Status: JobStatus
      Hardware: string option
      Progress: float option
      ElapsedMs: int64 option
      IsColdRun: bool option
      Error: string option
      Timestamp: DateTimeOffset }

module JobEvent =
    let create jobId phase step message status =
        { JobId = jobId
          Phase = phase
          Step = step
          StepIndex = None
          StepTotal = None
          Message = message
          Status = status
          Hardware = None
          Progress = None
          ElapsedMs = None
          IsColdRun = None
          Error = None
          Timestamp = DateTimeOffset.UtcNow }

    let private escape (s: string) =
        s.Replace("\\", "\\\\").Replace("\"", "\\\"")

    let toSsePayload (evt: JobEvent) =
        let sb = System.Text.StringBuilder()
        sb.Append("{") |> ignore
        sb.Append("\"jobId\":\"").Append(evt.JobId.ToString()).Append("\"") |> ignore
        sb.Append(",\"phase\":\"").Append(JobPhase.toSchemaValue evt.Phase).Append("\"") |> ignore
        sb.Append(",\"step\":\"").Append(escape evt.Step).Append("\"") |> ignore
        sb.Append(",\"message\":\"").Append(escape evt.Message).Append("\"") |> ignore
        sb.Append(",\"status\":\"").Append(JobStatus.toSchemaValue evt.Status).Append("\"") |> ignore
        sb.Append(",\"timestamp\":\"").Append(evt.Timestamp.ToString("O")).Append("\"") |> ignore

        evt.StepIndex
        |> Option.iter (fun i -> sb.Append(",\"stepIndex\":").Append(i) |> ignore)

        evt.StepTotal
        |> Option.iter (fun i -> sb.Append(",\"stepTotal\":").Append(i) |> ignore)

        evt.Hardware
        |> Option.iter (fun h -> sb.Append(",\"hardware\":\"").Append(h).Append("\"") |> ignore)

        evt.Progress
        |> Option.iter (fun p ->
            sb.Append(",\"progress\":")
                .Append(p.ToString(System.Globalization.CultureInfo.InvariantCulture))
            |> ignore)

        evt.ElapsedMs
        |> Option.iter (fun ms -> sb.Append(",\"elapsedMs\":").Append(ms) |> ignore)

        evt.IsColdRun
        |> Option.iter (fun b ->
            sb.Append(",\"isColdRun\":")
                .Append(if b then "true" else "false")
            |> ignore)

        evt.Error
        |> Option.iter (fun e -> sb.Append(",\"error\":\"").Append(escape e).Append("\"") |> ignore)

        sb.Append("}") |> ignore
        sb.ToString()

type JobEventHub() =
    let subscribers = ConcurrentDictionary<Guid, Channel<JobEvent>>()
    let globalSubscribers = ConcurrentBag<Channel<JobEvent>>()

    member _.Publish(evt: JobEvent) =
        for sub in globalSubscribers do
            sub.Writer.TryWrite evt |> ignore

        match subscribers.TryGetValue evt.JobId with
        | true, ch -> ch.Writer.TryWrite evt |> ignore
        | _ -> ()

    member _.SubscribeGlobal() =
        let ch = Channel.CreateUnbounded<JobEvent>()
        globalSubscribers.Add ch
        ch

    member _.Subscribe(jobId: Guid) =
        let ch = Channel.CreateUnbounded<JobEvent>()
        subscribers[jobId] <- ch
        ch

    member _.Unsubscribe(jobId: Guid) =
        subscribers.TryRemove jobId |> ignore
