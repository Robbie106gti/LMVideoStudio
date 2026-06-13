namespace LMVideoStudio.Host

open System
open System.IO
open System.Text.Json
open Json.Schema
open LMVideoStudio.Domain

module ProjectStore =
    let ProjectFileName = "project.lmvs.json"

    type ProjectSummary =
        { Id: Guid
          Name: string
          Path: string
          UpdatedAt: DateTimeOffset option
          BlockCount: int }

    type ProjectStore(repoRoot: string, schemaPath: string) =
        let schema =
            lazy
                try
                    if File.Exists schemaPath then
                        Some(JsonSchema.FromText(File.ReadAllText schemaPath))
                    else
                        None
                with _ ->
                    None

        let projectsRoot =
            let env = Environment.GetEnvironmentVariable("LMVS_PROJECTS_ROOT")

            if not (String.IsNullOrWhiteSpace env) then
                env
            else
                Path.Combine(
                    Environment.GetFolderPath Environment.SpecialFolder.LocalApplicationData,
                    "LMVideoStudio",
                    "projects"
                )

        let projectFolder (projectId: Guid) =
            Path.Combine(projectsRoot, projectId.ToString("N"))

        let projectFile (projectId: Guid) =
            Path.Combine(projectFolder projectId, ProjectFileName)

        member _.ProjectsRoot = projectsRoot

        member _.EnsureRoot() =
            Directory.CreateDirectory projectsRoot |> ignore

        member _.ValidateJson(json: string) =
            match schema.Force() with
            | None -> Ok json
            | Some s ->
                try
                    let result = s.Evaluate(JsonDocument.Parse(json).RootElement)

                    if result.IsValid then
                        Ok json
                    else
                        let details =
                            result.Errors |> Seq.map (fun e -> e.Value.ToString()) |> Seq.toList

                        Error(String.Join("; ", details))
                with _ ->
                    Ok json

        member this.Load(projectId: Guid) =
            let file = projectFile projectId

            if not (File.Exists file) then
                Error $"Project not found: {projectId}"
            else
                let json = File.ReadAllText file

                match this.ValidateJson json with
                | Error err -> Error err
                | Ok _ ->
                    match Json.decodeProject json with
                    | Ok project -> Ok project
                    | Error err -> Error err

        member this.Save(project: Project) =
            this.EnsureRoot()
            let folder = projectFolder project.Id
            Directory.CreateDirectory folder |> ignore
            Directory.CreateDirectory (Path.Combine(folder, "assets")) |> ignore
            Directory.CreateDirectory (Path.Combine(folder, "renders", "mockup")) |> ignore
            Directory.CreateDirectory (Path.Combine(folder, "renders", "bake")) |> ignore

            let json = Json.encodeProject (Project.touch project)

            match this.ValidateJson json with
            | Error err -> Error err
            | Ok _ ->
                File.WriteAllText(projectFile project.Id, json)
                Ok()

        member this.List() =
            this.EnsureRoot()

            if not (Directory.Exists projectsRoot) then
                []
            else
                Directory.GetDirectories projectsRoot
                |> Array.choose (fun dir ->
                    let file = Path.Combine(dir, ProjectFileName)

                    if File.Exists file then
                        match Json.decodeProject (File.ReadAllText file) with
                        | Ok project ->
                            Some
                                { Id = project.Id
                                  Name = project.Name
                                  Path = dir
                                  UpdatedAt = project.UpdatedAt
                                  BlockCount = project.Blocks.Length }
                        | Error _ -> None
                    else
                        None)
                |> Array.toList

        member this.Create(name: string) =
            let project = Project.create name

            match this.Save project with
            | Ok () -> Ok project
            | Error err -> Error err

        member this.Delete(projectId: Guid) =
            let folder = projectFolder projectId

            if Directory.Exists folder then
                Directory.Delete(folder, true)
                Ok()
            else
                Error $"Project not found: {projectId}"

        member this.ImportAsset(projectId: Guid, fileName: string, bytes: byte[]) =
            match this.Load projectId with
            | Error err -> Error err
            | Ok project ->
                let assetsDir = Path.Combine(projectFolder projectId, "assets")
                Directory.CreateDirectory assetsDir |> ignore
                let safeName = Path.GetFileName fileName
                let dest = Path.Combine(assetsDir, safeName)
                File.WriteAllBytes(dest, bytes)
                let relPath = $"assets/{safeName}"

                let block =
                    { Id = Guid.NewGuid()
                      Order = project.Blocks.Length
                      Title = Some(Path.GetFileNameWithoutExtension safeName)
                      Source = BlockSource.Imported
                      ThumbnailPath = Some relPath
                      ImagePrompt = None
                      VoiceoverScript = None
                      DirectorNotes = None
                      MoodTags = []
                      MockupDurationSec = None
                      BakeDurationSec = None
                      Transitions = project.TransitionsDefault
                      Audio = None
                      Generation = None
                      Artifacts = None }

                let updated =
                    { project with Blocks = project.Blocks @ [ block ] }
                    |> Project.touch

                match this.Save updated with
                | Ok () -> Ok(block, updated)
                | Error err -> Error err

        member this.UpdateBlocks(projectId: Guid, blocks: StoryboardBlock list) =
            match this.Load projectId with
            | Error err -> Error err
            | Ok project ->
                let ordered =
                    blocks
                    |> List.sortBy (fun b -> b.Order)
                    |> List.mapi (fun i b -> { b with Order = i })

                let updated = { project with Blocks = ordered } |> Project.touch

                match this.Save updated with
                | Ok () -> Ok updated
                | Error err -> Error err

        member this.ReorderBlocks(projectId: Guid, blockIds: Guid list) =
            match this.Load projectId with
            | Error err -> Error err
            | Ok project ->
                let updated = Project.reorderBlocks project blockIds

                match this.Save updated with
                | Ok () -> Ok updated
                | Error err -> Error err

        member _.ProjectFolder(projectId: Guid) = projectFolder projectId

        member this.UpdateBlock(projectId: Guid, blockId: Guid, mutate: StoryboardBlock -> StoryboardBlock) =
            match this.Load projectId with
            | Error err -> Error err
            | Ok project ->
                let found =
                    project.Blocks |> List.exists (fun b -> b.Id = blockId)

                if not found then
                    Error $"Block not found: {blockId}"
                else
                    let updated =
                        { project with
                            Blocks =
                                project.Blocks
                                |> List.map (fun b -> if b.Id = blockId then mutate b else b) }
                        |> Project.touch

                    match this.Save updated with
                    | Ok () -> Ok updated
                    | Error err -> Error err

        member this.ImportBlockAudio(projectId: Guid, blockId: Guid, fileName: string, bytes: byte[]) =
            match this.Load projectId with
            | Error err -> Error err
            | Ok project ->
                match project.Blocks |> List.tryFind (fun b -> b.Id = blockId) with
                | None -> Error $"Block not found: {blockId}"
                | Some block ->
                    let assetsDir = Path.Combine(projectFolder projectId, "assets", "audio")
                    Directory.CreateDirectory assetsDir |> ignore
                    let safeName = Path.GetFileName fileName
                    let dest = Path.Combine(assetsDir, safeName)
                    File.WriteAllBytes(dest, bytes)
                    let relPath = $"assets/audio/{safeName}"

                    let durationSec =
                        MediaProbe.probeAudioDurationSec repoRoot dest |> Result.toOption

                    let audio =
                        { Path = Some relPath
                          Source = AudioSource.Imported
                          MockupQuality = Rough }

                    let updatedBlock =
                        { block with
                            Audio = Some audio
                            MockupDurationSec =
                                durationSec
                                |> Option.orElse block.MockupDurationSec
                            BakeDurationSec =
                                durationSec
                                |> Option.orElse block.BakeDurationSec }

                    let updated =
                        { project with
                            Blocks =
                                project.Blocks
                                |> List.map (fun b -> if b.Id = blockId then updatedBlock else b) }
                        |> Project.touch

                    match this.Save updated with
                    | Ok () -> Ok(updatedBlock, updated)
                    | Error err -> Error err

        member this.ImportStylePackLogo(projectId: Guid, fileName: string, bytes: byte[]) =
            match this.Load projectId with
            | Error err -> Error err
            | Ok project ->
                let styleDir = Path.Combine(projectFolder projectId, "assets", "style")
                Directory.CreateDirectory styleDir |> ignore
                let safeName = Path.GetFileName fileName
                let dest = Path.Combine(styleDir, safeName)
                File.WriteAllBytes(dest, bytes)

                match MediaProbe.extractDominantColors repoRoot dest 5 with
                | Error err -> Error err
                | Ok colors ->
                    let stylePack =
                        { DominantColors = colors
                          AspectRatio = None
                          Notes = Some $"Imported from {safeName}" }

                    let updated =
                        { project with StylePack = Some stylePack }
                        |> Project.touch

                    match this.Save updated with
                    | Ok () -> Ok(updated, stylePack)
                    | Error err -> Error err

        member _.ResolveRepoPath(relativePath: string) =
            Path.Combine(repoRoot, relativePath.Replace('/', Path.DirectorySeparatorChar))
