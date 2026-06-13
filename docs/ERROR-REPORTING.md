# Error reporting

LMVideoStudio captures client, Host, and Tauri errors locally first, then optionally notifies the developer via webhook.

## Storage

Reports are written to:

`%LOCALAPPDATA%\LMVideoStudio\reports\{id}.json`

Failed webhook uploads are queued in:

`%LOCALAPPDATA%\LMVideoStudio\reports\queue\`

Override with `LMVS_REPORTS_ROOT` for tests.

## Developer notifications (robbie106gti)

1. Copy `config/error-reporting.json.example` to `config/error-reporting.json` (gitignored in production setups).
2. Set `webhookUrl` to a Discord incoming webhook, generic POST endpoint, or GitHub-issue automation URL.
3. Choose `webhookFormat`: `discord`, `github_issue`, or `generic`.
4. Keep `autoUpload: true` so queued reports retry when the app is online.

**Discord (recommended for early beta):** create a webhook in your dev Discord server → paste URL → set `"webhookFormat": "discord"`.

**Generic POST:** any endpoint accepting JSON; the full sanitized report body is posted when `webhookFormat` is `generic`.

## User consent

Settings → **Error reporting** → **Send error reports automatically** (default **off**).

- With consent off: errors are captured locally and shown in the Activity panel; user can manually send from Settings.
- With consent on: sanitized reports are submitted to Host `POST /api/v1/reports`, persisted locally, and uploaded when a webhook is configured.
- Fatal Host/Tauri errors are always persisted locally; upload still respects webhook config.

## What is never sent

API keys, tokens, passwords, project JSON/paths, and other secrets are redacted before persistence or upload.

## API

- `POST /api/v1/reports` — accept a report JSON body
- `POST /api/v1/reports/flush` — retry queued webhook uploads

## Manual test

1. `make test`
2. Run the app, open DevTools console: `throw new Error("test report")`
3. Check Activity panel **Last error** banner
4. Settings → **Send last captured error**
5. Inspect `%LOCALAPPDATA%\LMVideoStudio\reports\`
