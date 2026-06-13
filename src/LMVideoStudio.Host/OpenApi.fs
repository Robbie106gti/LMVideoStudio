namespace LMVideoStudio.Host

/// OpenAPI 3.0 description for headless REST consumers (mirrors cli/lmvs/lmvs.ps1).
module OpenApi =
    let documentJson =
        """{
  "openapi": "3.0.3",
  "info": {
    "title": "LMVideoStudio Host API",
    "version": "0.1.0",
    "description": "Local REST + SSE on http://127.0.0.1:17170. Headless CLI: cli/lmvs/lmvs.ps1"
  },
  "servers": [{ "url": "http://127.0.0.1:17170" }],
  "paths": {
    "/health": {
      "get": { "summary": "Host liveness", "responses": { "200": { "description": "OK" } } }
    },
    "/system/status": {
      "get": { "summary": "Bootstrap status (Ollama, worker, FFmpeg)", "responses": { "200": { "description": "System status" } } }
    },
    "/api/v1/status": {
      "get": { "summary": "Combined status (CLI status command)", "responses": { "200": { "description": "health + system" } } }
    },
    "/projects/validate": {
      "post": {
        "summary": "Validate project JSON (CLI validate)",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "type": "object" } } } },
        "responses": { "200": { "description": "valid" }, "400": { "description": "invalid" } }
      }
    },
    "/api/v1/validate": {
      "post": {
        "summary": "Alias of /projects/validate",
        "responses": { "200": { "description": "valid" }, "400": { "description": "invalid" } }
      }
    },
    "/projects/{projectId}/preview": {
      "post": { "summary": "Start mockup preview job (CLI preview)", "responses": { "202": { "description": "job accepted" } } },
      "get": { "summary": "Preview artifact status", "responses": { "200": { "description": "ready" }, "404": { "description": "missing" } } }
    },
    "/api/v1/projects/{projectId}/preview": {
      "post": { "summary": "Alias of preview start", "responses": { "202": { "description": "job accepted" } } }
    },
    "/projects/{projectId}/bake": {
      "post": { "summary": "Start bake job (CLI bake)", "responses": { "202": { "description": "job accepted" } } },
      "get": { "summary": "Bake artifact status", "responses": { "200": { "description": "ready" }, "404": { "description": "missing" } } }
    },
    "/api/v1/projects/{projectId}/bake": {
      "post": { "summary": "Alias of bake start", "responses": { "202": { "description": "job accepted" } } }
    },
    "/projects/{projectId}/export/share-pack": {
      "post": { "summary": "Export YouTube + Reels share folder", "responses": { "200": { "description": "share pack created" } } }
    },
    "/projects/{projectId}/blocks/{blockId}/generate": {
      "post": {
        "summary": "Generate thumbnail variants (variantCount 1 or 3)",
        "requestBody": { "content": { "application/json": { "schema": { "type": "object", "properties": { "variantCount": { "type": "integer" }, "prompt": { "type": "string" } } } } } },
        "responses": { "202": { "description": "generation started" } }
      }
    },
    "/jobs/{jobId}/events": {
      "get": { "summary": "SSE job progress", "responses": { "200": { "description": "text/event-stream" } } }
    }
  }
}"""
