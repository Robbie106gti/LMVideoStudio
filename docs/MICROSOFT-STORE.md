# Microsoft Store (MSIX)

LMVideoStudio ships on GitHub Releases (direct) and can be packaged for the Microsoft Store. Store builds disable the GitHub Tauri updater; users receive updates through Partner Center / Store automatic updates.

## Build flavors

| Flavor | Config | Updater | Output |
|--------|--------|---------|--------|
| `direct-windows` | `tauri.conf.json` | GitHub (`latest.json` + minisign) | NSIS + MSI |
| `microsoft-store` | `tauri.microsoftstore.conf.json` (merged) | Disabled | Offline MSI + optional MSIX |

## Local build

From repo root (requires same prerequisites as `make build`):

```powershell
make build-msix
# or
.\scripts\build-msix.ps1
```

The script sets:

- `LMVS_BUILD_FLAVOR=microsoft-store` — compile-time flag for Tauri shell + sidecars
- `TAURI_DISABLE_UPDATER=true` — no updater artifacts during bundle

Artifacts:

- **MSI (required):** `src/LMVideoStudio.Tauri/src-tauri/target/release/bundle/msi/*.msi` — offline WebView2 installer (Tauri Store path)
- **MSIX (optional):** `out/store-msix/*.msix` when `tauri-windows-bundle` or `winapp` CLI is configured

### Optional MSIX tooling

**Option A — tauri-windows-bundle (recommended for multi-arch Store bundles):**

```powershell
cd src\LMVideoStudio.Tauri
npx @choochmeque/tauri-windows-bundle init
# Edit src-tauri/gen/windows/bundle.config.json with Partner Center publisher identity
make build-msix
```

**Option B — winapp CLI:**

```powershell
winget install Microsoft.winappcli
# After make build-msix, stage exe + Package.appxmanifest under out/store-msix/stage/
winapp pack:msix out\store-msix\stage --output out\store-msix\LMVideoStudio.msix
```

See [Tauri Microsoft Store guide](https://v2.tauri.app/distribute/microsoft-store/) and [winapp CLI usage](https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/usage).

## Store-specific configuration

`src/LMVideoStudio.Tauri/src-tauri/tauri.microsoftstore.conf.json` merges over `tauri.conf.json`:

- `bundle.createUpdaterArtifacts: false`
- `plugins.updater.active: false` and `dialog: false`
- `bundle.windows.webviewInstallMode.type: offlineInstaller` (Store requirement)
- `bundle.publisher` / `identifier` — replace `Robbie106gti.LMVideoStudio` with your Partner Center package identity before submission
- `capabilities/microsoftstore.json` — shell/core only (no `updater:default`)

Update `identifier` and `bundle.publisher` to match the reserved name and publisher CN from Partner Center before your first upload.

## Partner Center setup

1. Enroll as a [Microsoft developer](https://developer.microsoft.com/en-us/microsoft-store/register/) (~$19 one-time).
2. **Apps and Games → New product → MSIX or packaged app** (or EXE/MSI app linking to offline installer per Tauri docs).
3. Reserve a unique product name and note the **Package/Store identity** (e.g. `PublisherName.AppName`).
4. Align `tauri.microsoftstore.conf.json` `identifier` and `bundle.publisher` with that identity.
5. Prepare listing: description, screenshots, privacy policy (required — app downloads Ollama/models to `%AppData%` on first run).
6. Upload MSI or MSIX from `make build-msix` output.
7. Complete age ratings, pricing, and submission checklist.

### Signing

- **Store upload:** Microsoft re-signs MSIX on ingestion; you do not use minisign/GitHub updater keys.
- **Local MSIX testing:** Use `winapp cert install` with a dev PFX, or sign via Partner Center flight builds.
- **Direct GitHub builds:** Continue using minisign for `latest.json` (unchanged).

### Submission checklist

- [ ] Partner Center app registered; identity matches `tauri.microsoftstore.conf.json`
- [ ] Privacy policy URL (local AI, Ollama, model downloads)
- [ ] Offline WebView2 MSI built (`make build-msix`)
- [ ] No in-app GitHub updater prompts (Settings hides "Check for updates" in store flavor)
- [ ] Sidecars bundled: Host + worker + FFmpeg resources
- [ ] Test install on clean Windows 10/11 VM
- [ ] Review notes explaining first-run bootstrap (Ollama, GPU worker, disk space)

## CI

`.github/workflows/release.yml` includes a `store-msix` job stub (manual `workflow_dispatch` only) until Partner Center credentials and signing are configured. The main `build-installer` job continues to produce GitHub Release artifacts.

To enable automated store builds later:

1. Add GitHub secrets for Partner Center / signing (if using self-signed MSIX pre-upload).
2. Uncomment the `store-msix` job steps in `release.yml`.
3. Upload `out/store-msix/` or MSI artifacts to Partner Center via API or manual submit.

## Store vs direct differences

| Aspect | Direct (GitHub) | Microsoft Store |
|--------|-----------------|-----------------|
| Build command | `make build` | `make build-msix` |
| Tauri config | `tauri.conf.json` | + `tauri.microsoftstore.conf.json` |
| Updater | Tauri plugin + `latest.json` | Disabled; Store updates |
| WebView2 | Default embed/bootstrap | Offline installer only |
| Bundle targets | NSIS + MSI | MSI (+ optional MSIX) |
| Signing | minisign (updater) + optional Authenticode | Partner Center / Store |
| Settings UI | "Check for updates" visible | Hidden; no GitHub fallback |
| Env at build | — | `LMVS_BUILD_FLAVOR=microsoft-store`, `TAURI_DISABLE_UPDATER=true` |
