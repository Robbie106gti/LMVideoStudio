module LMVideoStudio.Client.JobUiLabels

let private titleCaseWords (s: string) =
    s.Split(' ')
    |> Array.map (fun w ->
        if w.Length = 0 then w
        else w.Substring(0, 1).ToUpperInvariant() + w.Substring(1).ToLowerInvariant())
    |> String.concat " "

/// Activity panel row title (includes CPU/GPU hint).
let activityPhaseTitle phase =
    match phase with
    | "mockup_preview" -> "Preview stitch (CPU FFmpeg)"
    | "image_generate" -> "Image generate (GPU worker)"
    | "model_sync" -> "Model sync"
    | "bootstrap" -> "Bootstrap"
    | "bake" -> "Bake export (CPU FFmpeg)"
    | "audio_generate" -> "Voiceover (GPU queue)"
    | other -> other.Replace('_', ' ') |> titleCaseWords

/// Footer status bar (short label).
let footerPhaseTitle phase =
    match phase with
    | "mockup_preview" -> "Preview stitch"
    | "image_generate" -> "Generate"
    | "model_sync" -> "Models"
    | "bootstrap" -> "Bootstrap"
    | "bake" -> "Bake"
    | "audio_generate" -> "Voiceover"
    | other -> other.Replace('_', ' ') |> titleCaseWords
