namespace LMVideoStudio.Host.Tests

open System
open System.Text.Json
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Host

module JobEventSseTests =
    let private parsePayload (json: string) =
        JsonDocument.Parse json

    let private baseEvent jobId phase step message status =
        { JobEvent.create jobId phase step message status with
            Timestamp = DateTimeOffset.Parse("2026-06-13T12:00:00.0000000+00:00") }

    [<Fact>]
    let ``Mockup preview progress SSE includes phase step and progress fields`` () =
        let jobId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        let evt =
            { baseEvent jobId JobPhase.MockupPreview "block" "Rendering block 1/2" JobStatus.Running with
                Progress = Some 0.5
                StepIndex = Some 1
                StepTotal = Some 2 }

        let json = JobEvent.toSsePayload evt
        let doc = parsePayload json
        let root = doc.RootElement

        root.GetProperty("jobId").GetString() |> should equal (jobId.ToString())
        root.GetProperty("phase").GetString() |> should equal "mockup_preview"
        root.GetProperty("step").GetString() |> should equal "block"
        root.GetProperty("status").GetString() |> should equal "running"
        root.GetProperty("progress").GetDouble() |> should equal 0.5
        root.GetProperty("stepIndex").GetInt32() |> should equal 1
        root.GetProperty("stepTotal").GetInt32() |> should equal 2
        root.TryGetProperty("hardware") |> fst |> should equal false
        root.TryGetProperty("elapsedMs") |> fst |> should equal false
        root.TryGetProperty("isColdRun") |> fst |> should equal false

    [<Fact>]
    let ``Bake progress SSE includes hardware elapsedMs and cold run flag`` () =
        let jobId = Guid.Parse("bbbbbbbb-cccc-dddd-eeee-ffffffffffff")
        let evt =
            { baseEvent jobId JobPhase.Bake "upscale" "Upscaling block 1/1 (GPU worker)…" JobStatus.Running with
                Hardware = Some "gpu"
                ElapsedMs = Some 4200L
                IsColdRun = Some true
                StepIndex = Some 0
                StepTotal = Some 3 }

        let json = JobEvent.toSsePayload evt
        let root = parsePayload(json).RootElement

        root.GetProperty("phase").GetString() |> should equal "bake"
        root.GetProperty("hardware").GetString() |> should equal "gpu"
        root.GetProperty("elapsedMs").GetInt64() |> should equal 4200L
        root.GetProperty("isColdRun").GetBoolean() |> should equal true

    [<Fact>]
    let ``Bake warm-run SSE omits isColdRun when not set`` () =
        let jobId = Guid.NewGuid()
        let evt =
            { baseEvent jobId JobPhase.Bake "done" "Bake complete" JobStatus.Completed with
                Hardware = Some "cpu"
                ElapsedMs = Some 900L
                IsColdRun = Some false }

        let json = JobEvent.toSsePayload evt
        let root = parsePayload(json).RootElement

        root.GetProperty("isColdRun").GetBoolean() |> should equal false
        root.GetProperty("hardware").GetString() |> should equal "cpu"
        root.GetProperty("elapsedMs").GetInt64() |> should equal 900L

    [<Fact>]
    let ``SSE payload escapes quotes in message`` () =
        let jobId = Guid.NewGuid()
        let evt = baseEvent jobId JobPhase.MockupPreview "start" "Stitching \"demo\" blocks…" JobStatus.Running
        let json = JobEvent.toSsePayload evt
        json.Contains("\\\"demo\\\"") |> should equal true
        let root = parsePayload(json).RootElement
        root.GetProperty("message").GetString() |> should equal "Stitching \"demo\" blocks…"
