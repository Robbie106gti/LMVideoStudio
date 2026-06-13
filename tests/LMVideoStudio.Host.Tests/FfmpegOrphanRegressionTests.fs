namespace LMVideoStudio.Host.Tests

open System
open System.Diagnostics
open System.IO
open System.Net
open System.Net.Http
open System.Net.Http.Headers
open System.Text
open System.Text.Json
open System.Threading
open System.Threading.Tasks
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Host
open LMVideoStudio.Host.Program

module FfmpegOrphanRegressionTests =
    let private repoRoot =
        Path.Combine(Path.GetTempPath(), "lmvs-ffmpeg-tests")

    let private testShellExe = "pwsh"

    let private startSlowTrackedProcess () =
        let psi = ProcessStartInfo()
        psi.FileName <- testShellExe
        psi.Arguments <- "-NoProfile -Command Start-Sleep -Seconds 30"
        psi.UseShellExecute <- false
        psi.CreateNoWindow <- true
        let proc = Process.Start psi
        FfmpegExport.registerActiveProcessForTests proc
        proc

    let private resetFfmpegTestHooks () =
        FfmpegExport.runProcessHook <- None
        FfmpegExport.findFfmpegOverride <- None
        FfmpegExport.processKillHook <- None
        FfmpegExport.killAllActiveHook <- None
        FfmpegExport.kenBurnsHook <- None
        FfmpegExport.ffmpegHook <- None
        FfmpegExport.killAllActive()

    let private createProjectWithBlock (fixture: TestHostFactory.TestHostFixture) name =
        task {
            let content = new StringContent($"{{\"name\":\"{name}\"}}", Encoding.UTF8, "application/json")
            let! createResponse = fixture.Client.PostAsync("/projects", content)
            createResponse.EnsureSuccessStatusCode() |> ignore
            let! createBody = createResponse.Content.ReadAsStringAsync()
            let projectId = JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid()

            use multipart = new MultipartFormDataContent()
            let pngBytes = [| 0x89uy; 0x50uy; 0x4Euy; 0x47uy; 0x0Duy; 0x0Auy; 0x1Auy; 0x0Auy |]
            let fileContent = new ByteArrayContent(pngBytes)
            fileContent.Headers.ContentType <- MediaTypeHeaderValue("image/png")
            multipart.Add(fileContent, "file", "frame.png")
            let! _ = fixture.Client.PostAsync($"/projects/{projectId}/blocks/import", multipart)
            return projectId
        }

    let private waitJobTerminal (ch: System.Threading.Channels.Channel<JobEvent>) (timeoutMs: int) =
        task {
            let events = ResizeArray<JobEvent>()
            let deadline = DateTime.UtcNow.AddMilliseconds(float timeoutMs)

            let rec loop () =
                task {
                    if DateTime.UtcNow >= deadline then
                        return events |> Seq.toList
                    else
                        let delay = Task.Delay 50
                        let read = ch.Reader.ReadAsync().AsTask()
                        let! winner = Task.WhenAny(read, delay)

                        if winner = read then
                            let! evt = read
                            events.Add evt

                            if evt.Status = JobStatus.Completed || evt.Status = JobStatus.Failed || evt.Status = JobStatus.Cancelled then
                                return events |> Seq.toList
                            else
                                return! loop ()
                        else
                            return! loop ()
                }

            return! loop ()
        }

    let private waitForBothJobs (ch: System.Threading.Channels.Channel<JobEvent>) (firstJobId: Guid) (secondJobId: Guid) (timeoutMs: int) =
        task {
            let firstEvents = ResizeArray<JobEvent>()
            let secondEvents = ResizeArray<JobEvent>()
            let deadline = DateTime.UtcNow.AddMilliseconds(float timeoutMs)

            let firstDone () =
                firstEvents
                |> Seq.exists (fun e ->
                    e.Status = JobStatus.Completed || e.Status = JobStatus.Failed || e.Status = JobStatus.Cancelled)

            let secondDone () =
                secondEvents
                |> Seq.exists (fun e ->
                    e.Status = JobStatus.Completed || e.Status = JobStatus.Failed || e.Status = JobStatus.Cancelled)

            let rec loop () =
                task {
                    if firstDone () && secondDone () then
                        return firstEvents |> Seq.toList, secondEvents |> Seq.toList
                    elif DateTime.UtcNow >= deadline then
                        return firstEvents |> Seq.toList, secondEvents |> Seq.toList
                    else
                        let delay = Task.Delay 50
                        let read = ch.Reader.ReadAsync().AsTask()
                        let! winner = Task.WhenAny(read, delay)

                        if winner = read then
                            let! evt = read

                            if evt.JobId = firstJobId then
                                firstEvents.Add evt
                            elif evt.JobId = secondJobId then
                                secondEvents.Add evt

                            return! loop ()
                        else
                            return! loop ()
                }

            return! loop ()
        }

    let private waitForJobStep (ch: System.Threading.Channels.Channel<JobEvent>) (jobId: Guid) (step: string) (timeoutMs: int) =
        task {
            let deadline = DateTime.UtcNow.AddMilliseconds(float timeoutMs)

            let rec loop () =
                task {
                    if DateTime.UtcNow >= deadline then
                        return failwith $"job {jobId} did not reach step {step} within {timeoutMs}ms"

                    let delay = Task.Delay 25
                    let read = ch.Reader.ReadAsync().AsTask()
                    let! winner = Task.WhenAny(read, delay)

                    if winner = read then
                        let! evt = read

                        if evt.JobId = jobId && evt.Step = step then
                            return ()
                        else
                            return! loop ()
                    else
                        return! loop ()
                }

            return! loop ()
        }

    [<Collection("HostSerial")>]
    type FfmpegExportLifecycleTests() =
        [<Fact>]
        let ``runProcess timeout kills child and clears registry`` () =
            let killCount = ref 0
            FfmpegExport.findFfmpegOverride <- Some testShellExe
            FfmpegExport.processKillHook <- Some (fun _ -> killCount := !killCount + 1)

            let runOpts =
                { FfmpegExport.defaultRunOptions with
                    TimeoutMs = 500
                    CancellationToken = CancellationToken.None }

            let result =
                FfmpegExport.runFfmpeg repoRoot [ "-NoProfile"; "-Command"; "Start-Sleep -Seconds 30" ] (Some runOpts)

            match result with
            | Error err ->
                (err : string).Contains("timed out") |> should equal true
                !killCount |> should be (greaterThan 0)
                FfmpegExport.trackedProcessCount() |> should equal 0
            | Ok _ -> failwith "expected timeout error"

        [<Fact>]
        let ``killAllActive clears tracked process registry`` () =
            let killCount = ref 0
            FfmpegExport.processKillHook <- Some (fun _ -> killCount := !killCount + 1)
            let proc = startSlowTrackedProcess ()

            try
                Thread.Sleep(250)
                FfmpegExport.trackedProcessCount() |> should be (greaterThan 0)
                FfmpegExport.killAllActive()
                !killCount |> should be (greaterThan 0)
                FfmpegExport.trackedProcessCount() |> should equal 0
            finally
                try
                    if not proc.HasExited then
                        proc.Kill(true)
                with _ ->
                    ()

        [<Fact>]
        let ``concurrent slow kenBurns hooks are not single-flight at export layer`` () =
            let concurrent = ref 0
            let maxConcurrent = ref 0
            let flightLock = obj ()
            FfmpegExport.kenBurnsHook <-
                Some(fun opts _ct ->
                    lock flightLock (fun () ->
                        concurrent := !concurrent + 1

                        if !concurrent > !maxConcurrent then
                            maxConcurrent := !concurrent)

                    Thread.Sleep(120)

                    lock flightLock (fun () ->
                        concurrent := !concurrent - 1)

                    let dir = Path.GetDirectoryName opts.OutputPath

                    if not (String.IsNullOrEmpty dir) then
                        Directory.CreateDirectory dir |> ignore

                    File.WriteAllBytes(opts.OutputPath, [| 0uy |])

                    { FfmpegExport.Success = true
                      OutputPath = Some opts.OutputPath
                      Message = "slow"
                      Args = [] })

            let opts: FfmpegExport.KenBurnsOptions =
                { InputPath = "in.png"
                  OutputPath = Path.Combine(Path.GetTempPath(), "lmvs-kb-" + Guid.NewGuid().ToString("N") + ".mp4")
                  Width = 640
                  Height = 360
                  Fps = 25
                  DurationSec = 1.0
                  ZoomStart = 1.0
                  ZoomEnd = 1.1 }

            let opts2 =
                { opts with
                    OutputPath = Path.Combine(Path.GetTempPath(), "lmvs-kb-" + Guid.NewGuid().ToString("N") + ".mp4") }

            let t1 =
                Task.Run(fun () -> FfmpegExport.runKenBurnsMockup repoRoot opts None)

            let t2 =
                Task.Run(fun () -> FfmpegExport.runKenBurnsMockup repoRoot opts2 None)

            Task.WaitAll([| t1 :> Task; t2 :> Task |], 10000) |> should equal true
            maxConcurrent.Value |> should be (greaterThan 1)

        interface IDisposable with
            member _.Dispose() = resetFfmpegTestHooks ()

    [<Collection("HostSerial")>]
    type ExportJobsCancelTests() =
        let overrides =
            { Worker = Some(TestMocks.createWorkerProvider())
              Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

        let fixture = TestHostFactory.TestHostFixture(Some overrides)

        [<Fact>]
        let ``second preview cancels first and keeps ffmpeg hook single-flight`` () =
            task {
                resetFfmpegTestHooks()
                TestMocks.installFfmpegStubs()

                let concurrent = ref 0
                let maxConcurrent = ref 0
                let hookCalls = ref 0

                FfmpegExport.kenBurnsHook <-
                    Some(fun opts ct ->
                        hookCalls := !hookCalls + 1
                        concurrent := !concurrent + 1

                        if !concurrent > !maxConcurrent then
                            maxConcurrent := !concurrent

                        if !hookCalls = 1 then
                            try
                                Task.Delay(500, ct).Wait(CancellationToken.None)
                            with _ ->
                                ()

                        if ct.IsCancellationRequested then
                            concurrent := !concurrent - 1

                            { FfmpegExport.Success = false
                              OutputPath = None
                              Message = "Ken Burns cancelled"
                              Args = [] }
                        else
                            let dir = Path.GetDirectoryName opts.OutputPath

                            if not (String.IsNullOrEmpty dir) then
                                Directory.CreateDirectory dir |> ignore

                            File.WriteAllBytes(opts.OutputPath, [| 0uy; 0uy; 0uy; 0uy |])
                            concurrent := !concurrent - 1

                            { FfmpegExport.Success = true
                              OutputPath = Some opts.OutputPath
                              Message = "slow stub"
                              Args = [] })

                FfmpegExport.ffmpegHook <-
                    Some(fun args ->
                        let dest =
                            args
                            |> List.filter (fun a -> a.EndsWith(".mp4"))
                            |> List.tryLast

                        match dest with
                        | Some dest ->
                            let dir = Path.GetDirectoryName dest

                            if not (String.IsNullOrEmpty dir) then
                                Directory.CreateDirectory dir |> ignore

                            File.WriteAllBytes(dest, [| 0uy; 0uy; 0uy; 0uy |])
                            Ok "stub"
                        | None -> Ok "stub")

                let! projectId = createProjectWithBlock fixture "Preview cancel"
                let eventCh = fixture.Services.Events.SubscribeGlobal()

                let jobId1 = fixture.Services.Preview.StartPreview projectId

                do! waitForJobStep eventCh jobId1 "block_1" 5000

                let jobId2 = fixture.Services.Preview.StartPreview projectId

                let! firstEvents, secondEvents = waitForBothJobs eventCh jobId1 jobId2 20000

                firstEvents |> List.exists (fun e -> e.Status = JobStatus.Cancelled) |> should equal true
                secondEvents |> List.exists (fun e -> e.Status = JobStatus.Completed) |> should equal true
                !maxConcurrent |> should equal 1
                (jobId1 = jobId2) |> should equal false
            }

        [<Fact>]
        let ``CancelActive kills tracked child processes`` () =
            resetFfmpegTestHooks()
            let killCount = ref 0
            FfmpegExport.processKillHook <- Some (fun _ -> killCount := !killCount + 1)
            let proc = startSlowTrackedProcess ()

            try
                Thread.Sleep(250)
                FfmpegExport.trackedProcessCount() |> should be (greaterThan 0)
                fixture.Services.Preview.CancelActive()
                !killCount |> should be (greaterThan 0)
                FfmpegExport.trackedProcessCount() |> should equal 0
            finally
                try
                    if not proc.HasExited then
                        proc.Kill(true)
                with _ ->
                    ()

        interface IDisposable with
            member _.Dispose() =
                resetFfmpegTestHooks ()
                (fixture :> IDisposable).Dispose()

    [<Collection("HostSerial")>]
    type ApplicationStoppingTests() =
        [<Fact>]
        let ``host shutdown invokes killAllActive`` () =
            let killAllCount = ref 0
            let killCount = ref 0
            FfmpegExport.killAllActiveHook <- Some (fun () -> killAllCount := !killAllCount + 1)
            FfmpegExport.processKillHook <- Some (fun _ -> killCount := !killCount + 1)

            let overrides =
                { Worker = Some(TestMocks.createWorkerProvider())
                  Ollama = Some(TestMocks.createOllamaProvider TestMocks.sampleOutlineJson) }

            let fixture = TestHostFactory.TestHostFixture(Some overrides)
            let proc = startSlowTrackedProcess ()

            try
                Thread.Sleep(250)
                (fixture :> IDisposable).Dispose()
                !killAllCount |> should be (greaterThan 0)
                !killCount |> should be (greaterThan 0)
                FfmpegExport.trackedProcessCount() |> should equal 0
            finally
                try
                    if not proc.HasExited then
                        proc.Kill(true)
                with _ ->
                    ()

                resetFfmpegTestHooks ()

    type DevScriptOrphanCleanupTests() =
        [<Fact>]
        let ``dev.ps1 parses and includes orphan ffmpeg cleanup`` () =
            let repoRoot = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", ".."))
            let scriptPath = Path.Combine(repoRoot, "scripts", "dev.ps1")
            File.Exists scriptPath |> should equal true
            let script = File.ReadAllText scriptPath
            let escapedPath = scriptPath.Replace("'", "''")

            let psi = ProcessStartInfo()
            psi.FileName <- "pwsh"
            psi.Arguments <-
                "-NoProfile -Command \"$errors = $null; $null = [System.Management.Automation.Language.Parser]::ParseFile('"
                + escapedPath
                + "', [ref]$null, [ref]$errors); if ($errors) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 } else { exit 0 }\""

            psi.RedirectStandardError <- true
            psi.RedirectStandardOutput <- true
            psi.UseShellExecute <- false
            use proc = Process.Start psi
            proc.WaitForExit 30000
            proc.ExitCode |> should equal 0
            script.Contains("function Stop-LmvsFfmpegChildren") |> should equal true
            script.Contains("Stop-LmvsFfmpegChildren") |> should equal true
            script.Contains("finally") |> should equal true
