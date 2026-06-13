namespace LMVideoStudio.Host

open System
open System.Diagnostics
open System.IO
open System.Text.Json

module ConflictScan =
    type ConflictScanService(repoRoot: string) =
        member _.RunScan() =
            let script = Path.Combine(repoRoot, "scripts", "detect_gpu_conflicts.ps1")

            if not (File.Exists script) then
                Error $"Script not found: {script}"
            else
                let psi = ProcessStartInfo()
                psi.FileName <- "powershell.exe"
                psi.Arguments <- $"-NoProfile -ExecutionPolicy Bypass -File \"{script}\" -Json"
                psi.RedirectStandardOutput <- true
                psi.RedirectStandardError <- true
                psi.UseShellExecute <- false
                psi.CreateNoWindow <- true

                use proc = Process.Start psi
                let stdout = proc.StandardOutput.ReadToEnd()
                let stderr = proc.StandardError.ReadToEnd()
                proc.WaitForExit()

                if proc.ExitCode <> 0 && String.IsNullOrWhiteSpace stdout then
                    Error stderr
                else
                    try
                        Ok(JsonDocument.Parse(stdout).RootElement.Clone())
                    with ex ->
                        Error $"Invalid JSON from detect script: {ex.Message}"
