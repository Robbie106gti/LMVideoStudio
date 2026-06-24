namespace LMVideoStudio.Host.Tests

open System
open System.IO

/// Safe filesystem cleanup helpers for integration tests.
module TestCleanup =
    let deleteDirectorySafe (path: string) =
        try
            if Directory.Exists path then
                Directory.Delete(path, recursive = true)
        with _ ->
            ()

    let deleteFileSafe (path: string) =
        try
            if File.Exists path then
                File.Delete path
        with _ ->
            ()

    type TempDirectory(prefix: string) =
        let path = Path.Combine(Path.GetTempPath(), prefix + Guid.NewGuid().ToString("N"))
        do Directory.CreateDirectory path |> ignore

        member _.Path = path

        interface IDisposable with
            member _.Dispose() = deleteDirectorySafe path

    let withTempDirectory prefix (f: string -> unit) =
        use temp = new TempDirectory(prefix)
        f temp.Path
