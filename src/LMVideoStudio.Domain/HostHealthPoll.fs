namespace LMVideoStudio.Domain

/// Pure retry/backoff helpers for waiting on Host `/health` (shared by Client and tests).
module HostHealthPoll =
    let defaultInitialDelayMs = 250
    let defaultMaxDelayMs = 2000
    let defaultMaxAttempts = 60

    type Config =
        { MaxAttempts: int
          InitialDelayMs: int
          MaxDelayMs: int }

    type AttemptOutcome =
        | Success
        | Retry of nextDelayMs: int
        | Exhausted

    let defaultConfig =
        { MaxAttempts = defaultMaxAttempts
          InitialDelayMs = defaultInitialDelayMs
          MaxDelayMs = defaultMaxDelayMs }

    let delayAfterAttempt attempt (config: Config) =
        let capped =
            config.InitialDelayMs + (max 0 (attempt - 1)) * config.InitialDelayMs

        min config.MaxDelayMs capped

    let evaluateAttempt attempt isHealthy (config: Config) =
        if isHealthy then
            Success
        elif attempt >= config.MaxAttempts then
            Exhausted
        else
            Retry(delayAfterAttempt attempt config)
