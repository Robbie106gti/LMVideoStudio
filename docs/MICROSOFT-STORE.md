# Microsoft Store (MSIX)

Store builds use MSIX packaging with GitHub updater disabled.

## Configuration

- Set `bundle.createUpdaterArtifacts: false` in `tauri.conf.json` for store profiles.
- Use `tauri-windows-bundle` or WinApp SDK CLI for MSIX generation (see Tauri v2 store docs).
- Ship without embedded signing keys; Store handles distribution trust.

## CI

The `Release` workflow produces unsigned NSIS/MSI artifacts today. A dedicated `store-msix` job will be added when Store Partner Center app identity and certificates are configured.

## Blockers

- Microsoft Partner Center app registration
- Store signing certificate (not minisign GitHub updater keys)
