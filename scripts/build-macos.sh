#!/usr/bin/env bash
# Build LMVideoStudio .dmg for macOS arm64 (Apple Silicon).
#
# Produces Tauri bundle artifacts under:
#   src/LMVideoStudio.Tauri/src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/
#
# Prerequisites: Xcode CLT, dotnet 8, Node 20, Rust (aarch64-apple-darwin), pwsh (model sync).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LMVS_REPO_ROOT="$REPO_ROOT"

TAURI_DIR="$REPO_ROOT/src/LMVideoStudio.Tauri"
TAURI_SRC="$TAURI_DIR/src-tauri"
TAURI_CONF="$TAURI_SRC/tauri.macos.conf.json"
CLIENT_DIR="$REPO_ROOT/src/LMVideoStudio.Client"
SLN="$REPO_ROOT/LMVideoStudio.sln"
WORKER_STUB="$REPO_ROOT/scripts/run_worker_stub.rs"
TARGET="aarch64-apple-darwin"
RUNTIME="osx-arm64"
CONFIGURATION="Release"

SKIP_SIDECARS=0
SKIP_VENV_COPY=0
ALLOW_SPIKE_VENV_FALLBACK=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./scripts/build-macos.sh [options]

  --skip-sidecars              Skip build-sidecars-macos.sh
  --skip-venv-copy             Pass --skip-venv-copy to sidecar build (dev/CI)
  --allow-spike-venv-fallback  Allow spike/.venv during verify (dev/CI only)
  --dry-run                    Print steps and exit
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-sidecars) SKIP_SIDECARS=1; shift ;;
    --skip-venv-copy) SKIP_VENV_COPY=1; shift ;;
    --allow-spike-venv-fallback) ALLOW_SPIKE_VENV_FALLBACK=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

step() {
  echo ""
  echo "==> $*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "build-macos.sh must run on macOS (Darwin)." >&2
  echo "From Windows, use: pwsh ./scripts/build-macos.ps1 -DryRun" >&2
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "WARNING: expected Apple Silicon (arm64); current arch is $(uname -m)" >&2
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  cat <<EOF
LMVideoStudio macOS arm64 build (dry run)
Repo: $REPO_ROOT

Steps:
  1. ./scripts/build-sidecars-macos.sh
  2. dotnet build + Fable/Vite client
  3. Stage Tauri externalBin sidecars ($TARGET)
  4. npm run tauri build -- --target $TARGET --config src-tauri/tauri.macos.conf.json

See docs/MACOS-PORT.md for Ollama bootstrap and Gate validation.
EOF
  exit 0
fi

step "Check build prerequisites"
require_cmd dotnet
require_cmd node
require_cmd npm
require_cmd rustc
require_cmd cargo

if [[ ! -f "$TAURI_CONF" ]]; then
  echo "Missing Tauri macOS overlay: $TAURI_CONF" >&2
  exit 1
fi

step "Build .NET solution ($CONFIGURATION)"
if [[ -f "$SLN" ]]; then
  dotnet build "$SLN" -c "$CONFIGURATION"
else
  dotnet build "$REPO_ROOT/src/LMVideoStudio.Host/LMVideoStudio.Host.fsproj" -c "$CONFIGURATION"
fi

if [[ "$SKIP_SIDECARS" -eq 0 ]]; then
  step "Build sidecars (Host + MPS worker)"
  sidecar_args=()
  [[ "$SKIP_VENV_COPY" -eq 1 ]] && sidecar_args+=(--skip-venv-copy)
  bash "$REPO_ROOT/scripts/build-sidecars-macos.sh" "${sidecar_args[@]}"
else
  echo "Skipped sidecars (--skip-sidecars)"
fi

step "Verify sidecar layout"
verify_args=()
[[ "$ALLOW_SPIKE_VENV_FALLBACK" -eq 1 ]] && verify_args+=(--allow-spike-venv-fallback)
bash "$REPO_ROOT/scripts/verify-sidecar-staging-macos.sh" "${verify_args[@]}"

step "Fable compile + Vite production build"
pushd "$CLIENT_DIR" >/dev/null
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run fable
npm run build
popd >/dev/null

step "Stage Tauri external sidecars"
TRIPLE="$(rustc -Vv | awk '/^host:/ { print $2 }')"
echo "  target triple: $TRIPLE"

DEST_ROOT="$TAURI_SRC/sidecars"
HOST_SRC="$REPO_ROOT/sidecars/LMVideoStudio.Host"
if [[ ! -f "$HOST_SRC" ]]; then
  echo "Missing Host sidecar: $HOST_SRC (run ./scripts/build-sidecars-macos.sh)" >&2
  exit 1
fi

mkdir -p "$DEST_ROOT/lmvs_worker"
HOST_DEST="$DEST_ROOT/LMVideoStudio.Host-$TRIPLE"
cp -f "$HOST_SRC" "$HOST_DEST"
chmod +x "$HOST_DEST"
echo "  staged: $HOST_DEST"

WORKER_DEST="$DEST_ROOT/lmvs_worker/run_worker-$TRIPLE"
rustc "$WORKER_STUB" -O -o "$WORKER_DEST"
chmod +x "$WORKER_DEST"
echo "  staged: $WORKER_DEST"

bash "$REPO_ROOT/scripts/verify-sidecar-staging-macos.sh" \
  --tauri-src-dir "$TAURI_SRC" \
  $( [[ "$ALLOW_SPIKE_VENV_FALLBACK" -eq 1 ]] && echo --allow-spike-venv-fallback )

step "Tauri bundle (.dmg, unsigned)"
pushd "$TAURI_DIR" >/dev/null
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
export TAURI_DISABLE_UPDATER="${TAURI_DISABLE_UPDATER:-true}"
set +e
npm run tauri build -- --target "$TARGET" --config "src-tauri/tauri.macos.conf.json"
tauri_exit=$?
set -e
unset TAURI_DISABLE_UPDATER

BUNDLE_ROOT="$TAURI_SRC/target/$TARGET/release/bundle"
has_dmg=0
if compgen -G "$BUNDLE_ROOT/dmg/"*.dmg >/dev/null 2>&1; then
  has_dmg=1
fi

if [[ "$tauri_exit" -ne 0 && "$has_dmg" -eq 1 ]]; then
  echo "  Tauri reported updater/signing issues; .dmg may still be present." >&2
elif [[ "$tauri_exit" -ne 0 ]]; then
  exit "$tauri_exit"
fi
popd >/dev/null

step "Done"
echo "Installer artifacts (if build succeeded):"
find "$BUNDLE_ROOT" -name '*.dmg' -print 2>/dev/null || true
echo ""
echo "Next: open the .dmg, drag LMVideoStudio to Applications, launch, and verify:"
echo "  GET http://127.0.0.1:17170/health"
echo "  GET http://127.0.0.1:8765/health"
echo "Configure minisign pubkey in tauri.macos.conf.json before release publish."
