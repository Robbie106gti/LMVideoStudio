# LMVideoStudio — Spike Validation Results

**Date:** 2026-06-12  
**Machine:** AMD Radeon RX 9070 XT (17.1 GB reported) · Ryzen 5700X3D · Windows 11 Pro · Driver 32.0.31019.2002

**Verdict:** **Partial pass** — GPU stack works in venv; **PyInstaller freeze blocked** until ROCm SDK packages are bundled. Phase 0 should launch **venv sidecar** (Gate 9 validated).

> **Plan updated:** Architecture plan now includes **Spike Review (2026-06-12)** with revised Phase 0 go criteria and embedded-venv pivot.

## Scorecard

| Gate | Pass? | Time | Notes |
|------|-------|------|-------|
| 0 Preflight | **Yes** | — | Win11, 9070 XT, Python 3.12 |
| 1 ROCm torch | **Yes** | ~16s | `2.9.1+rocm7.2.1` |
| 2 diffusers gen | **Yes** | 18s warm | Cold first run ~187s (AOTriton compile) |
| 3 Real-ESRGAN | **Yes** | ~19s | torchvision shim for basicsr |
| 4 Ollama | **Yes** | ~13s | `llama3.1:latest` |
| 5 FastAPI worker | **Yes** | ~20s | venv uvicorn on `:8765` |
| 6 PyInstaller freeze | **No** | ~7 min build | See investigation below |
| 7 GPU sequencing | **Yes** | ~22s | Ollama → SD → upscale |
| 8 FFmpeg Ken Burns | **Yes** | &lt;1s | Needs `scale` before `zoompan` + `-nostdin` in scripts |
| 9 Sidecar spawn | **Yes** | ~23s | **venv sidecar PASS**; frozen exe still fails |
| 10 Bootstrap smoke | **Yes** | ~28s | `bootstrap_smoke.ps1 -SkipWarmup`; llava optional |

---

## Investigation: Gate 6 — PyInstaller freeze

### What happened

1. **Build succeeded** — ~1.7 GB one-folder bundle at `spike/dist/lmvs_worker/`.
2. **Runtime failed** on first `import torch` with:
   ```
   rocm_sdk.__init__.py → find_libraries → UnboundLocalError: py_module
   ```

### Root cause (two layers)

**Layer 1 — PyInstaller did not bundle ROCm SDK Python packages**

| Package | In venv | In frozen `_internal/` |
|---------|---------|--------------------------|
| `rocm_sdk` | Yes | **No** |
| `rocm_sdk_core` | Yes | **No** |
| `rocm_sdk_devel` | Yes | **No** |
| `rocm_sdk_libraries_custom` | Yes | **No** |

Build only used `--collect-all torch`. Torch depends on `rocm_sdk` at runtime, but PyInstaller does not follow that dependency automatically.

**Layer 2 — AMD `rocm_sdk` bug on missing packages**

In `find_libraries()`, when `importlib.import_module(py_package_name)` fails, the code adds to `missing_extras` but **still executes** `py_root = Path(py_module.__file__)` — causing `UnboundLocalError` instead of a clean `ModuleNotFoundError`. This masks the real problem (missing packages in the bundle).

### Fix applied (not re-built in this session)

Updated [`spike/lmvs_worker/build.ps1`](spike/lmvs_worker/build.ps1) to add:

```powershell
--collect-all rocm_sdk
--collect-all rocm_sdk_core
--collect-all rocm_sdk_devel
--collect-all rocm_sdk_libraries_custom
--hidden-import rocm_sdk ...
```

Re-run `.\spike\lmvs_worker\build.ps1` to test. PyInstaller may still warn about HIP DLLs (`MIOpen.dll`, `hipfft.dll`, etc.) — those live inside the `rocm_sdk_*` wheel trees and should resolve once packages are collected.

### Phase 0 recommendation

| Approach | Status |
|----------|--------|
| **Embedded venv sidecar** | **Use now** — Gate 9 validated |
| **Frozen single exe** | Retry after `--collect-all rocm_sdk*` rebuild; may still need runtime hook |
| **System Python + bootstrap** | Fallback only |

---

## Investigation: Gate 8 — FFmpeg “partial”

### What happened

Original script used `zoompan` directly at **1280×720** with **d=90** on a **1024×1024** PNG. In non-interactive PowerShell runs, FFmpeg appeared **hung** (no progress for minutes). Process was killed (exit -1).

### Root cause

1. **`zoompan` cost** scales with **output resolution × frame count (`d`)**. At 1280×720 and d=90, CPU work is heavy; at 640×360 and d=50 it completes in **~0.15s** on the same machine.
2. **Missing `-nostdin`** — in some scripted contexts FFmpeg can block waiting for stdin when progress appears stalled.
3. **Earlier “still only” pass** was a workaround, not a fundamental FFmpeg failure.

### Fix

```powershell
# scale FIRST, then zoompan at preview resolution
-vf "scale=640:360,zoompan=...:s=640x360:fps=25,d=50"
-nostdin
```

Final export can upscale to 720p/1080p with a second FFmpeg pass. Gate 8 now **passes** with Ken Burns motion.

---

## Investigation: Gate 9 — No sidecar spawn

### What happened

Original Gate 9 only tested **`dist/lmvs_worker.exe`**, which crashes on startup (Gate 6 failure). Gate 9 was marked “blocked” even though the **orchestration pattern** was never tested with the working venv worker.

### Fix

Updated [`spike/scripts/gate9_sidecar.ps1`](spike/scripts/gate9_sidecar.ps1) to:

1. Spawn **venv Python** + uvicorn (Phase 0 pattern) → **PASS**
2. Optionally test frozen exe → still **FAIL** until Gate 6 fixed

**Gate 9 now passes** for the pattern Tauri will actually use in Phase 0.

---

## Keeping models up to date

### Design: manifest + sync script

Single source of truth: [`config/models.manifest.json`](../config/models.manifest.json)

| Source | Models | Update policy |
|--------|--------|---------------|
| **Ollama** | `llama3.1:latest`, `llava:latest` (optional) | `ollama pull` on demand or scheduled |
| **Hugging Face** | `runwayml/stable-diffusion-v1-5` | Pin `revision`; bump in manifest when upgrading |
| **File weights** | `RealESRGAN_x2plus.pth` | Pin URL; bump when new weights ship |

Sync script: [`scripts/sync_models.ps1`](../scripts/sync_models.ps1)

```powershell
# Check what's missing (CI / Setup Wizard preflight)
.\scripts\sync_models.ps1 -Check

# Download missing models
.\scripts\sync_models.ps1 -Pull

# Refresh Ollama tags to latest
.\scripts\sync_models.ps1 -Pull -Update
```

### Phase 0+ integration (planned)

1. **Setup Wizard** — call `sync_models.ps1 -Pull` with progress UI on first run.
2. **Settings → Models** — “Check for updates” runs `-Check`, shows drift; “Update” runs `-Pull -Update`.
3. **Host API** — `GET /models/status`, `POST /models/sync` wrapping the same manifest (F# host calls script or reimplements logic).
4. **Manifest in repo** — bump `schema_version` when changing pins; app reads bundled manifest + optional user overrides in `%AppData%/LMVideoStudio/models.override.json`.

Ollama models update independently of app releases. HF SD weights update only when you change the manifest revision (intentional pin). Real-ESRGAN file pinned by URL.

---

## Phase 0 bake-in (applied to architecture plan)

See architecture plan → **Spike Review → Phase 0 bake-in checklist** and **Activity, progress & hardware transparency**.

**Preflight scripts (run before Phase 0 coding or in CI locally):**

```powershell
.\scripts\check_spike_deps.ps1
.\scripts\detect_gpu_conflicts.ps1
.\scripts\bootstrap_smoke.ps1 -SkipWarmup   # quick
.\scripts\bootstrap_smoke.ps1               # includes GPU warmup (~minutes first run)
.\scripts\build-sidecars.ps1 -SkipVenvCopy  # layout only; omit -Skip for full venv copy
```

**Contracts:** [`docs/job-events.schema.json`](job-events.schema.json) · [`docs/PHASE-0-SCOPE.md`](PHASE-0-SCOPE.md)

Summary:

- **Guardrails:** single-flight GPU lock, step unload order, cold-run UX/timeouts, pinned deps, sidecar lifecycle, FFmpeg rules
- **Optimizations:** 512→ESRGAN pipeline, lazy load, 15/20 steps, HF offline after bootstrap, warmup flag
- **Activity UX:** step-level progress events (SSE), ActivityPanel, status bar, cold GPU messaging
- **Conflict detection:** advisory scan before AI jobs (games, LM Studio, Ollama contention, low disk)

---

## Commands

```powershell
cd spike
.\scripts\gate0_preflight.ps1
.\scripts\setup_venv.ps1
.\scripts\run_all.ps1

# Model catalog
cd ..
.\scripts\sync_models.ps1 -Check
.\scripts\sync_models.ps1 -Pull
```
