#!/usr/bin/env bash
# Create MPS-capable Python worker venv for macOS arm64 sidecars.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIDECAR_ROOT="$REPO_ROOT/sidecars/lmvs_worker"
PYTHON_ROOT="$REPO_ROOT/python"
REQ_FILE="$PYTHON_ROOT/requirements-worker.txt"
VENV_DIR="$SIDECAR_ROOT/.venv"

SKIP_VENV=0
for arg in "$@"; do
  case "$arg" in
    --skip-venv) SKIP_VENV=1 ;;
  esac
done

echo "=== setup-python-macos ==="

if [[ "$SKIP_VENV" -eq 1 ]]; then
  echo "Skipped venv creation (--skip-venv)"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3.12+ (brew install python@3.12)" >&2
  exit 1
fi

PY_VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
echo "Using python3 ($PY_VER)"

mkdir -p "$SIDECAR_ROOT"

if [[ -d "$VENV_DIR" ]]; then
  echo "Worker venv already exists: $VENV_DIR"
else
  echo "Creating worker venv (MPS torch via pip)..."
  python3 -m venv "$VENV_DIR"
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  python -m pip install --upgrade pip wheel
  python -m pip install torch torchvision torchaudio
  if [[ -f "$REQ_FILE" ]]; then
    python -m pip install -r "$REQ_FILE"
  else
    echo "WARNING: missing $REQ_FILE" >&2
  fi
  deactivate
fi

echo "Verifying MPS availability..."
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
(
  cd "$SIDECAR_ROOT"
  PYTHONPATH="$SIDECAR_ROOT" python - <<'PY'
from lib.gpu_utils import print_device_info
print_device_info("worker")
PY
)
deactivate

echo "setup-python-macos complete"
