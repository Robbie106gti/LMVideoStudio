#!/usr/bin/env bash
# Phase 0 sidecar build for macOS arm64 — worker source, MPS venv, Host publish, ffmpeg.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIDECAR_ROOT="$REPO_ROOT/sidecars/lmvs_worker"
SIDECARS_DIR="$REPO_ROOT/sidecars"
SPIKE_ROOT="$REPO_ROOT/spike"
PYTHON_ROOT="$REPO_ROOT/python"
RUNTIME="osx-arm64"

SKIP_VENV_COPY=0
SKIP_HOST_PUBLISH=0
FORCE=0

usage() {
  cat <<'EOF'
Usage: ./scripts/build-sidecars-macos.sh [options]

  --skip-venv-copy     Do not create/copy worker .venv (dev only)
  --skip-host-publish  Skip dotnet publish of LMVideoStudio.Host
  --force              Refresh copied trees even when present
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-venv-copy) SKIP_VENV_COPY=1; shift ;;
    --skip-host-publish) SKIP_HOST_PUBLISH=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

echo "=== build-sidecars-macos ($RUNTIME) ==="

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet SDK 8.x required" >&2
  exit 1
fi

resolve_worker_sources() {
  if [[ -d "$PYTHON_ROOT/lmvs_worker" ]]; then
    WORKER_SRC="$PYTHON_ROOT/lmvs_worker"
  else
    WORKER_SRC="$SPIKE_ROOT/lmvs_worker"
  fi
  if [[ -d "$PYTHON_ROOT/lib" ]]; then
    LIB_SRC="$PYTHON_ROOT/lib"
  else
    LIB_SRC="$SPIKE_ROOT/lib"
  fi
}

copy_tree() {
  local src="$1"
  local dest="$2"
  if [[ ! -d "$src" ]]; then
    echo "Missing source: $src" >&2
    exit 1
  fi
  rm -rf "$dest"
  mkdir -p "$dest"
  rsync -a --exclude '__pycache__' "$src/" "$dest/"
}

copy_ffmpeg_bundle() {
  local bin_dest="$1"
  mkdir -p "$bin_dest"
  local copied=0
  local saw_ffmpeg=0
  local saw_ffprobe=0
  local candidates=()

  if command -v ffmpeg >/dev/null 2>&1; then
    local ffmpeg_path
    ffmpeg_path="$(command -v ffmpeg)"
    candidates+=("$ffmpeg_path")
    candidates+=("$(dirname "$ffmpeg_path")/ffprobe")
  fi
  if [[ -n "${FFMPEG_HOME:-}" ]]; then
    candidates+=("$FFMPEG_HOME/bin/ffmpeg" "$FFMPEG_HOME/ffmpeg")
    candidates+=("$FFMPEG_HOME/bin/ffprobe" "$FFMPEG_HOME/ffprobe")
  fi

  for path in "${candidates[@]}"; do
    [[ -z "$path" || ! -x "$path" ]] && continue
    local leaf
    leaf="$(basename "$path")"
    if [[ "$leaf" == "ffmpeg" && "$saw_ffmpeg" -eq 0 ]]; then
      cp -f "$path" "$bin_dest/ffmpeg"
      echo "Bundled ffmpeg -> $bin_dest"
      saw_ffmpeg=1
      copied=$((copied + 1))
    elif [[ "$leaf" == "ffprobe" && "$saw_ffprobe" -eq 0 ]]; then
      cp -f "$path" "$bin_dest/ffprobe"
      echo "Bundled ffprobe -> $bin_dest"
      saw_ffprobe=1
      copied=$((copied + 1))
    fi
  done

  if [[ "$copied" -eq 0 ]]; then
    echo "WARNING: FFmpeg not found (brew install ffmpeg for Ken Burns export)"
  fi
}

publish_host_sidecar() {
  local output_dir="$1"
  local proj
  proj="$(find "$REPO_ROOT/src" -name '*Host*.fsproj' -print -quit || true)"
  if [[ -z "$proj" ]]; then
    echo "No *Host*.fsproj under src/ — skip Host publish"
    return 0
  fi

  local publish_dir="$output_dir/host_publish"
  rm -rf "$publish_dir"
  echo "Publishing Host (self-contained single-file, $RUNTIME): $proj"
  dotnet publish "$proj" -c Release -r "$RUNTIME" -o "$publish_dir" \
    --self-contained true \
    -p:PublishSingleFile=true \
    -p:IncludeNativeLibrariesForSelfExtract=true

  local host_bin="$publish_dir/LMVideoStudio.Host"
  if [[ ! -x "$host_bin" ]]; then
    host_bin="$(find "$publish_dir" -maxdepth 1 -type f -perm +111 -print -quit || true)"
  fi
  if [[ -n "$host_bin" && -f "$host_bin" ]]; then
    cp -f "$host_bin" "$output_dir/LMVideoStudio.Host"
    chmod +x "$output_dir/LMVideoStudio.Host"
    echo "Host executable: $output_dir/LMVideoStudio.Host"
  else
    echo "WARNING: publish succeeded but LMVideoStudio.Host not found in $publish_dir"
  fi
}

resolve_worker_sources
mkdir -p "$SIDECAR_ROOT" "$SIDECARS_DIR"

for pair in "lmvs_worker:$WORKER_SRC" "lib:$LIB_SRC"; do
  name="${pair%%:*}"
  src="${pair#*:}"
  dest="$SIDECAR_ROOT/$name"
  if [[ -d "$dest" && "$FORCE" -eq 0 ]]; then
    echo "Exists: $dest (use --force to refresh)"
  else
    copy_tree "$src" "$dest"
    echo "Copied $name -> $dest"
  fi
done

for models_src in "$PYTHON_ROOT/models" "$SPIKE_ROOT/models"; do
  if [[ -d "$models_src" ]]; then
    rsync -a "$models_src/" "$SIDECAR_ROOT/models/"
    break
  fi
done

req_src="$PYTHON_ROOT/requirements-worker.txt"
[[ -f "$req_src" ]] || req_src="$SPIKE_ROOT/requirements-spike.txt"
if [[ -f "$req_src" ]]; then
  cp -f "$req_src" "$SIDECAR_ROOT/requirements-worker.txt"
fi

if [[ "$SKIP_VENV_COPY" -eq 0 ]]; then
  if [[ -d "$SIDECAR_ROOT/.venv" && "$FORCE" -eq 0 ]]; then
    echo "Venv exists: $SIDECAR_ROOT/.venv (use --force to recreate)"
  else
    bash "$REPO_ROOT/scripts/setup-python-macos.sh"
  fi
else
  echo "Skipped venv copy (--skip-venv-copy)"
fi

copy_ffmpeg_bundle "$SIDECAR_ROOT/bin"

cat >"$SIDECAR_ROOT/run_worker.sh" <<'LAUNCH'
#!/usr/bin/env bash
cd "$(dirname "$0")"
export PATH="$(pwd)/bin:$PATH"
PYTHON="$(pwd)/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  PYTHON="$(cd ../.. && pwd)/spike/.venv/bin/python"
fi
if [[ ! -x "$PYTHON" ]]; then
  echo "ERROR: No worker venv found."
  echo "  Run: ./scripts/build-sidecars-macos.sh"
  exit 1
fi
exec "$PYTHON" -m uvicorn lmvs_worker.main:app --host 127.0.0.1 --port "${LMVS_WORKER_PORT:-8765}"
LAUNCH
chmod +x "$SIDECAR_ROOT/run_worker.sh"

if [[ "$SKIP_HOST_PUBLISH" -eq 0 ]]; then
  publish_host_sidecar "$SIDECARS_DIR" || echo "Host publish skipped/failed"
fi

bash "$REPO_ROOT/scripts/verify-sidecar-staging-macos.sh" \
  $( [[ "$SKIP_VENV_COPY" -eq 1 ]] && echo --allow-spike-venv-fallback )

echo ""
echo "Sidecar ready at: $SIDECAR_ROOT"
echo "Test: cd sidecars/lmvs_worker && ./run_worker.sh"
