# LMVideoStudio — Spike Validation

Throwaway validation of ROCm + diffusers + Real-ESRGAN + Ollama + frozen worker **before** Phase 0 (Tauri/Fable).

## Quick start

```powershell
cd spike
.\scripts\gate0_preflight.ps1
.\scripts\setup_venv.ps1      # Python 3.12 venv + ROCm torch (slow, ~5–15 min)
.\scripts\run_all.ps1         # Gates 1–7 (+ optional 4, 8, 9)
```

Record outcomes in [`docs/SPIKE-RESULTS.md`](../docs/SPIKE-RESULTS.md).

## Gates

| Gate | Script | Pass criteria |
|------|--------|---------------|
| 0 | `gate0_preflight.ps1` | Win11, GPU, driver, disk, Python 3.12 |
| 1 | `gate1_torch.py` | `torch.cuda.is_available()` |
| 2 | `gate2_generate.py` | 512×512 PNG in &lt;120s |
| 3 | `gate3_upscale.py` | 2× upscale of gate2 output |
| 4 | `gate4_ollama.ps1` | Ollama chat + optional vision |
| 5 | `lmvs_worker` + curl | FastAPI on `:8765` |
| 6 | `build.ps1` | Frozen exe works outside venv |
| 7 | `gate7_sequence.py` | Ollama → SD → upscale without OOM |
| 8 | `gate8_ffmpeg.ps1` | Ken Burns MP4 (optional) |
| 9 | `gate9_sidecar.ps1` | Spawn/kill worker (optional) |

**Go to Phase 0 when gates 1, 2, 3, 5, 6, 7 pass.**

## iGPU note (9070 XT)

If torch picks the wrong GPU, set before running:

```powershell
$env:HIP_VISIBLE_DEVICES = "1"   # or "0" — see gate1 output
```

## ROCm install

Uses AMD ROCm 7.2.1 wheels for Python 3.12 per [AMD PyTorch docs](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/install/installrad/windows/install-pytorch.html). **No torchao.**
