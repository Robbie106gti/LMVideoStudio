# LMVideoStudio v1 Ship Checklist

Use this list before tagging a release. `scripts/dev.ps1` covers day-to-day development; this checklist is for production installers.

## Pre-flight

- [ ] `make test` passes (fast mode, no GPU)
- [ ] **ffmpeg orphan regression suite** passes (`tests/LMVideoStudio.Host.Tests/FfmpegOrphanRegressionTests.fs`): runProcess timeout + registry cleanup, `killAllActive`, preview cancel/single-flight, host `ApplicationStopping`, `dev.ps1` orphan cleanup
- [ ] `.\scripts\e2e_smoke.ps1 -StartHost` passes on a clean machine profile
- [ ] `dotnet test LMVideoStudio.sln -c Release` green in CI
- [ ] Client `npm run build` succeeds after `dotnet fable`

## Sidecars and models

- [ ] `.\scripts\build-sidecars.ps1` produces Host + worker under `sidecars/`
- [ ] `.\scripts\sync_models.ps1 -Check` reports manifest OK
- [ ] Ollama model from `config/models.manifest.json` available (or documented offline fallback)
- [ ] FFmpeg available via sidecar bin or PATH (Ken Burns / share pack)

## Installer build

- [ ] `.\scripts\build-sidecars.ps1` (or `-SkipVenvCopy` for fast layout; full run copies ~2GB venv)
- [ ] `.\scripts\build-installer.ps1` completes (unsigned OK for internal QA)
- [ ] Prerequisites: .NET 8 SDK, Node.js/npm, Rust (`winget install Rustlang.Rustup`), MSVC Build Tools (C++ workload for `link.exe`)
- [ ] Artifacts: `src/LMVideoStudio.Tauri/src-tauri/target/release/bundle/nsis/*-setup.exe` and/or `.../msi/*.msi`
- [ ] Tauri `bundle.externalBin` includes Host + worker stubs
- [ ] Replace `REPLACE_WITH_MINISIGN_PUBLIC_KEY` in `src/LMVideoStudio.Tauri/src-tauri/tauri.conf.json` before public release
- [ ] Smoke-install MSI/NSIS on a VM without dev tools installed

## Functional QA (manual)

- [ ] Create project, import blocks, reorder timeline
- [ ] Generate thumbnail variants (worker required)
- [ ] Mockup preview job completes with SSE progress
- [ ] Bake export uses upscaled image when present
- [ ] Share pack export after preview/bake
- [ ] Premiere XML opens in Premiere / DaVinci import test
- [ ] Per-block crossfade duration saves from inspector

## Release

- [ ] Version bumped in Tauri manifest + changelog
- [ ] Git tag `vX.Y.Z` pushed; GitHub Release workflow uploads bundle artifacts
- [ ] Release notes mention GPU/ROCm requirements and first-run bootstrap

## Deferred (post-v1)

- Code signing & auto-updater pubkey rotation
- Worker TTS endpoint (Host stub returns 202 today)
- OAuth upload to YouTube/Reels
