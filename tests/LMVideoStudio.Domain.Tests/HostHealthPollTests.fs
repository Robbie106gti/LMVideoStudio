namespace LMVideoStudio.Domain.Tests

open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain.HostHealthPoll

type HostHealthPollTests() =
    let cfg =
        { MaxAttempts = 5
          InitialDelayMs = 100
          MaxDelayMs = 400 }

    [<Fact>]
    member _.``delayAfterAttempt increases with backoff cap`` () =
        delayAfterAttempt 1 cfg |> should equal 100
        delayAfterAttempt 2 cfg |> should equal 200
        delayAfterAttempt 3 cfg |> should equal 300
        delayAfterAttempt 4 cfg |> should equal 400
        delayAfterAttempt 10 cfg |> should equal 400

    [<Fact>]
    member _.``evaluateAttempt returns Success when healthy`` () =
        evaluateAttempt 1 true cfg |> should equal Success

    [<Fact>]
    member _.``evaluateAttempt retries until max attempts`` () =
        evaluateAttempt 1 false cfg |> should equal (Retry 100)
        evaluateAttempt 4 false cfg |> should equal (Retry 400)
        evaluateAttempt 5 false cfg |> should equal Exhausted

        let last =
            [ 1..defaultConfig.MaxAttempts ]
            |> List.map (fun attempt -> evaluateAttempt attempt false defaultConfig)
            |> List.last

        last |> should equal Exhausted
