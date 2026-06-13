namespace LMVideoStudio.Host

open System
open System.IO
open System.Threading.Tasks
open LMVideoStudio.Domain

/// TTS / voiceover — calls worker /audio/generate when available, else writes a stub WAV.
module VoiceoverGeneration =
    type VoiceoverService(store: ProjectStore.ProjectStore, events: JobEventHub, worker: PythonWorkerProvider.PythonWorkerProvider, repoRoot: string) =
        let publish jobId step message status =
            events.Publish(JobEvent.create jobId JobPhase.AudioGenerate step message status)

        let stubWavBytes () =
            Convert.FromBase64String "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

        let saveAudio projectId blockId (bytes: byte[]) (ext: string) =
            let folder = store.ProjectFolder projectId
            let assetsDir = Path.Combine(folder, "assets")
            Directory.CreateDirectory assetsDir |> ignore
            let fileName = $"vo_{blockId:N}_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.{ext}"
            let dest = Path.Combine(assetsDir, fileName)
            File.WriteAllBytes(dest, bytes)
            $"assets/{fileName}"

        member _.GenerateVoiceover(projectId: Guid, blockId: Guid) =
            let jobId = Guid.NewGuid()

            Task.Run(fun () ->
                publish jobId "queued" "Voiceover generation queued" JobStatus.Running

                match store.Load projectId with
                | Error err -> publish jobId "load" err JobStatus.Failed
                | Ok project ->
                    match project.Blocks |> List.tryFind (fun b -> b.Id = blockId) with
                    | None ->
                        let msg = $"Block not found: {blockId}"
                        publish jobId "block" msg JobStatus.Failed
                    | Some block ->
                        let script =
                            block.VoiceoverScript
                            |> Option.filter (not << String.IsNullOrWhiteSpace)

                        match script with
                        | None ->
                            publish jobId "script" "voiceoverScript required" JobStatus.Failed
                        | Some text ->
                            publish jobId "worker" "Requesting TTS from worker…" JobStatus.Running

                            let audioResult =
                                worker.GenerateVoiceover(text).GetAwaiter().GetResult()

                            let bytes, ext =
                                match audioResult with
                                | Ok result -> Convert.FromBase64String result.AudioBase64, result.Format
                                | Error _ ->
                                    publish jobId "stub" "Worker TTS unavailable — using stub WAV" JobStatus.Running
                                    stubWavBytes (), "wav"

                            try
                                let relPath = saveAudio projectId blockId bytes ext
                                let fullPath = Path.Combine(store.ProjectFolder projectId, relPath.Replace('/', Path.DirectorySeparatorChar))

                                let durationResult = MediaProbe.probeAudioDurationSec repoRoot fullPath

                                let duration =
                                    match durationResult with
                                    | Ok d -> Some d
                                    | Error _ -> Some 3.5

                                let updatedBlock =
                                    { block with
                                        MockupDurationSec = duration
                                        Audio =
                                            Some
                                                { Path = Some relPath
                                                  Source = AudioSource.Generated
                                                  MockupQuality = Rough } }

                                let updatedProject =
                                    { project with
                                        Blocks =
                                            project.Blocks
                                            |> List.map (fun b -> if b.Id = blockId then updatedBlock else b) }
                                    |> Project.touch

                                match store.Save updatedProject with
                                | Error err -> publish jobId "save" err JobStatus.Failed
                                | Ok () -> publish jobId "done" "Voiceover audio saved" JobStatus.Completed
                            with ex ->
                                publish jobId "save" ex.Message JobStatus.Failed)
            |> ignore

            jobId
