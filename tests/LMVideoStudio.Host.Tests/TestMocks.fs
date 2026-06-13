namespace LMVideoStudio.Host.Tests

open System
open System.Net
open System.Net.Http
open System.Text
open System.Threading
open System.Threading.Tasks
open LMVideoStudio.Host

module TestMocks =
    let private tinyPngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

    type StubHttpHandler(respond: HttpRequestMessage -> HttpResponseMessage) =
        inherit HttpMessageHandler()

        override _.SendAsync(request: HttpRequestMessage, _ct: CancellationToken) =
            Task.FromResult(respond request)

    let jsonResponse (status: HttpStatusCode) (body: string) =
        let response = new HttpResponseMessage()
        response.StatusCode <- status
        response.Content <- new StringContent(body, Encoding.UTF8, "application/json")
        response

    let createWorkerProvider () =
        let handler =
            StubHttpHandler(fun req ->
                if req.Method = HttpMethod.Get && req.RequestUri.AbsolutePath.EndsWith("/health") then
                    jsonResponse HttpStatusCode.OK """{"rocm":false,"vram_gb":8}"""
                elif req.Method = HttpMethod.Post && req.RequestUri.AbsolutePath.Contains("/image/generate") then
                    jsonResponse
                        HttpStatusCode.OK
                        $"""{{"image_base64":"{tinyPngBase64}","width":640,"height":360}}"""
                else
                    jsonResponse HttpStatusCode.NotFound """{"error":"not found"}""")

        let client = new HttpClient(handler, disposeHandler = true)
        client.BaseAddress <- Uri("http://worker.test/")
        PythonWorkerProvider.PythonWorkerProvider("http://worker.test/", client)

    let createOllamaProvider (outlineJson: string) =
        let handler =
            StubHttpHandler(fun req ->
                if req.Method = HttpMethod.Get && req.RequestUri.AbsolutePath.EndsWith("/api/tags") then
                    jsonResponse HttpStatusCode.OK """{"models":[]}"""
                elif req.Method = HttpMethod.Post && req.RequestUri.AbsolutePath.EndsWith("/api/generate") then
                    let escaped = outlineJson.Replace("\\", "\\\\").Replace("\"", "\\\"")
                    jsonResponse HttpStatusCode.OK $"""{{"response":"{escaped}"}}"""
                else
                    jsonResponse HttpStatusCode.NotFound "{}")

        let client = new HttpClient(handler, disposeHandler = true)
        client.BaseAddress <- Uri("http://ollama.test/")
        OllamaProvider.OllamaProvider("http://ollama.test/", client)

    let sampleOutlineJson =
        """[{"title":"Hook","voiceoverScript":"Hello world","imagePrompt":"sunset cityscape"}]"""

    let installFfmpegStubs () =
        FfmpegExport.kenBurnsHook <-
            Some(fun opts _ct ->
                let dir = System.IO.Path.GetDirectoryName opts.OutputPath

                if not (String.IsNullOrEmpty dir) then
                    System.IO.Directory.CreateDirectory dir |> ignore

                System.IO.File.WriteAllBytes(opts.OutputPath, [| 0uy; 0uy; 0uy; 0uy |])

                { FfmpegExport.Success = true
                  OutputPath = Some opts.OutputPath
                  Message = "stub"
                  Args = [] })

        FfmpegExport.ffmpegHook <-
            Some(fun (args: string list) ->
                let dest =
                    args
                    |> List.filter (fun (a: string) -> a.EndsWith(".mp4"))
                    |> List.tryLast

                match dest with
                | Some dest ->
                    let dir = System.IO.Path.GetDirectoryName dest

                    if not (String.IsNullOrEmpty dir) then
                        System.IO.Directory.CreateDirectory dir |> ignore

                    System.IO.File.WriteAllBytes(dest, [| 0uy; 0uy; 0uy; 0uy |])
                    Ok "stub"
                | None -> Ok "stub")

    let clearFfmpegStubs () =
        FfmpegExport.kenBurnsHook <- None
        FfmpegExport.ffmpegHook <- None
        FfmpegExport.runProcessHook <- None
        FfmpegExport.findFfmpegOverride <- None
        FfmpegExport.processKillHook <- None
        FfmpegExport.killAllActiveHook <- None
        FfmpegExport.killAllActive()

    let installColorStub () =
        MediaProbe.colorExtractHook <-
            Some(fun _ _ -> Ok [ "#112233"; "#AABBCC" ])

    let clearColorStub () =
        MediaProbe.colorExtractHook <- None

    let clearAudioProbeStub () =
        MediaProbe.audioProbeHook <- None
