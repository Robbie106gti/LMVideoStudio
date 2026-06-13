# LMVideoStudio headless MCP (v1 skeleton)

This folder holds a **static tool manifest** for a future Model Context Protocol server.
No MCP server binary ships in v1 — the Host HTTP API remains the integration surface.

## Manifest

- `tools.json` — lists `validate`, `preview`, and `bake` tool descriptors consumed by a future MCP adapter.

## Planned mapping (v1)

| Tool | Host endpoint |
|------|----------------|
| `validate` | `POST /projects/validate` |
| `preview` | `POST /projects/{id}/preview` |
| `bake` | `POST /projects/{id}/bake` |

## Next steps

1. Add a thin MCP server (stdio or HTTP) that reads `tools.json` and proxies to the Host.
2. Wire job SSE (`GET /jobs/{jobId}/events`) for long-running preview/bake tools.
3. Document authentication when Host gains API keys.
