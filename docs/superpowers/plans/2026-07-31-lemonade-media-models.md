# Lemonade Media Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Let LMVideoStudio use verified Lemonade Z-Image generation and a separately hosted stable-diffusion.cpp Wan video service, while preserving the Python worker and Ken Burns export as explicit fallbacks.

**Architecture:** Add one media-provider boundary in the Host. Image requests select Lemonade only after health and exact downloaded-model discovery succeed, otherwise they use the existing Python worker. Video requests target the native asynchronous stable-diffusion.cpp API only after `/sdcpp/v1/capabilities` advertises `vid_gen`; no Lemonade video semantics are assumed. The app never downloads models or starts services implicitly.

**Tech Stack:** F#/.NET 8, Giraffe, System.Text.Json, Lemonade Server API, stable-diffusion.cpp native async API, xUnit/FsUnit.

## Global Constraints

- Keep text generation on the existing Lemonade/Ollama provider contract.
- Keep voiceover, upscaling, and fallback image generation on the Python worker.
- Bind external inference services to IPv4 loopback and reject unsupported capabilities before generation.
- Do not install or download multi-gigabyte models from application startup, bootstrap, health, or tests.
- Preserve existing routes and serialized project compatibility.
- Treat image-to-video as opt-in and require a real block thumbnail/reference image.

---

### Task 1: Specify and test the image provider contract

**Files:**
- Create: `src/LMVideoStudio.Host/MediaGenerationProvider.fs`
- Modify: `src/LMVideoStudio.Host/LMVideoStudio.Host.fsproj`
- Create: `tests/LMVideoStudio.Host.Tests/MediaGenerationProviderTests.fs`
- Modify: `tests/LMVideoStudio.Host.Tests/LMVideoStudio.Host.Tests.fsproj`

1. Write failing tests for configuration parsing, exact Lemonade model discovery, OpenAI-compatible base64 image parsing, and fallback to the Python worker when Lemonade is unreachable or the configured image model is absent.
2. Run the focused test project and confirm the failures name missing media-provider behavior.
3. Implement `ImageProviderMode = Auto | Lemonade | Worker`, environment parsing, Lemonade `/api/v1/health`, `/api/v1/models`, and `/api/v1/images/generations` handling.
4. Keep `Auto` fail-safe: Lemonade is selected only when the service is healthy and the exact configured model is downloaded; explicit `Lemonade` returns a useful error instead of silently changing providers.
5. Re-run focused tests until green.

### Task 2: Route thumbnail generation through the image boundary

**Files:**
- Modify: `src/LMVideoStudio.Host/BlockGeneration.fs`
- Modify: `src/LMVideoStudio.Host/Bootstrap.fs`
- Modify: `src/LMVideoStudio.Host/Program.fs`
- Modify: `tests/LMVideoStudio.Host.Tests/TestMocks.fs`
- Modify: `tests/LMVideoStudio.Host.Tests/ExportAndGenerationTests.fs`

1. Write a failing route/service test proving a downloaded Lemonade image model is used and a missing model preserves worker generation.
2. Add the media provider to host services and dependency overrides without removing existing worker overrides.
3. Route only thumbnail generation through the new image boundary; retain worker upscaling, TTS, unload, and fallback behavior.
4. Add selected image provider/model readiness to `/models/status` without removing existing fields.
5. Re-run focused host tests.

### Task 3: Add capability-gated Wan video generation

**Files:**
- Create: `src/LMVideoStudio.Host/SdCppVideoProvider.fs`
- Create: `src/LMVideoStudio.Host/BlockVideoGeneration.fs`
- Modify: `src/LMVideoStudio.Host/LMVideoStudio.Host.fsproj`
- Modify: `src/LMVideoStudio.Host/JobEvents.fs`
- Modify: `src/LMVideoStudio.Host/Program.fs`
- Modify: `src/LMVideoStudio.Domain/HardwareProfile.fs`
- Create: `tests/LMVideoStudio.Host.Tests/SdCppVideoProviderTests.fs`
- Modify: `tests/LMVideoStudio.Host.Tests/ExportAndGenerationTests.fs`

1. Write failing tests for loopback URL validation, `vid_gen` capability discovery, async job submission/polling, base64 WebM decoding, failed jobs, and frame-count normalization to `4n + 1`.
2. Implement the verified native routes: `GET /sdcpp/v1/capabilities`, `POST /sdcpp/v1/vid_gen`, and `GET /sdcpp/v1/jobs/{id}`.
3. Add `POST /projects/{projectId}/blocks/{blockId}/video/generate`. Require `LMVS_VIDEO_PROVIDER=sdcpp`, an available thumbnail/reference, and advertised `vid_gen`; save a `.webm` artifact and update the block bake-video path.
4. Add a long, environment-configurable GPU timeout for video jobs; leave existing timeouts unchanged.
5. Add OpenAPI route documentation and focused integration coverage.

### Task 4: Add model catalog, setup guidance, and safe fallback documentation

**Files:**
- Modify: `config/models.manifest.json`
- Modify: `scripts/setup-local-ai.ps1`
- Modify: `scripts/sync_models.ps1`
- Modify: `README.md`
- Modify: `docs/local-ai-setup.md`

1. Add pinned catalog entries for the approved Z-Image Q6 diffusion model, Qwen3-4B Q4_K_M encoder, VAE, Wan2.2 TI2V 5B Q4_K_M, video encoder, and VAE/TAE components, including expected sizes and licenses.
2. Keep default setup read-only. Require an explicit pull/install switch for downloads and print disk/VRAM estimates before any transfer.
3. Document Lemonade image registration, stable-diffusion.cpp video startup, environment variables, capability probes, fallback behavior, and model unload expectations.
4. Run PowerShell parser checks and manifest validation.

### Task 5: Validate and deliver

1. Run focused domain/host tests and repository preflight.
2. Probe the installed Lemonade image API and installed stable-diffusion.cpp capability strings without downloading models.
3. Record that full Z-Image/Wan smoke tests remain gated on explicit model download authorization if files are absent.
4. Run git-account-routing `current` for the LMVideoStudio remote owner before any push.
5. Commit focused changes, update current `main` safely, and push only after validation.
