namespace LMVideoStudio.Host.Tests

open System
open System.IO
open System.Threading.Tasks
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Host
open LMVideoStudio.Domain

module GpuQueueTests =
    [<Fact>]
    let ``IsWarmRun true when warmup marker present`` () =
        let repoRoot = Path.Combine(Path.GetTempPath(), "lmvs-gpuq-" + Guid.NewGuid().ToString("N"))
        Directory.CreateDirectory repoRoot |> ignore
        let markerDir = Path.Combine(repoRoot, ".lmvs")
        Directory.CreateDirectory markerDir |> ignore
        File.WriteAllText(Path.Combine(markerDir, "warmup_complete"), "ok")

        use worker = PythonWorkerProvider.PythonWorkerProvider("http://127.0.0.1:1")
        let gpu = GpuQueueService(SingleFlightGpuQueue(), worker, repoRoot)

        gpu.IsWarmRun() |> should equal true

        try
            Directory.Delete(repoRoot, recursive = true)
        with _ ->
            ()

    [<Fact>]
    let ``RunJob completes fast work and releases gate`` () =
        task {
            let repoRoot = Path.Combine(Path.GetTempPath(), "lmvs-gpuq-" + Guid.NewGuid().ToString("N"))
            Directory.CreateDirectory repoRoot |> ignore

            use worker = PythonWorkerProvider.PythonWorkerProvider("http://127.0.0.1:1")
            let gpu = GpuQueueService(SingleFlightGpuQueue(), worker, repoRoot)

            let! a = gpu.RunJob(GpuJobKind.AudioGenerate, fun () -> Task.FromResult 1)
            let! b = gpu.RunJob(GpuJobKind.AudioGenerate, fun () -> Task.FromResult 2)

            a |> should equal 1
            b |> should equal 2

            try
                Directory.Delete(repoRoot, recursive = true)
            with _ ->
                ()
        }
