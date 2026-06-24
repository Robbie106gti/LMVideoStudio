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
        use temp = new TestCleanup.TempDirectory("lmvs-gpuq-")
        let repoRoot = temp.Path
        let markerDir = Path.Combine(repoRoot, ".lmvs")
        Directory.CreateDirectory markerDir |> ignore
        File.WriteAllText(Path.Combine(markerDir, "warmup_complete"), "ok")

        use worker = PythonWorkerProvider.PythonWorkerProvider("http://127.0.0.1:1")
        let gpu = GpuQueueService(SingleFlightGpuQueue(), worker, repoRoot)

        gpu.IsWarmRun() |> should equal true

    [<Fact>]
    let ``RunJob completes fast work and releases gate`` () =
        task {
            use temp = new TestCleanup.TempDirectory("lmvs-gpuq-")
            let repoRoot = temp.Path

            use worker = PythonWorkerProvider.PythonWorkerProvider("http://127.0.0.1:1")
            let gpu = GpuQueueService(SingleFlightGpuQueue(), worker, repoRoot)

            let! a = gpu.RunJob(GpuJobKind.AudioGenerate, fun () -> Task.FromResult 1)
            let! b = gpu.RunJob(GpuJobKind.AudioGenerate, fun () -> Task.FromResult 2)

            a |> should equal 1
            b |> should equal 2
        }
