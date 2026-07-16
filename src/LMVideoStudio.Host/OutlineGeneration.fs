namespace LMVideoStudio.Host

open System
open System.Text.Json
open LMVideoStudio.Domain

module OutlineGeneration =
    type OutlineBlockDto =
        { Title: string
          VoiceoverScript: string
          ImagePrompt: string }

    type OutlineGenerationService(ollama: OllamaProvider.OllamaProvider) =
        let outlinePrompt (brief: string) =
            sprintf
                """You are a storyboard assistant. Read the brief and respond with ONLY a JSON array (no markdown).
Each item must have keys: title, voiceoverScript, imagePrompt.
Create 3 to 8 blocks as separate clips to stitch later (not one long generation).

Prompt rules (local AI video / LTX-style workflows):
- imagePrompt: geography and look for guide frames — subject, setting, lighting, mood.
- When a block continues motion from the prior clip, keep imagePrompt focused on action, camera, and pacing (not re-describing the whole scene).
- voiceoverScript: narration for this block only.
- Prefer simple camera moves; use a new block (cut) for location or angle changes instead of one complex transition.

Brief:
%s"""
                brief

        let parseOutline (text: string) : Result<OutlineBlockDto list, string> =
            let jsonText =
                let trimmed = text.Trim()

                if trimmed.StartsWith("```") then
                    trimmed.Replace("```json", "").Replace("```", "").Trim()
                else
                    trimmed

            try
                let doc = JsonDocument.Parse jsonText

                if doc.RootElement.ValueKind <> JsonValueKind.Array then
                    Error "Outline response must be a JSON array"
                else
                    let blocks =
                        doc.RootElement.EnumerateArray()
                        |> Seq.choose (fun el ->
                            try
                                Some
                                    { Title = el.GetProperty("title").GetString()
                                      VoiceoverScript = el.GetProperty("voiceoverScript").GetString()
                                      ImagePrompt = el.GetProperty("imagePrompt").GetString() }
                            with _ ->
                                None)
                        |> Seq.toList

                    if List.isEmpty blocks then
                        Error "No valid blocks in outline JSON"
                    else
                        Ok blocks
            with ex ->
                Error $"Invalid outline JSON: {ex.Message}"

        member _.Generate(brief: string) =
            task {
                if String.IsNullOrWhiteSpace brief then
                    return Error "Brief is required"
                else
                    let! result = ollama.GenerateStub(outlinePrompt brief)

                    return
                        match result with
                        | Error err -> Error err
                        | Ok text -> parseOutline text
            }

        member _.ApplyToProject (project: Project) (blocks: OutlineBlockDto list) (brief: string) =
            let storyboardBlocks =
                blocks
                |> List.mapi (fun i dto ->
                    { Id = Guid.NewGuid()
                      Order = project.Blocks.Length + i
                      Title = Some dto.Title
                      Source = BlockSource.Generated
                      ThumbnailPath = None
                      ImagePrompt = Some dto.ImagePrompt
                      VoiceoverScript = Some dto.VoiceoverScript
                      DirectorNotes = None
                      MoodTags = []
                      ShotKind = None
                      MockupDurationSec = None
                      BakeDurationSec = None
                      Transitions = project.TransitionsDefault
                      Audio = None
                      Generation = None
                      Artifacts = None })

            { project with
                Brief = Some brief
                Blocks = project.Blocks @ storyboardBlocks }
            |> Project.touch
