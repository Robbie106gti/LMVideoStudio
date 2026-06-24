namespace LMVideoStudio.Host.Tests

open System
open System.IO
open System.Net
open System.Net.Http
open System.Text
open System.Threading
open System.Threading.Tasks
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Host
open LMVideoStudio.Host.OAuthTokenStore
open LMVideoStudio.Host.SocialOAuth
open LMVideoStudio.Host.SocialUpload

module SocialOAuthTests =
    let private withOAuthEnv (f: unit -> unit) =
        let root = Path.Combine(Path.GetTempPath(), "lmvs-oauth-test-" + Guid.NewGuid().ToString("N"))
        Directory.CreateDirectory root |> ignore
        Environment.SetEnvironmentVariable("LMVS_OAUTH_ROOT", root)
        Environment.SetEnvironmentVariable("LMVS_OAUTH_TEST_PLAINTEXT", "1")

        try
            f ()
        finally
            Environment.SetEnvironmentVariable("LMVS_OAUTH_ROOT", null)
            Environment.SetEnvironmentVariable("LMVS_OAUTH_TEST_PLAINTEXT", null)

            try
                if Directory.Exists root then
                    Directory.Delete(root, recursive = true)
            with _ ->
                ()

    [<Fact>]
    let ``OAuth token store round-trips encrypted shape`` () =
        withOAuthEnv (fun () ->
            let token =
                { Provider = "youtube"
                  AccessToken = "access-123"
                  RefreshToken = Some "refresh-456"
                  ExpiresAtUtc = Some(DateTimeOffset.UtcNow.AddHours 1.0)
                  AccountId = Some "channel-1"
                  AccountName = Some "Test Channel"
                  Scopes = [ "youtube.upload" ]
                  PageId = None
                  PageName = None }

            let path = save token
            File.Exists path |> should equal true

            match load "youtube" with
            | None -> failwith "expected stored token"
            | Some loaded ->
                loaded.AccessToken |> should equal "access-123"
                loaded.RefreshToken |> should equal (Some "refresh-456")
                loaded.AccountName |> should equal (Some "Test Channel")
                loaded.Scopes |> should equal [ "youtube.upload" ]

            delete "youtube" |> should equal true
            (load "youtube").IsNone |> should equal true)

    [<Fact>]
    let ``OAuth authorization URL includes PKCE and provider params`` () =
        let config: SocialOAuthConfig.SocialOAuthConfig =
            { RedirectBase = "http://127.0.0.1:17170"
              YouTube =
                { Enabled = true
                  ClientId = Some "yt-client"
                  ClientSecret = Some "yt-secret"
                  Scopes = [ "scope-a"; "scope-b" ] }
              Meta =
                { Enabled = false
                  ClientId = None
                  ClientSecret = None
                  Scopes = [] }
              Configured = true }

        let url = buildAuthorizationUrl config SocialOAuth.YouTube "state-abc" "challenge-xyz"

        url.Contains("accounts.google.com") |> should equal true
        url.Contains("client_id=yt-client") |> should equal true
        url.Contains("code_challenge=challenge-xyz") |> should equal true
        url.Contains("code_challenge_method=S256") |> should equal true
        url.Contains("state=state-abc") |> should equal true
        url.Contains("redirect_uri=http%3A%2F%2F127.0.0.1%3A17170%2Foauth%2Fcallback") |> should equal true

    [<Fact>]
    let ``Upload request validation rejects missing platform`` () =
        match validateUploadRequest "{}" with
        | Ok _ -> failwith "expected validation error"
        | Error SocialUpload.MissingPlatform -> ()
        | Error other -> failwith $"unexpected error: {other}"

    [<Fact>]
    let ``Upload request validation accepts youtube payload`` () =
        match validateUploadRequest """{"platform":"youtube","title":"Hello"}""" with
        | Error err -> failwith (validationErrorMessage err)
        | Ok req ->
            req.Platform |> should equal SocialUpload.YouTube
            req.Title |> should equal (Some "Hello")

    type MockHttpHandler() =
        inherit HttpMessageHandler()

        override _.SendAsync(request: HttpRequestMessage, _: CancellationToken) =
            task {
                if request.RequestUri.AbsoluteUri.Contains("uploadType=resumable") then
                    let response = new HttpResponseMessage(HttpStatusCode.OK)
                    response.Headers.Location <- Uri("https://example.test/upload-session")
                    return response
                elif request.RequestUri.Host = "example.test" then
                    let response = new HttpResponseMessage(HttpStatusCode.OK)

                    response.Content <-
                        new StringContent("""{"id":"video-99"}""", Encoding.UTF8, "application/json")

                    return response
                else
                    return new HttpResponseMessage(HttpStatusCode.NotFound)
            }

    [<Fact>]
    let ``YouTube upload uses resumable session with mock HTTP`` () =
        task {
            let root = Path.Combine(Path.GetTempPath(), "lmvs-upload-test-" + Guid.NewGuid().ToString("N"))
            let shareDir = Path.Combine(root, SharePackExport.SharePackRelativeDir.Replace('/', Path.DirectorySeparatorChar))
            Directory.CreateDirectory shareDir |> ignore
            File.WriteAllText(Path.Combine(shareDir, "youtube_16x9.mp4"), "fake-mp4")
            File.WriteAllText(Path.Combine(shareDir, "caption.txt"), "caption body")

            let repoRoot = Path.Combine(root, "repo")
            Directory.CreateDirectory(Path.Combine(repoRoot, "config")) |> ignore

            let configJson =
                """{
  "redirectBase": "http://127.0.0.1:17170",
  "youtube": { "enabled": true, "clientId": "id", "clientSecret": "secret", "scopes": ["s"] },
  "meta": { "enabled": false }
}"""

            File.WriteAllText(Path.Combine(repoRoot, "config", "social-oauth.json"), configJson)

            let oauthRoot = Path.Combine(root, "oauth")
            Directory.CreateDirectory oauthRoot |> ignore
            Environment.SetEnvironmentVariable("LMVS_OAUTH_ROOT", oauthRoot)
            Environment.SetEnvironmentVariable("LMVS_OAUTH_TEST_PLAINTEXT", "1")

            save
                { Provider = "youtube"
                  AccessToken = "token"
                  RefreshToken = None
                  ExpiresAtUtc = None
                  AccountId = Some "ch"
                  AccountName = Some "Ch"
                  Scopes = []
                  PageId = None
                  PageName = None }
            |> ignore

            try
                use http = new HttpClient(new MockHttpHandler())
                let oauth = SocialOAuthService(repoRoot, http)

                let request =
                    { Platform = SocialUpload.YouTube
                      Title = Some "Title"
                      Description = Some "Desc"
                      PageId = None }

                let! result = uploadSharePackAsync http oauth root "Project" request

                match result with
                | Error err -> failwith err
                | Ok ok ->
                    ok.Platform |> should equal "youtube"
                    ok.VideoId |> should equal (Some "video-99")
                    ok.Url |> should equal (Some "https://www.youtube.com/watch?v=video-99")
            finally
                Environment.SetEnvironmentVariable("LMVS_OAUTH_ROOT", null)
                Environment.SetEnvironmentVariable("LMVS_OAUTH_TEST_PLAINTEXT", null)

                try
                    Directory.Delete(root, recursive = true)
                with _ ->
                    ()
        }

    [<Collection("HostSerial")>]
    type SocialOAuthApiTests() =
        let fixture = TestHostFactory.TestHostFixture(None)

        [<Fact>]
        let ``GET connected accounts returns youtube and meta entries`` () =
            task {
                let! response = fixture.Client.GetAsync("/settings/connected-accounts")
                response.StatusCode |> should equal HttpStatusCode.OK
                let! body = response.Content.ReadAsStringAsync()
                body.Contains("youtube") |> should equal true
                body.Contains("meta") |> should equal true
            }

        [<Fact>]
        let ``POST share pack upload without platform returns 400`` () =
            task {
                let projectId = Guid.NewGuid()
                use content = new StringContent("{}", Encoding.UTF8, "application/json")

                let! response =
                    fixture.Client.PostAsync($"/projects/{projectId}/export/share-pack/upload", content)

                response.StatusCode |> should equal HttpStatusCode.BadRequest
            }

        interface IDisposable with
            member _.Dispose() = (fixture :> IDisposable).Dispose()
