namespace LMVideoStudio.Host

open System
open System.Collections.Concurrent
open System.Collections.Generic
open System.Net.Http
open System.Security.Cryptography
open System.Text
open System.Text.Json

module SocialOAuth =
    type OAuthProvider =
        | YouTube
        | Meta

    type StartResult =
        { AuthorizationUrl: string
          State: string
          Provider: string }

    type CallbackResult =
        { Provider: string
          AccountName: string option
          Success: bool
          Message: string }

    type PendingSession =
        { Provider: OAuthProvider
          CodeVerifier: string
          CreatedAtUtc: DateTimeOffset }

    let private pending = ConcurrentDictionary<string, PendingSession>()

    let parseProvider (value: string) =
        match value.Trim().ToLowerInvariant() with
        | "youtube" -> Ok YouTube
        | "meta" | "facebook" | "instagram" -> Ok Meta
        | other -> Error $"Unknown OAuth provider: {other}"

    let providerName =
        function
        | YouTube -> "youtube"
        | Meta -> "meta"

    let private base64Url (bytes: byte[]) =
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

    let generateCodeVerifier () =
        let bytes: byte[] = Array.zeroCreate 32
        use rng = RandomNumberGenerator.Create()
        rng.GetBytes bytes
        base64Url bytes

    let generateCodeChallenge (codeVerifier: string) =
        use sha = SHA256.Create()
        let hash = sha.ComputeHash(Encoding.ASCII.GetBytes codeVerifier)
        base64Url hash

    let generateState () =
        Guid.NewGuid().ToString("N")

    let private providerConfig (config: SocialOAuthConfig.SocialOAuthConfig) provider =
        match provider with
        | YouTube -> config.YouTube
        | Meta -> config.Meta

    let isProviderConfigured (config: SocialOAuthConfig.SocialOAuthConfig) provider =
        let p = providerConfig config provider

        p.Enabled
        && p.ClientId.IsSome
        && p.ClientSecret.IsSome
        && not p.Scopes.IsEmpty

    let private urlEncode (value: string) = Uri.EscapeDataString value

    let buildAuthorizationUrl
        (config: SocialOAuthConfig.SocialOAuthConfig)
        (provider: OAuthProvider)
        (state: string)
        (codeChallenge: string)
        =
        let p = providerConfig config provider
        let redirectUri = SocialOAuthConfig.redirectUri config
        let scope = String.Join(" ", p.Scopes)

        match provider with
        | YouTube ->
            let qs =
                [ "client_id", p.ClientId.Value
                  "redirect_uri", redirectUri
                  "response_type", "code"
                  "scope", scope
                  "state", state
                  "code_challenge", codeChallenge
                  "code_challenge_method", "S256"
                  "access_type", "offline"
                  "prompt", "consent" ]
                |> List.map (fun (k, v) -> $"{urlEncode k}={urlEncode v}")
                |> String.concat "&"

            $"https://accounts.google.com/o/oauth2/v2/auth?{qs}"
        | Meta ->
            let qs =
                [ "client_id", p.ClientId.Value
                  "redirect_uri", redirectUri
                  "response_type", "code"
                  "scope", scope
                  "state", state
                  "code_challenge", codeChallenge
                  "code_challenge_method", "S256" ]
                |> List.map (fun (k, v) -> $"{urlEncode k}={urlEncode v}")
                |> String.concat "&"

            $"https://www.facebook.com/v19.0/dialog/oauth?{qs}"

    let startAuthorization (config: SocialOAuthConfig.SocialOAuthConfig) (provider: OAuthProvider) =
        if not (isProviderConfigured config provider) then
            Error "OAuth provider is not configured — copy config/social-oauth.json.example to config/social-oauth.json"
        else
            let codeVerifier = generateCodeVerifier ()
            let codeChallenge = generateCodeChallenge codeVerifier
            let state = generateState ()

            pending.[state] <-
                { Provider = provider
                  CodeVerifier = codeVerifier
                  CreatedAtUtc = DateTimeOffset.UtcNow }

            Ok
                { AuthorizationUrl = buildAuthorizationUrl config provider state codeChallenge
                  State = state
                  Provider = providerName provider }

    let private parseTokenResponse (json: string) =
        let doc = JsonDocument.Parse json
        let root = doc.RootElement

        let access =
            if root.TryGetProperty("access_token") |> fst then
                root.GetProperty("access_token").GetString()
            else
                null

        let refresh =
            if root.TryGetProperty("refresh_token") |> fst then
                let v = root.GetProperty("refresh_token").GetString()

                if String.IsNullOrWhiteSpace v then None else Some v
            else
                None

        let expires =
            if root.TryGetProperty("expires_in") |> fst then
                let sec = root.GetProperty("expires_in").GetInt64()
                Some(DateTimeOffset.UtcNow.AddSeconds(float sec))
            else
                None

        if String.IsNullOrWhiteSpace access then
            Error "Token response missing access_token"
        else
            Ok(access, refresh, expires)

    let private exchangeCodeAsync
        (http: HttpClient)
        (config: SocialOAuthConfig.SocialOAuthConfig)
        (provider: OAuthProvider)
        (code: string)
        (codeVerifier: string)
        =
        task {
            let p = providerConfig config provider
            let redirectUri = SocialOAuthConfig.redirectUri config

            let formPairs (pairs: (string * string) list) =
                new FormUrlEncodedContent(
                    pairs
                    |> List.map (fun (k, v) -> KeyValuePair<string, string>(k, v))
                )

            use content =
                match provider with
                | YouTube ->
                    formPairs
                        [ "grant_type", "authorization_code"
                          "code", code
                          "redirect_uri", redirectUri
                          "client_id", p.ClientId.Value
                          "client_secret", p.ClientSecret.Value
                          "code_verifier", codeVerifier ]
                | Meta ->
                    formPairs
                        [ "grant_type", "authorization_code"
                          "code", code
                          "redirect_uri", redirectUri
                          "client_id", p.ClientId.Value
                          "client_secret", p.ClientSecret.Value
                          "code_verifier", codeVerifier ]

            let tokenUrl =
                match provider with
                | YouTube -> "https://oauth2.googleapis.com/token"
                | Meta -> "https://graph.facebook.com/v19.0/oauth/access_token"

            let! response = http.PostAsync(tokenUrl, content)
            let! body = response.Content.ReadAsStringAsync()

            if not response.IsSuccessStatusCode then
                return Error $"Token exchange failed ({int response.StatusCode}): {body}"
            else
                return parseTokenResponse body
        }

    let private fetchYouTubeProfileAsync (http: HttpClient) (accessToken: string) =
        task {
            use req = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true")
            req.Headers.Authorization <- Headers.AuthenticationHeaderValue("Bearer", accessToken)
            let! response = http.SendAsync req
            let! body = response.Content.ReadAsStringAsync()

            if not response.IsSuccessStatusCode then
                return None, None
            else
                try
                    let doc = JsonDocument.Parse body
                    let items = doc.RootElement.GetProperty("items")

                    if items.GetArrayLength() = 0 then
                        return None, None
                    else
                        let item = items.[0]
                        let id = item.GetProperty("id").GetString()
                        let title = item.GetProperty("snippet").GetProperty("title").GetString()
                        return Some id, Some title
                with _ ->
                    return None, None
        }

    let private fetchMetaPageAsync (http: HttpClient) (accessToken: string) =
        task {
            let url =
                "https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token="
                + Uri.EscapeDataString accessToken

            let! response = http.GetAsync url
            let! body = response.Content.ReadAsStringAsync()

            if not response.IsSuccessStatusCode then
                return None, None, None, None
            else
                try
                    let doc = JsonDocument.Parse body
                    let data = doc.RootElement.GetProperty("data")

                    if data.GetArrayLength() = 0 then
                        return None, None, None, None
                    else
                        let page = data.[0]
                        let pageId = page.GetProperty("id").GetString()
                        let pageName = page.GetProperty("name").GetString()

                        let pageToken =
                            if page.TryGetProperty("access_token") |> fst then
                                Some(page.GetProperty("access_token").GetString())
                            else
                                None

                        return Some pageId, Some pageName, pageToken, Some "Facebook Page"
                with _ ->
                    return None, None, None, None
        }

    let handleCallbackAsync
        (http: HttpClient)
        (config: SocialOAuthConfig.SocialOAuthConfig)
        (code: string)
        (state: string)
        =
        task {
            match pending.TryRemove state with
            | false, _ -> return Error "Invalid or expired OAuth state"
            | true, session ->
                if DateTimeOffset.UtcNow - session.CreatedAtUtc > TimeSpan.FromMinutes 15. then
                    return Error "OAuth session expired — start connect again from Settings"
                else
                    let! tokenResult = exchangeCodeAsync http config session.Provider code session.CodeVerifier

                    match tokenResult with
                    | Error err -> return Error err
                    | Ok(access, refresh, expires) ->
                        let! accountId, accountName, pageId, pageName, pageToken =
                            task {
                                match session.Provider with
                                | YouTube ->
                                    let! id, name = fetchYouTubeProfileAsync http access
                                    return id, name, None, None, None
                                | Meta ->
                                    let! pid, pname, ptok, _ = fetchMetaPageAsync http access
                                    return None, None, pid, pname, ptok
                            }

                        let stored: OAuthTokenStore.StoredToken =
                            { Provider = providerName session.Provider
                              AccessToken =
                                match pageToken with
                                | Some t -> t
                                | None -> access
                              RefreshToken = refresh
                              ExpiresAtUtc = expires
                              AccountId = accountId
                              AccountName = accountName
                              Scopes = (providerConfig config session.Provider).Scopes
                              PageId = pageId
                              PageName = pageName }

                        OAuthTokenStore.save stored |> ignore

                        return
                            Ok
                                { Provider = providerName session.Provider
                                  AccountName = accountName |> Option.orElse pageName
                                  Success = true
                                  Message = "Account connected. You can close this window and return to LMVideoStudio." }
        }

    let disconnect provider =
        OAuthTokenStore.delete provider

    type SocialOAuthService(repoRoot: string, httpClient: HttpClient) =
        let config = SocialOAuthConfig.load repoRoot

        member _.Config = config

        member _.Start providerStr =
            match parseProvider providerStr with
            | Error err -> Error err
            | Ok provider -> startAuthorization config provider

        member _.Callback code state = handleCallbackAsync httpClient config code state

        member _.ConnectedAccounts () =
            OAuthTokenStore.listConnected
                (isProviderConfigured config YouTube)
                (isProviderConfigured config Meta)

        member _.Disconnect providerStr =
            match parseProvider providerStr with
            | Error err -> Error err
            | Ok provider ->
                disconnect (providerName provider) |> ignore
                Ok ()

        member _.GetToken providerStr =
            match parseProvider providerStr with
            | Error err -> Error err
            | Ok provider -> OAuthTokenStore.load (providerName provider) |> Ok
