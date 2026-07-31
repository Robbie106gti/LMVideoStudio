namespace LMVideoStudio.Host

open System.Net.Http

/// Compatibility wrapper for callers that explicitly select the legacy Ollama provider.
module OllamaProvider =
    type OllamaHealth = LocalAiProvider.LocalAiHealth

    type OllamaProvider(baseUrl: string, ?httpClient: HttpClient) =
        inherit
            LocalAiProvider.LocalAiProvider(
                { Provider = LocalAiProvider.ProviderKind.Ollama
                  BaseUrl = baseUrl
                  Model = "llama3.1:latest" },
                ?httpClient = httpClient
            )
