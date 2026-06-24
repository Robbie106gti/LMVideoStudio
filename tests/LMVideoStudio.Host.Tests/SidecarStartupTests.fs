namespace LMVideoStudio.Host.Tests

open System
open System.Threading.Tasks
open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain.HostHealthPoll

/// Sidecar / packaged-app startup checks.
///
/// Automated: poll backoff logic (via Domain.HostHealthPoll).
///
/// Manual (after NSIS install):
/// 1. Install from `src/LMVideoStudio.Tauri/src-tauri/target/release/bundle/nsis/*.exe`
/// 2. Launch LMVideoStudio from Start Menu — splash should show "Starting LMVideoStudio…"
/// 3. Within ~60s, Projects hub loads (no red "Host request failed: failed to fetch")
/// 4. `GET http://127.0.0.1:17170/health` returns JSON containing "ok"
/// 5. Projects stored under `%LOCALAPPDATA%\LMVideoStudio\projects`
/// 6. Host sidecar is `LMVideoStudio.Host.exe` next to the app exe (Tauri strips target triple at bundle time)
[<Collection("HostSerial")>]
type SidecarStartupTests() =
    [<Fact>]
    member _.``default poll config allows up to 60 attempts`` () =
        defaultConfig.MaxAttempts |> should equal 60

    [<Fact>]
    member _.``health polling stops after configured attempts`` () =
        let outcomes =
            [ 1..defaultConfig.MaxAttempts ]
            |> List.map (fun attempt -> evaluateAttempt attempt false defaultConfig)

        outcomes.[defaultConfig.MaxAttempts - 1] |> should equal Exhausted

    [<Fact>]
    member _.``GET health returns ok when host fixture running`` () =
        task {
            use fixture = TestHostFactory.TestHostFixture(None)
            let! response = fixture.Client.GetAsync("/health")
            response.IsSuccessStatusCode |> should equal true
            let! body = response.Content.ReadAsStringAsync()
            body.Contains("ok", StringComparison.OrdinalIgnoreCase) |> should equal true
        }
        :> Task
