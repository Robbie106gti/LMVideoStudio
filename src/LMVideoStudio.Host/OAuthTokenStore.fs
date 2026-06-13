namespace LMVideoStudio.Host

open System
open System.IO
open System.Security.Cryptography
open System.Text
open System.Text.Json

module OAuthTokenStore =
    type StoredToken =
        { Provider: string
          AccessToken: string
          RefreshToken: string option
          ExpiresAtUtc: DateTimeOffset option
          AccountId: string option
          AccountName: string option
          Scopes: string list
          PageId: string option
          PageName: string option }

    type ConnectedAccount =
        { Provider: string
          Connected: bool
          AccountName: string option
          AccountId: string option
          PageName: string option
          ExpiresAtUtc: DateTimeOffset option
          Configured: bool }

    let private entropy = Encoding.UTF8.GetBytes("LMVideoStudio.OAuth.v1")

    let resolveOAuthRoot () =
        match Environment.GetEnvironmentVariable("LMVS_OAUTH_ROOT") with
        | null
        | "" ->
            let local =
                Environment.GetEnvironmentVariable("LOCALAPPDATA")
                |> Option.ofObj
                |> Option.defaultValue (Path.GetTempPath())

            Path.Combine(local, "LMVideoStudio", "oauth")
        | custom -> custom

    let private testPlaintextEnabled () =
        match Environment.GetEnvironmentVariable("LMVS_OAUTH_TEST_PLAINTEXT") with
        | null
        | "" -> false
        | v -> v = "1" || v.Equals("true", StringComparison.OrdinalIgnoreCase)

    let private encrypt (plain: byte[]) =
        if testPlaintextEnabled () then
            plain
        else
            System.Security.Cryptography.ProtectedData.Protect(plain, entropy, DataProtectionScope.CurrentUser)

    let private decrypt (cipher: byte[]) =
        if testPlaintextEnabled () then
            cipher
        else
            System.Security.Cryptography.ProtectedData.Unprotect(cipher, entropy, DataProtectionScope.CurrentUser)

    let private tokenPath (provider: string) =
        Path.Combine(resolveOAuthRoot(), $"{provider.ToLowerInvariant()}.token")

    let ensureRoot () =
        let root = resolveOAuthRoot()
        Directory.CreateDirectory root |> ignore
        root

    let save (token: StoredToken) =
        ensureRoot () |> ignore
        let path = tokenPath token.Provider

        let json =
            JsonSerializer.Serialize(
                token,
                JsonSerializerOptions(PropertyNamingPolicy = JsonNamingPolicy.CamelCase)
            )

        let bytes = encrypt (Encoding.UTF8.GetBytes json)
        File.WriteAllBytes(path, bytes)
        path

    let load (provider: string) =
        let path = tokenPath provider

        if not (File.Exists path) then
            None
        else
            try
                let cipher = File.ReadAllBytes path
                let plain = decrypt cipher
                let json = Encoding.UTF8.GetString plain

                let token =
                    JsonSerializer.Deserialize<StoredToken>(
                        json,
                        JsonSerializerOptions(PropertyNamingPolicy = JsonNamingPolicy.CamelCase)
                    )

                Some token
            with _ ->
                None

    let delete (provider: string) =
        let path = tokenPath provider

        if File.Exists path then
            File.Delete path

        not (File.Exists path)

    let connectedAccount (provider: string) (configured: bool) =
        match load provider with
        | None ->
            { Provider = provider
              Connected = false
              AccountName = None
              AccountId = None
              PageName = None
              ExpiresAtUtc = None
              Configured = configured }
        | Some token ->
            { Provider = provider
              Connected = not (String.IsNullOrWhiteSpace token.AccessToken)
              AccountName = token.AccountName
              AccountId = token.AccountId
              PageName = token.PageName
              ExpiresAtUtc = token.ExpiresAtUtc
              Configured = configured }

    let listConnected (youtubeConfigured: bool) (metaConfigured: bool) =
        [ connectedAccount "youtube" youtubeConfigured
          connectedAccount "meta" metaConfigured ]
