# macOS port (Apple Silicon / arm64)

Target: M-series Mac mini / MacBook with **MPS** Python worker sidecar, Ollama bootstrap, and **`.dmg`** via Tauri on GitHub Releases.

Windows builds use ROCm; macOS builds use Metal Performance Shaders (MPS) through PyTorch. Shared Python source lives under `python/`; platform selection is in `python/lib/gpu_utils.py`.

## Prerequisites (M-series Mac)

1. **Xcode Command Line Tools** — `xcode-select --install`
2. **Homebrew** — https://brew.sh
3. **Toolchain**
   ```bash
   brew install dotnet@8 node python@3.12 ffmpeg
   brew install --cask ollama   # or download from https://ollama.com/download/mac
   ```
4. **Rust** — https://rustup.rs (`rustup target add aarch64-apple-darwin`)
5. **PowerShell** (model sync scripts) — `brew install powershell/tap/powershell`

Make scripts executable once:

```bash
chmod +x scripts/*.sh
```

## Quick build (.dmg)

From the repo root on macOS arm64:

```bash
./scripts/build-macos.sh
```

This runs:

| Step | Output |
|------|--------|
| `build-sidecars-macos.sh` | `sidecars/LMVideoStudio.Host`, `sidecars/lmvs_worker/` |
| `setup-python-macos.sh` | MPS PyTorch in `sidecars/lmvs_worker/.venv` |
| Fable + Vite | `src/LMVideoStudio.Client/dist` |
| Tauri + `tauri.macos.conf.json` | `.dmg` under `src/LMVideoStudio.Tauri/src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/` |

From Windows (documentation only):

```powershell
./scripts/build-macos.ps1 -DryRun
```

CI runs on `macos-latest` via `.github/workflows/macos-build.yml` (dotnet tests + publish smoke; full `.dmg` on manual `workflow_dispatch`).

## Sidecar layout

| Component | Windows | macOS |
|-----------|---------|-------|
| Host | `sidecars/LMVideoStudio.Host.exe` | `sidecars/LMVideoStudio.Host` |
| Worker launcher (dev) | `run_worker.cmd` | `run_worker.sh` |
| Worker launcher (Tauri) | `run_worker-{triple}.exe` | `run_worker-{triple}` (no extension) |
| Python venv | `.venv/Scripts/python.exe` | `.venv/bin/python` |
| GPU backend | ROCm (`torch.cuda`) | MPS (`torch.backends.mps`) |

Tauri resolves bundled sidecars in `src-tauri/src/sidecar.rs` using platform-specific names (no `.exe` on Darwin).

## Ollama bootstrap

1. Install and launch Ollama (menu bar icon running).
2. Pull manifest models:
   ```bash
   ./scripts/setup-ollama-macos.sh
   ```
   This wraps `scripts/sync_models.ps1 -Pull` via `pwsh`.

No AMD Adrenalin driver check on macOS — bootstrap focuses on Ollama + worker health.

## Python worker (MPS)

Create or refresh the worker venv:

```bash
./scripts/setup-python-macos.sh
# or as part of:
./scripts/build-sidecars-macos.sh
```

Verify GPU backend:

```bash
cd sidecars/lmvs_worker
source .venv/bin/activate
PYTHONPATH=. python -c "from lib.gpu_utils import print_device_info; print_device_info()"
```

Expected: `backend: mps` on Apple Silicon with PyTorch MPS enabled.

Dev worker (without Tauri):

```bash
cd sidecars/lmvs_worker
./run_worker.sh
curl -sf http://127.0.0.1:8765/health
```

## Tauri macOS config

Overlay file: `src/LMVideoStudio.Tauri/src-tauri/tauri.macos.conf.json`

- Bundle ID: `com.lmvideostudio.app`
- Target: `dmg` only (direct download flavor `direct-macos`)
- Minimum macOS: 13.0
- Signing identity `-` for local unsigned builds (configure real identity for notarization)

Build command used by `build-macos.sh`:

```bash
cd src/LMVideoStudio.Tauri
npm run tauri build -- --target aarch64-apple-darwin --config src-tauri/tauri.macos.conf.json
```

## Gate validation (after .dmg install)

1. Open the `.dmg` and drag **LMVideoStudio** to Applications.
2. Launch the app — splash should show “Starting LMVideoStudio…”.
3. Within ~60s, Projects hub loads (no “Host request failed”).
4. Health checks:
   ```bash
   curl -sf http://127.0.0.1:17170/health
   curl -sf http://127.0.0.1:8765/health
   ```
5. Projects directory: `~/Library/Application Support/LMVideoStudio/projects`
6. Optional GPU smoke (requires model weights):
   ```bash
   pwsh ./scripts/gpu_e2e_smoke.ps1
   ```

## GitHub Releases

Release workflow matrix (planned alongside Windows):

- Windows: NSIS installer + ROCm worker artifact
- macOS: `.dmg` + MPS worker sidecar under `sidecars/arm64-macos/`

Updater `latest.json` should include a `darwin-aarch64` platform entry once minisign signing is configured (see `scripts/generate-latest-json.ps1`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `MPS backend: cpu` | Reinstall torch in sidecar venv; ensure macOS 13+ and Apple Silicon |
| Worker venv missing | `./scripts/build-sidecars-macos.sh` (copies ~2GB deps first time) |
| Ollama unreachable | Launch Ollama.app; `ollama serve` if using CLI-only install |
| Gatekeeper blocks app | Right-click → Open, or sign/notarize for production |
| FFmpeg export fails | `brew install ffmpeg`, re-run `build-sidecars-macos.sh` |

## Related files

- `scripts/build-macos.sh` — full `.dmg` pipeline
- `scripts/build-sidecars-macos.sh` — sidecar staging for `osx-arm64`
- `scripts/setup-ollama-macos.sh` — Ollama + model sync
- `scripts/setup-python-macos.sh` — MPS venv
- `scripts/verify-sidecar-staging-macos.sh` — pre-Tauri checks
- `.github/workflows/macos-build.yml` — CI on `macos-latest`
