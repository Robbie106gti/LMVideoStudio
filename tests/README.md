# LMVideoStudio tests

## ffmpeg orphan regression suite

GPU-free regression tests in `LMVideoStudio.Host.Tests/FfmpegOrphanRegressionTests.fs` guard against orphaned `ffmpeg.exe` processes and incomplete shutdown cleanup.

| Test | What it verifies |
|------|------------------|
| `runProcess timeout kills child and clears registry` | Timed-out child processes are killed and unregistered |
| `killAllActive clears tracked process registry` | Manual kill clears all tracked PIDs |
| `concurrent slow kenBurns hooks are not single-flight at export layer` | `FfmpegExport` itself does not serialize; callers own concurrency |
| `second preview cancels first and keeps ffmpeg hook single-flight` | `ExportJobs` cancels superseded preview jobs and runs one FFmpeg stitch at a time |
| `CancelActive kills tracked child processes` | Job cancel tears down registered child processes |
| `host shutdown invokes killAllActive` | `ApplicationStopping` calls `killAllActive` on host dispose |
| `dev.ps1 parses and includes orphan ffmpeg cleanup` | `scripts/dev.ps1` defines `Stop-LmvsFfmpegChildren` and calls it in a `finally` block |

Run with:

```powershell
make test
# or
.\scripts\test.ps1
```

## GPU E2E smoke (worker + Stable Diffusion)

Optional smoke test for the Python worker on `:8765` — not part of fast `make test` (no GPU required for CI).

| Profile | Resolution | Steps | Gens | Typical runtime | GPU load |
|---------|------------|-------|------|-----------------|----------|
| `smoke` (default) | 256×256 | 8 | 1 | ~10s warm | Light — may show low Task Manager Compute on ROCm |
| `stress` | 768×768 | 25 | 3 | minutes | Sustained — expect visible GPU Compute spikes |

| Step | What it verifies |
|------|------------------|
| Worker health | `GET /health` (`rocm`, `device_name`, `torch_device`, `vram_gb`) |
| SD generation | `POST /image/generate` — response includes `device` payload |
| Output | PNG in `out/` (`gpu_e2e_smoke.png` or `gpu_e2e_stress_1.png` …) |

```powershell
make test-gpu
make test-gpu-stress
# or
npm run test:gpu
npm run test:gpu-stress
# or
.\scripts\gpu_e2e_smoke.ps1
.\scripts\gpu_e2e_smoke.ps1 -Stress
.\scripts\gpu_e2e_smoke.ps1 -Profile stress
```

Skips gracefully when no GPU or worker venv (`-Force` fails instead). Prerequisites: `spike\scripts\setup_venv.ps1` (or `.\scripts\build-sidecars.ps1`), and SD weights via `.\scripts\sync_models.ps1 -Pull`. Ollama is not required for this path.

If smoke passes but Task Manager shows ~0% GPU Compute with VRAM loaded, the default job may be too small; use stress mode. Windows Compute graphs can lag or under-report ROCm; watch for spikes during generation and higher total runtime on stress.
