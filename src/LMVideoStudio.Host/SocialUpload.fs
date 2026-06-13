namespace LMVideoStudio.Host

open System
open System.IO
open System.Net.Http
open System.Net.Http.Headers
open System.Text
open System.Text.Json

module SocialUpload =
    type UploadPlatform =
        | YouTube
        | Meta

    type SharePackUploadRequest =
        { Platform: UploadPlatform
          Title: string option
          Description: string option
          PageId: string option }

    type UploadValidationError =
        | MissingPlatform
        | UnknownPlatform of string
        | MissingSharePack
        | MissingVideo of string
        | NotConnected of string
        | MissingTitle
        | OAuthNotConfigured of string

    type UploadResult =
        { Platform: string
          VideoId: string option
          Url: string option
          Message: string }

    let parsePlatform (value: string) =
        if String.IsNullOrWhiteSpace value then
            Error MissingPlatform
        else
            match value.Trim().ToLowerInvariant() with
            | "youtube" -> Ok YouTube
            | "meta" | "facebook" -> Ok Meta
            | other -> Error(UnknownPlatform other)

    let validateUploadRequest (body: string) =
        if String.IsNullOrWhiteSpace body then
            Error MissingPlatform
        else
            try
                let doc = JsonDocument.Parse body
                let root = doc.RootElement

                let platformRaw =
                    if root.TryGetProperty("platform") |> fst then
                        root.GetProperty("platform").GetString()
                    else
                        null

                match parsePlatform platformRaw with
                | Error err -> Error err
                | Ok platform ->
                    let title =
                        if root.TryGetProperty("title") |> fst then
                            let v = root.GetProperty("title").GetString()

                            if String.IsNullOrWhiteSpace v then None else Some v
                        else
                            None

                    let description =
                        if root.TryGetProperty("description") |> fst then
                            let v = root.GetProperty("description").GetString()

                            if String.IsNullOrWhiteSpace v then None else Some v
                        else
                            None

                    let pageId =
                        if root.TryGetProperty("pageId") |> fst then
                            let v = root.GetProperty("pageId").GetString()

                            if String.IsNullOrWhiteSpace v then None else Some v
                        else
                            None

                    Ok
                        { Platform = platform
                          Title = title
                          Description = description
                          PageId = pageId }
            with _ ->
                Error MissingPlatform

    let validationErrorMessage =
        function
        | MissingPlatform -> "platform is required (youtube or meta)"
        | UnknownPlatform p -> $"Unknown platform: {p}"
        | MissingSharePack -> "Share pack not exported — export share pack first"
        | MissingVideo file -> $"Share pack video missing: {file}"
        | NotConnected p -> $"No connected {p} account — connect in Settings"
        | MissingTitle -> "title is required for upload"
        | OAuthNotConfigured p -> $"OAuth not configured for {p}"

    let private videoPathForPlatform (shareDir: string) platform =
        match platform with
        | YouTube -> Path.Combine(shareDir, "youtube_16x9.mp4")
        | Meta -> Path.Combine(shareDir, "reels_9x16.mp4")

    let private readCaption (shareDir: string) =
        let path = Path.Combine(shareDir, "caption.txt")

        if File.Exists path then
            File.ReadAllText(path, Encoding.UTF8).Trim()
        else
            ""

    let validateSharePackAssets (projectFolder: string) (request: SharePackUploadRequest) =
        let shareDir =
            Path.Combine(projectFolder, SharePackExport.SharePackRelativeDir.Replace('/', Path.DirectorySeparatorChar))

        if not (Directory.Exists shareDir) then
            Error MissingSharePack
        else
            let videoPath = videoPathForPlatform shareDir request.Platform

            if not (File.Exists videoPath) then
                Error(MissingVideo(Path.GetFileName videoPath))
            else
                Ok(shareDir, videoPath)

    let validateConnected (oauth: SocialOAuth.SocialOAuthService) (request: SharePackUploadRequest) : Result<OAuthTokenStore.StoredToken, UploadValidationError> =
        let providerName, oauthProvider =
            match request.Platform with
            | YouTube -> "youtube", SocialOAuth.YouTube
            | Meta -> "meta", SocialOAuth.Meta

        if not (SocialOAuth.isProviderConfigured oauth.Config oauthProvider) then
            Error(OAuthNotConfigured providerName)
        else
            match oauth.GetToken providerName with
            | Error err -> Error(NotConnected err)
            | Ok None -> Error(NotConnected providerName)
            | Ok(Some (token: OAuthTokenStore.StoredToken)) when String.IsNullOrWhiteSpace token.AccessToken ->
                Error(NotConnected providerName)
            | Ok(Some (token: OAuthTokenStore.StoredToken)) -> Ok token

    let private buildMetadataJson (title: string) (description: string) =
        let payload =
            {| snippet =
                {| title = title
                   description = description
                   categoryId = "22" |} |}

        JsonSerializer.Serialize payload

    let uploadYouTubeAsync (http: HttpClient) (accessToken: string) (videoPath: string) (title: string) (description: string) =
        task {
            let metadata = buildMetadataJson title description
            use initReq = new HttpRequestMessage(HttpMethod.Post, "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status")

            initReq.Headers.Authorization <- AuthenticationHeaderValue("Bearer", accessToken)
            initReq.Content <- new StringContent(metadata, Encoding.UTF8, "application/json")

            let! initResp = http.SendAsync initReq

            if not initResp.IsSuccessStatusCode then
                let! err = initResp.Content.ReadAsStringAsync()
                return Error $"YouTube upload init failed ({int initResp.StatusCode}): {err}"
            else
                match initResp.Headers.Location with
                | null ->
                    return Error "YouTube upload init missing resumable session URL"
                | uploadUrl ->
                    use stream = File.OpenRead videoPath
                    use uploadContent = new StreamContent(stream)
                    uploadContent.Headers.ContentType <- MediaTypeHeaderValue("video/mp4")

                    use uploadReq = new HttpRequestMessage(HttpMethod.Put, uploadUrl)
                    uploadReq.Content <- uploadContent

                    let! uploadResp = http.SendAsync uploadReq
                    let! body = uploadResp.Content.ReadAsStringAsync()

                    if not uploadResp.IsSuccessStatusCode then
                        return Error $"YouTube upload failed ({int uploadResp.StatusCode}): {body}"
                    else
                        try
                            let doc = JsonDocument.Parse body
                            let id = doc.RootElement.GetProperty("id").GetString()

                            return
                                Ok
                                    { Platform = "youtube"
                                      VideoId = Some id
                                      Url = Some $"https://www.youtube.com/watch?v={id}"
                                      Message = "Uploaded to YouTube" }
                        with _ ->
                            return
                                Ok
                                    { Platform = "youtube"
                                      VideoId = None
                                      Url = None
                                      Message = "Uploaded to YouTube" }
        }

    let uploadMetaAsync (http: HttpClient) (token: OAuthTokenStore.StoredToken) (videoPath: string) (title: string) (description: string) (pageIdOverride: string option) =
        task {
            let pageId =
                match pageIdOverride with
                | Some id when not (String.IsNullOrWhiteSpace id) -> id
                | _ -> token.PageId |> Option.defaultValue ""

            if String.IsNullOrWhiteSpace pageId then
                return Error "Meta upload requires a connected Facebook Page (reconnect Meta account)"
            else
                use form = new MultipartFormDataContent()

                form.Add(new StringContent(title), "title") |> ignore
                form.Add(new StringContent(description), "description") |> ignore
                form.Add(new StringContent(token.AccessToken), "access_token") |> ignore

                use stream = File.OpenRead videoPath
                use videoContent = new StreamContent(stream)
                videoContent.Headers.ContentType <- MediaTypeHeaderValue("video/mp4")
                form.Add(videoContent, "source", Path.GetFileName videoPath) |> ignore

                let url = $"https://graph-video.facebook.com/v19.0/{pageId}/videos"
                let! response = http.PostAsync(url, form)
                let! body = response.Content.ReadAsStringAsync()

                if not response.IsSuccessStatusCode then
                    return Error $"Meta upload failed ({int response.StatusCode}): {body}"
                else
                    try
                        let doc = JsonDocument.Parse body
                        let id = doc.RootElement.GetProperty("id").GetString()

                        return
                            Ok
                                { Platform = "meta"
                                  VideoId = Some id
                                  Url = Some $"https://www.facebook.com/{pageId}/videos/{id}"
                                  Message = "Uploaded to Meta (Facebook Page)" }
                    with _ ->
                        return
                            Ok
                                { Platform = "meta"
                                  VideoId = None
                                  Url = None
                                  Message = "Uploaded to Meta (Facebook Page)" }
        }

    let uploadSharePackAsync
        (http: HttpClient)
        (oauth: SocialOAuth.SocialOAuthService)
        (projectFolder: string)
        (projectName: string)
        (request: SharePackUploadRequest)
        =
        task {
            match validateSharePackAssets projectFolder request with
            | Error err -> return Error(validationErrorMessage err)
            | Ok(shareDir, videoPath) ->
                match validateConnected oauth request with
                | Error err -> return Error(validationErrorMessage err)
                | Ok token ->
                    let caption = readCaption shareDir

                    let title =
                        request.Title
                        |> Option.defaultValue projectName
                        |> fun t -> if String.IsNullOrWhiteSpace t then projectName else t

                    if String.IsNullOrWhiteSpace title then
                        return Error(validationErrorMessage MissingTitle)
                    else
                        let description =
                            request.Description
                            |> Option.defaultValue caption
                            |> fun d -> if String.IsNullOrWhiteSpace d then caption else d

                        match request.Platform with
                        | YouTube ->
                            let! result = uploadYouTubeAsync http token.AccessToken videoPath title description
                            return result
                        | Meta ->
                            let! result = uploadMetaAsync http token videoPath title description request.PageId
                            return result
        }
