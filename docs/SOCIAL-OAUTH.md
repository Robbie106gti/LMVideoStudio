# Social OAuth direct upload

Optional **YouTube** and **Meta (Facebook Page)** direct upload for Share Pack exports. Copy-to-clipboard and open-upload assist work without OAuth.

## Quick setup

1. Copy the example config (never commit secrets):

   ```powershell
   Copy-Item config\social-oauth.json.example config\social-oauth.json
   ```

2. Register OAuth apps (below) and paste **client ID** + **client secret** into `config/social-oauth.json`.

3. Restart the LMVideoStudio Host (or full app) so it reloads config.

4. In the app: **Settings → Social upload (OAuth) → Connect** for YouTube and/or Meta.

5. On a project timeline: **Export share pack**, then use **Upload to YouTube** / **Upload to Meta** when connected.

Tokens are stored encrypted under:

`%LOCALAPPDATA%\LMVideoStudio\oauth\`

## Host API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/{provider}/start` | GET | Start PKCE flow (`provider`: `youtube` or `meta`) |
| `/oauth/callback` | GET | OAuth redirect (must match `redirectBase` in config) |
| `/oauth/{provider}` | DELETE | Disconnect account |
| `/settings/connected-accounts` | GET | Connection status for Settings + Share Pack |
| `/projects/{id}/export/share-pack/upload` | POST | Direct upload (`platform`: `youtube` or `meta`) |

Upload body (JSON):

```json
{
  "platform": "youtube",
  "title": "Optional title (defaults to project name)",
  "description": "Optional (defaults to caption.txt)"
}
```

## Google / YouTube

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **OAuth client ID** → type **Desktop app** (or Web application with redirect `http://127.0.0.1:17170/oauth/callback`).
3. Enable **YouTube Data API v3** for the project.
4. Add test users while app is in **Testing** mode.
5. Paste client ID and secret into `config/social-oauth.json` under `youtube`.

Scopes used:

- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube.readonly`

Upload uses `youtube_16x9.mp4` from the share pack folder.

## Meta / Facebook Page

1. Create an app at [Meta for Developers](https://developers.facebook.com/).
2. Add **Facebook Login** product; set valid OAuth redirect URI to `http://127.0.0.1:17170/oauth/callback`.
3. Request permissions for Page posting (App Review may be required for production).
4. Paste App ID and App Secret into `config/social-oauth.json` under `meta`.
5. Connect with a user who administers at least one **Facebook Page**.

Scopes in the example config:

- `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- `instagram_basic`, `instagram_content_publish` (for future Instagram publishing)

Upload posts `reels_9x16.mp4` to the first connected Page via Graph API. **Instagram Reels** publishing requires additional Graph steps and Meta App Review; use **Open Meta Business Suite** for manual Reels upload today.

## Security notes

- `config/social-oauth.json` is gitignored — use only the `.example` file in the repo.
- Access tokens are encrypted with Windows DPAPI (`CurrentUser`) before writing to `%LOCALAPPDATA%\LMVideoStudio\oauth\`.
- OAuth runs on localhost only (`127.0.0.1:17170`); do not expose the Host port to the network.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “OAuth provider is not configured” | Create `config/social-oauth.json` from the example; set `enabled: true` and credentials. |
| Connect opens browser then fails | Redirect URI must exactly match `redirectBase` + `/oauth/callback`. |
| Upload: “No connected account” | Finish browser sign-in; click **Refresh** in Settings. |
| Upload: “Share pack not exported” | Run **Export share pack** first (requires preview or bake MP4). |
| Meta: “requires a connected Facebook Page” | Reconnect Meta; user must manage a Page. |

## Testing (developers)

Unit tests use `LMVS_OAUTH_ROOT` and `LMVS_OAUTH_TEST_PLAINTEXT=1` — no real OAuth or network calls required for CI.
