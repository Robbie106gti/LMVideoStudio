# macOS port (arm64)

Target: M-series Mac mini / MacBook with MPS Python worker sidecar and `.dmg` via Tauri.

## Build (local, when hardware available)

```powershell
# From Windows CI or a Mac runner:
./scripts/build-macos.ps1
```

The script publishes `LMVideoStudio.Host` for `osx-arm64`, builds the Fable client, and runs `tauri build --target aarch64-apple-darwin`. Ollama bootstrap uses the same `scripts/setup-ollama.ps1` pattern adapted for Homebrew in a future `setup-ollama-macos.sh`.

## Sidecar layout

| Component | Windows | macOS |
|-----------|---------|-------|
| Host | `LMVideoStudio.Host.exe` | `LMVideoStudio.Host` |
| Worker | `run_worker` stub → venv uvicorn | `run_worker` stub → `.venv/bin/python` |
| GPU | ROCm (9070 XT) | MPS via PyTorch |

## Status

Skeleton script and docs only until an arm64 Mac runner is available for Gate validation.
