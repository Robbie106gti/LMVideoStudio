namespace LMVideoStudio.Host

open System
open System.IO
open System.Text
open LMVideoStudio.Domain

/// Minimal FCP7 / Premiere Pro XML (xmeml subset) for handoff.
module PremiereExport =
    let BakeRelativePath = "renders/bake/final.mp4"

    let private timebaseForPreset =
        function
        | SequencePreset.Preset1080p24
        | SequencePreset.Preset4k24 -> 24
        | SequencePreset.Preset1080p25 -> 25
        | SequencePreset.Preset1080p30 -> 30
        | SequencePreset.Preset1080x1920Vertical
        | SequencePreset.Preset1080Square -> 24

    let private blockDurationFrames (project: Project) (block: StoryboardBlock) timebase =
        let seconds = Project.effectiveBakeDuration project block

        max 1 (int (Math.Round(seconds * float timebase)))

    let private xmlEscape (value: string) =
        value
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")

    let generate (projectFolder: string) (project: Project) =
        let timebase = timebaseForPreset project.SequencePreset
        let blocks = project.Blocks |> List.sortBy (fun b -> b.Order)

        let bakePath =
            Path.Combine(projectFolder, BakeRelativePath.Replace('/', Path.DirectorySeparatorChar))

        let fileUrl =
            let path =
                if File.Exists bakePath then bakePath
                else Path.Combine(projectFolder, "assets", "placeholder.mp4")

            Uri(path).AbsoluteUri

        let sb = StringBuilder()
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>") |> ignore
        sb.AppendLine("<xmeml version=\"4\">") |> ignore
        sb.AppendLine("  <sequence>") |> ignore
        sb.AppendLine($"    <name>{xmlEscape project.Name}</name>") |> ignore
        sb.AppendLine("    <rate>") |> ignore
        sb.AppendLine($"      <timebase>{timebase}</timebase>") |> ignore
        sb.AppendLine("      <ntsc>FALSE</ntsc>") |> ignore
        sb.AppendLine("    </rate>") |> ignore
        sb.AppendLine("    <media>") |> ignore
        sb.AppendLine("      <video>") |> ignore

        sb.AppendLine(
            $"        <format><samplecharacteristics><width>{project.RenderDefaults.Bake.Width}</width><height>{project.RenderDefaults.Bake.Height}</height></samplecharacteristics></format>"
        )
        |> ignore

        sb.AppendLine("        <track>") |> ignore

        let mutable frameCursor = 0

        for i, block in blocks |> List.indexed do
            let durationFrames = blockDurationFrames project block timebase
            let start = frameCursor
            let endFrame = start + durationFrames
            frameCursor <- endFrame

            let title =
                block.Title
                |> Option.defaultValue $"Block {i + 1}"
                |> xmlEscape

            sb.AppendLine("          <clipitem>") |> ignore
            sb.AppendLine($"            <name>{title}</name>") |> ignore
            sb.AppendLine("            <file>") |> ignore
            sb.AppendLine($"              <pathurl>{xmlEscape fileUrl}</pathurl>") |> ignore
            sb.AppendLine($"              <name>{xmlEscape (Path.GetFileName bakePath)}</name>") |> ignore
            sb.AppendLine("            </file>") |> ignore
            sb.AppendLine($"            <start>{start}</start>") |> ignore
            sb.AppendLine($"            <end>{endFrame}</end>") |> ignore
            sb.AppendLine("            <in>0</in>") |> ignore
            sb.AppendLine($"            <out>{durationFrames}</out>") |> ignore
            sb.AppendLine("          </clipitem>") |> ignore

        sb.AppendLine("        </track>") |> ignore
        sb.AppendLine("      </video>") |> ignore
        sb.AppendLine("    </media>") |> ignore
        sb.AppendLine("  </sequence>") |> ignore
        sb.AppendLine("</xmeml>") |> ignore
        sb.ToString()
