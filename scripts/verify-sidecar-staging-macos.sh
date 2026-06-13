#!/usr/bin/env bash
# Verify sidecar layout before macOS Tauri .dmg build.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIDECARS_DIR="$REPO_ROOT/sidecars"
WORKER_ROOT="$SIDECARS_DIR/lmvs_worker"
HOST_BIN="$SIDECARS_DIR/LMVideoStudio.Host"
MIN_HOST_BYTES=$((5 * 1024 * 1024))
ALLOW_SPIKE_FALLBACK=0
TAURI_SRC_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-spike-venv-fallback) ALLOW_SPIKE_FALLBACK=1; shift ;;
    --tauri-src-dir) TAURI_SRC_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

errors=()
warnings=()

test_file_size() {
  local path="$1"
  local min_bytes="$2"
  local label="$3"
  if [[ ! -f "$path" ]]; then
    errors+=("Missing $label: $path")
    return
  fi
  local size
  size="$(stat -f%z "$path" 2>/dev/null || stat -c%s "$path")"
  if [[ "$size" -lt "$min_bytes" ]]; then
    errors+=("$label too small ($size bytes, expected >= $min_bytes): $path")
  fi
}

echo "=== verify-sidecar-staging-macos ==="

test_file_size "$HOST_BIN" "$MIN_HOST_BYTES" "Host sidecar (self-contained single-file publish)"

if [[ ! -d "$WORKER_ROOT/lmvs_worker" ]]; then
  errors+=("Missing Python worker package: $WORKER_ROOT/lmvs_worker")
fi

sidecar_venv="$WORKER_ROOT/.venv/bin/python"
spike_venv="$REPO_ROOT/spike/.venv/bin/python"
if [[ ! -x "$sidecar_venv" ]]; then
  if [[ "$ALLOW_SPIKE_FALLBACK" -eq 1 && -x "$spike_venv" ]]; then
    warnings+=("Worker venv not in sidecar; dev builds may use spike/.venv at runtime.")
  else
    errors+=("Missing embedded worker venv: $sidecar_venv")
    errors+=("  Run: ./scripts/build-sidecars-macos.sh")
    errors+=("  Or:  ./scripts/verify-sidecar-staging-macos.sh --allow-spike-venv-fallback (dev only)")
  fi
else
  echo "  worker venv: OK"
fi

if [[ ! -x "$WORKER_ROOT/bin/ffmpeg" ]]; then
  warnings+=("FFmpeg not bundled in sidecar bin (install via brew install ffmpeg and re-run build-sidecars-macos.sh).")
else
  echo "  ffmpeg: OK"
fi

if [[ -n "$TAURI_SRC_DIR" ]]; then
  tauri_sidecars="$TAURI_SRC_DIR/sidecars"
  host_staged="$(find "$tauri_sidecars" -maxdepth 1 -name 'LMVideoStudio.Host*' -type f -print -quit || true)"
  worker_staged="$(find "$tauri_sidecars/lmvs_worker" -maxdepth 1 -name 'run_worker*' -type f -print -quit || true)"
  if [[ -z "$host_staged" ]]; then
    errors+=("Tauri externalBin Host not staged under $tauri_sidecars")
  fi
  if [[ -z "$worker_staged" ]]; then
    errors+=("Tauri externalBin run_worker not staged under $tauri_sidecars/lmvs_worker")
  fi
fi

for w in "${warnings[@]:-}"; do
  [[ -n "$w" ]] && echo "WARNING: $w"
done

if [[ ${#errors[@]} -gt 0 ]]; then
  echo ""
  echo "Sidecar staging FAILED:"
  for e in "${errors[@]}"; do
    echo "  $e"
  done
  exit 1
fi

echo "Sidecar staging OK."
exit 0
