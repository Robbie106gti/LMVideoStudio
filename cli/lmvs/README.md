# `lmvs` CLI

Headless wrapper around the LMVideoStudio Host (`http://127.0.0.1:17170`). Use `--json` for machine-readable output.

## Prerequisites

Start the Host from the repo root:

```powershell
$env:LMVS_REPO_ROOT = (Get-Location)
dotnet run --project src/LMVideoStudio.Host/LMVideoStudio.Host.fsproj
```

## Commands

| Command | Purpose |
|---------|---------|
| `lmvs status` | Host health + `/system/status` |
| `lmvs validate <project.json>` | Validate JSON via Host schema rules |
| `lmvs preview <project-id-or-folder>` | Start mockup preview stitch job (640p Ken Burns) |
| `lmvs bake <project-id-or-folder>` | Start bake skeleton job (SSE progress) |

Add `-Wait` to block until the job completes (SSE on `/jobs/{id}/events`).

## Examples

```powershell
.\cli\lmvs\lmvs.ps1 status --json
.\cli\lmvs\lmvs.ps1 validate "$env:LOCALAPPDATA\LMVideoStudio\projects\<id>\project.lmvs.json" --json
.\cli\lmvs\lmvs.ps1 preview <project-guid> --json -Wait
.\cli\lmvs\lmvs.ps1 bake .\path\to\project-folder --json
```

Override Host URL with `-HostUrl http://127.0.0.1:17170`.
