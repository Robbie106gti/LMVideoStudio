namespace LMVideoStudio.Host

open System
open System.IO
open System.Text.Json

module SocialOAuthConfig =
    type ProviderConfig =
        { Enabled: bool
          ClientId: string option
          ClientSecret: string option
          Scopes: string list }

    type SocialOAuthConfig =
        { RedirectBase: string
          YouTube: ProviderConfig
          Meta: ProviderConfig
          Configured: bool }

    let private emptyProvider =
        { Enabled = false
          ClientId = None
          ClientSecret = None
          Scopes = [] }

    let private defaultConfig =
        { RedirectBase = "http://127.0.0.1:17170"
          YouTube = emptyProvider
          Meta = emptyProvider
          Configured = false }

    let private readProvider (root: JsonElement) (name: string) =
        if root.TryGetProperty(name) |> fst then
            let el = root.GetProperty(name)

            let clientId =
                if el.TryGetProperty("clientId") |> fst then
                    let v = el.GetProperty("clientId").GetString()

                    if String.IsNullOrWhiteSpace v then None else Some v
                else
                    None

            let clientSecret =
                if el.TryGetProperty("clientSecret") |> fst then
                    let v = el.GetProperty("clientSecret").GetString()

                    if String.IsNullOrWhiteSpace v then None else Some v
                else
                    None

            let scopes =
                if el.TryGetProperty("scopes") |> fst then
                    el.GetProperty("scopes").EnumerateArray()
                    |> Seq.choose (fun s ->
                        let v = s.GetString()

                        if String.IsNullOrWhiteSpace v then None else Some v)
                    |> Seq.toList
                else
                    []

            let enabled =
                if el.TryGetProperty("enabled") |> fst then
                    el.GetProperty("enabled").GetBoolean()
                else
                    false

            { Enabled = enabled
              ClientId = clientId
              ClientSecret = clientSecret
              Scopes = scopes }
        else
            emptyProvider

    let load (repoRoot: string) =
        let path = Path.Combine(repoRoot, "config", "social-oauth.json")

        if not (File.Exists path) then
            defaultConfig
        else
            try
                let json = File.ReadAllText path
                let doc = JsonDocument.Parse json
                let root = doc.RootElement

                let redirectBase =
                    if root.TryGetProperty("redirectBase") |> fst then
                        let v = root.GetProperty("redirectBase").GetString()

                        if String.IsNullOrWhiteSpace v then
                            defaultConfig.RedirectBase
                        else
                            v.TrimEnd('/')
                    else
                        defaultConfig.RedirectBase

                let youtube = readProvider root "youtube"
                let meta = readProvider root "meta"

                let configured =
                    (youtube.Enabled
                     && youtube.ClientId.IsSome
                     && youtube.ClientSecret.IsSome)
                    || (meta.Enabled && meta.ClientId.IsSome && meta.ClientSecret.IsSome)

                { RedirectBase = redirectBase
                  YouTube = youtube
                  Meta = meta
                  Configured = configured }
            with _ ->
                defaultConfig

    let redirectUri (config: SocialOAuthConfig) = $"{config.RedirectBase}/oauth/callback"
