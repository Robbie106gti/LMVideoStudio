#!/usr/bin/env bash
# Verify LMVideoStudio's local AI provider on macOS. Never installs provider software.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROVIDER="${LMVS_LOCAL_AI_PROVIDER:-lemonade}"

if [[ "$PROVIDER" != "lemonade" && "$PROVIDER" != "ollama" ]]; then
  echo "Unsupported LMVS_LOCAL_AI_PROVIDER '$PROVIDER' (expected lemonade or ollama)" >&2
  exit 1
fi

if [[ "$PROVIDER" == "lemonade" ]]; then
  BASE_URL="${LMVS_LOCAL_AI_BASE_URL:-http://127.0.0.1:13305}"
  HEALTH_PATH="/api/v1/health"
else
  BASE_URL="${LMVS_LOCAL_AI_BASE_URL:-http://127.0.0.1:11434}"
  HEALTH_PATH="/api/tags"
fi

echo "=== setup-local-ai-macos ($PROVIDER) ==="
if ! curl -sf --max-time 5 "$BASE_URL$HEALTH_PATH" >/dev/null; then
  echo "$PROVIDER is not reachable at $BASE_URL." >&2
  echo "Install or launch the provider separately; LMVideoStudio does not install it." >&2
  exit 1
fi

echo "$PROVIDER API reachable at $BASE_URL"
LMVS_LOCAL_AI_PROVIDER="$PROVIDER" pwsh -NoProfile -File "$REPO_ROOT/scripts/sync_models.ps1" -Check -LocalAiOnly -ModelProvider "$PROVIDER"
echo "setup-local-ai-macos complete"
