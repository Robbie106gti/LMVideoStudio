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
| **Generate thumbnail** (timeline) | **GPU** | Python worker at `:8765` — Stable Diffusion on `cuda` / ROCm (`torch.cuda`) |
| **Upscale** (bake path) | **GPU** | Real-ESRGAN via worker |
| **Refresh mockup preview** | **CPU** | FFmpeg Ken Burns per block + concat (`libx264`) — one clip at a time per job |
| **Bake export** | **CPU** (+ GPU upscale if enabled) | Same FFmpeg stitch as mockup; upscale step uses worker GPU |

High CPU with several `ffmpeg.exe` and multiple `dotnet` Host processes usually means overlapping mockup/bake jobs or more than one `dev.ps1` stack. Only one mockup/bake stitch runs at a time per Host now; stop duplicate dev stacks if port `17170` is already in use.

**Task Manager tip:** watch the **GPU** tab while generating thumbnails; mockup refresh will spike **CPU** — that is expected.

Worker GPU info: `GET http://127.0.0.1:8765/health` (`rocm`, `vram_gb`, `device_name`) and `GET http://127.0.0.1:17170/system/status` (`workerDevice`).

## Testing

Fast local feedback loop (Domain + Host integration tests; no GPU, Ollama, or worker required):

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
4. First-run: Ollama + model weights still download separately (`sync_models.ps1 -Pull` on dev; app bootstrap on install)

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
