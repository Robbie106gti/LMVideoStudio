#!/usr/bin/env bash
# Bootstrap Ollama for LMVideoStudio on macOS — verify API, pull manifest models.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== setup-ollama-macos ==="

REACHABLE=0
if curl -sf --max-time 5 "http://localhost:11434/api/tags" >/dev/null 2>&1; then
  REACHABLE=1
  echo "Ollama API reachable at localhost:11434"
else
  echo "Ollama not reachable at localhost:11434"
  if command -v ollama >/dev/null 2>&1; then
    echo "ollama CLI found — start the Ollama app (https://ollama.com/download/mac)"
  elif command -v brew >/dev/null 2>&1; then
    echo "Install with: brew install ollama"
    echo "Then launch Ollama from Applications and re-run this script."
  else
    echo "Install Ollama from https://ollama.com/download/mac"
    exit 1
  fi
fi

SYNC_SCRIPT="$REPO_ROOT/scripts/sync_models.ps1"
if [[ ! -f "$SYNC_SCRIPT" ]]; then
  echo "Missing $SYNC_SCRIPT" >&2
  exit 1
fi

if [[ "$REACHABLE" -eq 1 ]]; then
  echo "Syncing Ollama models from manifest..."
  pwsh -NoProfile -ExecutionPolicy Bypass -File "$SYNC_SCRIPT" -Pull || \
    echo "Model sync reported issues (non-zero exit)"
else
  pwsh -NoProfile -ExecutionPolicy Bypass -File "$SYNC_SCRIPT" -Check || true
fi

echo "setup-ollama-macos complete"
