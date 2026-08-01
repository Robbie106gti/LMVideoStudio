# LMVideoStudio

Local-first storyboard and short-form video planning tool (Phase 0 foundation).

## Structure

```
src/
  LMVideoStudio.Domain/   # Shared F# types (3–4s mockup defaults, render profiles)
  LMVideoStudio.Host/     # localhost:17170 REST + SSE + GPU queue skeleton
  LMVideoStudio.Client/   # Fable 4 + Feliz + Elmish + Vite + Tailwind
  LMVideoStudio.Tauri/    # Tauri 2 shell + sidecar orchestrator
tests/
  LMVideoStudio.Domain.Tests/   # xUnit: validation, JSON round-trip, schema shape
  LMVideoStudio.Host.Tests/     # TestServer integration: health, projects, CORS, validate
python/lmvs_worker/       # Promoted FastAPI worker (from spike)
scripts/                  # build-sidecars, sync_models, detect_gpu_conflicts, bootstrap_smoke, test
```

## Dev quick start

One command from repo root starts Host, Worker, Fable (if needed), and Vite in **one terminal** with interleaved, color-coded logs (`[host]`, `[worker]`, `[client]`). Ctrl+C stops all three. The browser opens at http://localhost:1420 once Vite is ready.

```powershell
.\scripts\dev.ps1
```

### Local AI provider

LMVideoStudio uses **Lemonade Server** by default. The host verifies Lemonade through `GET /api/v1/health`, discovers downloaded models through `GET /api/v1/models`, and generates outlines through `POST /api/v1/chat/completions`. Lemonade loads the configured model on first inference and owns its LRU lifecycle; its explicit `/api/v1/load` and `/api/v1/unload` operations are supported by the host provider contract.

Default configuration:

| Setting | Default | Purpose |
| --- | --- | --- |
| `LMVS_LOCAL_AI_PROVIDER` | `lemonade` | `lemonade` or explicit compatibility fallback `ollama` |
| `LMVS_LOCAL_AI_BASE_URL` | `http://127.0.0.1:13305` | Provider HTTP service |
| `LMVS_LOCAL_AI_MODEL` | `Bonsai-8B-gguf` | Downloaded model ID used for outlines |

LMVideoStudio does not install provider software. Install and launch Lemonade separately, then run:

```powershell
.\scripts\setup-local-ai.ps1
```

### Local media providers

Image generation defaults to `auto`: the host selects Lemonade only when its health endpoint succeeds and the exact configured model is reported as downloaded. Otherwise it preserves the existing Python-worker path. Explicit `lemonade` mode fails closed instead of silently changing models.

| Setting | Default | Purpose |
| --- | --- | --- |
| `LMVS_IMAGE_PROVIDER` | `auto` | `auto`, `lemonade`, or compatibility `worker` |
| `LMVS_IMAGE_BASE_URL` | `http://127.0.0.1:13305` | Lemonade loopback service |
| `LMVS_IMAGE_MODEL` | `user.Z-Image-Turbo-Q6` | Exact downloaded Lemonade image model |
| `LMVS_VIDEO_PROVIDER` | unset (disabled) | Set to `sdcpp` only for a qualified Wan server |
| `LMVS_VIDEO_BASE_URL` | `http://127.0.0.1:1234` | Separate stable-diffusion.cpp loopback service |
| `LMVS_VIDEO_TIMEOUT_MINUTES` | `30` | GPU queue timeout for video generation |
| `LMVS_RADEON_FINISHING` | `off` | `auto` uses the optional AMD finishing runner; `required` fails the bake when it cannot run |
| `LMVS_FSR_FRAME_GENERATION` | unset (off) | Set to `true` to opt into 24-to-48-fps interpolation; thin geometry can ghost |
| `LMVS_FSR_FRAMEGEN_EXE` | unset | Required only when frame generation is enabled; qualified 640x352 FSR 4 sidecar |
| `LMVS_FSR_UPSCALE_EXE` | unset | Qualified 640x360-to-1920x1080 FSR 4 ML sidecar |
| `LMVS_VIDEO_ENCODER` | `auto` | Generated-video normalization tries `h264_amf`, then falls back to `libx264`; set `cpu` to skip AMF |

Wan video is intentionally not routed through Lemonade because its installed API has no verified video role. Start a separate stable-diffusion.cpp server with Wan2.2 TI2V 5B, then require `vid_gen` from `GET /sdcpp/v1/capabilities` before enabling it:

```powershell
$env:LMVS_VIDEO_PROVIDER = "sdcpp"
$env:LMVS_VIDEO_BASE_URL = "http://127.0.0.1:1234"
.\scripts\dev.ps1
```

The timeline’s “Generate Wan video from thumbnail” action creates a 121-frame 640x352 WebM at 24 fps (five seconds) and stores it on the block. Sampling is model-aware: a capability response whose `model.name` contains `FastWan` uses the verified three-step LCM, CFG 1, flow-shift 3 profile; other Wan models use 36-step SmoothStep, CFG 5, flow-shift 5. Both use 0.60 image strength to preserve a stable camera and subject geometry. Explicit positive `steps` in the API still overrides the selected default.

The measured fast profile used `FastWan2.2-TI2V-5B-q6_k.gguf` plus the Wan 2.2 TI2V 5B tiny decoder `taew2_2.safetensors`. The server must advertise `vid_gen` and its actual model name; LMVideoStudio does not download weights or own the external server lifecycle. The portable, checksum-pinned model plan and dry-run setup helper live in Agent System Kit’s `local-media-models` skill.

Final bake now consumes a block's generated `bakeVideoPath` when it exists instead of replacing it with a Ken Burns animation of the thumbnail. Generated clips are normalized to the bake dimensions and frame rate. On Windows, normalization tries AMD AMF H.264 first and automatically retries with CPU `libx264` when AMF is unavailable.

#### Optional Radeon FSR finishing

`scripts/radeon-finish.ps1` implements the qualified 640x352-at-24-fps finishing profile:

1. deflicker, with capped stabilization available only as an explicit switch;
2. add four safe pixels above and below to form an exact 640x360 16:9 source;
3. AMD FSR 4 ML 3x upscaling to 1920x1080;
4. AMF H.264 encoding with CPU fallback.

Optional frame generation runs before padding and doubles 24 fps to 48 fps. It uses scene-jump detection and holds a real frame instead of interpolating across a cut, but remains opt-in because thin cables and similar geometry can produce doubled edges.

The app does not download or install AMD's SDK/runtime and does not copy its managed DLLs. Configure only locally qualified, AMD-signed sidecars. `auto` preserves the source clip if they are absent or fail; `required` fails explicitly.

```powershell
$env:LMVS_RADEON_FINISHING = "auto"
$env:LMVS_FSR_UPSCALE_EXE = "C:\path\to\qualified\fsr-upscale-640x360-to-1920x1080.exe"

# Optional 48-fps mode:
$env:LMVS_FSR_FRAME_GENERATION = "true"
$env:LMVS_FSR_FRAMEGEN_EXE = "C:\path\to\qualified\fsr-framegen-640x352.exe"

# Inspect the fixed profile without touching input, output, or services.
.\scripts\radeon-finish.ps1 -InputPath input.webm -OutputPath output.mp4 -PlanOnly
```

The FSR sidecars use synthetic flat depth and motion metadata because Wan does not expose engine depth or motion-vector buffers. Per-frame upscaler resets prioritize deterministic output. A future persistent sidecar can retain the same contract while removing per-frame process-launch overhead.

Temporary Ollama compatibility is explicit:

```powershell
$env:LMVS_LOCAL_AI_PROVIDER = "ollama"
.\scripts\setup-local-ai.ps1
```

Alternatives (same script):

```powershell
make dev          # if make is installed
npm run dev       # from repo root
```

Flags:

| Flag | Effect |
|------|--------|
| `-SkipWorker` | Host + Client only |
| `-SkipBrowser` | Do not open http://localhost:1420 |
| `-NoFable` | Skip `dotnet fable` when `src-js` is already populated |
| `-SplitPanes` | Windows Terminal: three split panes instead of interleaved logs (requires `wt.exe`) |
| `-Test` | Run `scripts/test.ps1` before starting dev stack |

First run installs root `concurrently` and client npm deps as needed.

Manual startup (if you prefer separate terminals):

```powershell
# From repo root — Host needs LMVS_REPO_ROOT for sidecars, FFmpeg, and scripts
$env:LMVS_REPO_ROOT = (Get-Location)

# F# Domain + Host
dotnet build src/LMVideoStudio.Host/LMVideoStudio.Host.fsproj

# Run Host (REST + SSE on http://127.0.0.1:17170)
dotnet run --project src/LMVideoStudio.Host/LMVideoStudio.Host.fsproj

# Fable client (separate terminal)
cd src/LMVideoStudio.Client
npm install
npm run fable
npm run dev
# Open http://localhost:1420 — timeline has "Refresh mockup preview" (640p Ken Burns stitch)

# Headless CLI (Host must be running)
.\cli\lmvs\lmvs.ps1 status --json
.\cli\lmvs\lmvs.ps1 preview <project-id> --json -Wait

### Headless REST API

Host exposes OpenAPI-style routes on `http://127.0.0.1:17170` (mirrors `cli/lmvs/lmvs.ps1`):

| Route | Method | CLI equivalent |
|-------|--------|----------------|
| `/health` | GET | (liveness) |
| `/system/status` | GET | part of `status` |
| `/api/v1/status` | GET | `lmvs.ps1 status` |
| `/projects/validate` | POST | `lmvs.ps1 validate` |
| `/api/v1/validate` | POST | alias |
| `/projects/{id}/preview` | POST | `lmvs.ps1 preview` |
| `/api/v1/projects/{id}/preview` | POST | alias |
| `/projects/{id}/bake` | POST | `lmvs.ps1 bake` |
| `/api/v1/projects/{id}/bake` | POST | alias |
| `/projects/{id}/export/share-pack` | POST | YouTube + Reels export folder |
| `/openapi.json` | GET | machine-readable spec |

Job progress: `GET /jobs/{jobId}/events` (SSE).

```powershell
Invoke-RestMethod http://127.0.0.1:17170/openapi.json
Invoke-RestMethod http://127.0.0.1:17170/api/v1/status
```

# Tauri desktop shell (requires Rust toolchain)
cd src/LMVideoStudio.Tauri
npm install
npm run tauri dev
```

Project files live under `%LOCALAPPDATA%\LMVideoStudio\projects\{id}\` (override with `LMVS_PROJECTS_ROOT` for tests or custom layouts). Mockup previews are written to `renders/mockup/preview.mp4` and served at `/projects/{id}/media/renders/mockup/preview.mp4`.

## GPU vs CPU (expected workload)

| Action | Processor | Notes |
|--------|-----------|--------|
| **Generate thumbnail** (timeline) | **GPU** | Lemonade Z-Image when verified; otherwise the existing Python worker in `auto` mode |
| **Generate Wan video** (selected block) | **GPU** | Separate loopback stable-diffusion.cpp service; disabled unless explicitly configured |
| **Upscale** (bake path) | **GPU** | Real-ESRGAN via worker |
| **Refresh mockup preview** | **CPU** | FFmpeg Ken Burns per block + concat (`libx264`) — one clip at a time per job |
| **Bake export** | **CPU** (+ GPU upscale if enabled) | Same FFmpeg stitch as mockup; upscale step uses worker GPU |

High CPU with several `ffmpeg.exe` and multiple `dotnet` Host processes usually means overlapping mockup/bake jobs or more than one `dev.ps1` stack. Only one mockup/bake stitch runs at a time per Host now; stop duplicate dev stacks if port `17170` is already in use.

**Task Manager tip:** watch the **GPU** tab while generating thumbnails; mockup refresh will spike **CPU** — that is expected.

Worker GPU info: `GET http://127.0.0.1:8765/health` (`rocm`, `vram_gb`, `device_name`) and `GET http://127.0.0.1:17170/system/status` (`workerDevice`).

## Testing

Fast local feedback loop (Domain + Host integration tests; no GPU, local AI service, or worker required):

```powershell
.\scripts\test.ps1
make test          # if make is installed
npm test           # from repo root
```

| Flag | Effect |
|------|--------|
| `-NoBuild` | Skip `dotnet build` (use after a recent build) |
| `-Smoke` | Also run `bootstrap_smoke.ps1 -SkipWarmup` |
| `-Full` | Same as `-Smoke` (includes smoke; GPU warmup still skipped via `-SkipWarmup`) |

Coverage highlights:

- **Domain** — mockup duration 3–4s validation, JSON round-trip, required JSON fields / decode errors
- **Host** — `GET /health`, `GET /projects`, `POST /projects`, CORS preflight on `OPTIONS /projects`, `POST /projects/validate`, `GET /openapi.json`, `GET /api/v1/status`, `POST /projects/{id}/export/share-pack` (missing video → 400), `ProjectStore` JSON Schema validation

Integration tests isolate project storage under a temp directory via `LMVS_REPO_ROOT` and `LMVS_PROJECTS_ROOT`.

GPU smoke (requires CUDA/ROCm worker venv; skips gracefully when unavailable):

```powershell
.\scripts\gpu_e2e_smoke.ps1
make test-gpu          # if make is installed
make test-gpu-stress   # sustained 768×768 load
npm run test:gpu       # from repo root
```

Optional: run tests before dev:

```powershell
.\scripts\dev.ps1 -Test
```

## GitHub updater (Tauri)

Configure `src/LMVideoStudio.Tauri/src-tauri/tauri.conf.json` `plugins.updater` with your minisign public key and release endpoint. Ship `latest.json` on GitHub Releases using `config/updater.latest.json.example` as a template (`createUpdaterArtifacts: true` in bundle config).

## Production build

End-user installs need the full sidecar bundle (Host + embedded Python venv + FFmpeg). Target machines do **not** need a separate .NET 8 runtime (Host is published self-contained).

### Full installer (recommended for QA / release)

```powershell
# One-time: spike venv (ROCm torch, worker deps)
.\spike\scripts\setup_venv.ps1

# Copies ~2GB venv into sidecars\lmvs_worker\.venv, bundles FFmpeg if on PATH
.\scripts\build-sidecars.ps1

# Or all-in-one:
.\scripts\build-installer.ps1
make build          # if make is installed
```

### Fast iteration (dev machines only)

Skips venv copy; worker falls back to `spike\.venv`. **Not suitable for shipping to end users.**

```powershell
make build-fast
# equivalent to:
#   build-sidecars.ps1 -SkipVenvCopy
#   build-installer.ps1 -SkipSidecars -AllowSpikeVenvFallback
```

### Microsoft Store (MSIX)

```powershell
.\scripts\build-msix.ps1
make build-msix        # if make is installed
```

See `docs/MICROSOFT-STORE.md` for packaging and submission notes.

### Verify before Tauri bundle

```powershell
.\scripts\verify-sidecar-staging.ps1
make verify-sidecars
```

### Install → verify on a test PC

1. Run `*-setup.exe` or `.msi` from `src\LMVideoStudio.Tauri\src-tauri\target\release\bundle\`
2. Launch LMVideoStudio — Tauri starts Host (:17170) and worker (:8765) sidecars
3. Optional smoke: `.\scripts\e2e_smoke.ps1 -StartHost` on the dev machine before building
4. First-run: launch Lemonade and sync model weights separately (`setup-local-ai.ps1`; provider installation is never automatic)

Artifacts: `src\LMVideoStudio.Tauri\src-tauri\target\release\bundle\`

Prerequisites (build machine): .NET 8 SDK, Node.js/npm, Rust (`rustc`/`cargo`), MSVC Build Tools (for Tauri on Windows). First Tauri run downloads crates and may take several minutes. Set `TAURI_DISABLE_UPDATER=true` is handled automatically for unsigned local builds.

## Sidecars

```powershell
# Layout only (uses spike\.venv via run_worker.cmd fallback)
.\scripts\build-sidecars.ps1 -SkipVenvCopy

# Optional: copy ~2GB venv into sidecars\lmvs_worker\.venv (self-contained sidecar)
.\scripts\build-sidecars.ps1

# Run worker (http://127.0.0.1:8765/health)
cd sidecars\lmvs_worker
.\run_worker.cmd
```

## Phase 0 exit scripts

```powershell
.\scripts\detect_gpu_conflicts.ps1
.\scripts\bootstrap_smoke.ps1
.\scripts\sync_models.ps1 -Check
```
