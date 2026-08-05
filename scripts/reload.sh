#!/usr/bin/env bash
# Rebuild webpack assets depuis le clone redstone-wiki (itération UI ~1–3 min).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_ROOT="${WIKI_ROOT:-/opt/redstone-wiki}"
MODE="fast"
RESTART=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cold) MODE="cold" ;;
    --no-restart) RESTART=0 ;;
    -h|--help)
      echo "Usage: $0 [--cold] [--no-restart]"
      exit 0
      ;;
    *) echo "Option: $1" >&2; exit 1 ;;
  esac
  shift
done

export DOCKER_BUILDKIT=1
export REDSTONE_WIKI_ROOT="$ROOT"
export RDF_FORMATIONS_ROOT="${RDF_FORMATIONS_ROOT:-/home/ubuntu/RDF-formations}"

if [[ -n "${CURSOR_RDF_ROOT:-}" && -x "$CURSOR_RDF_ROOT/scripts/build-formation-nav.py" ]]; then
  echo "==> Static formations"
  python3 "$CURSOR_RDF_ROOT/scripts/build-formation-nav.py"
  if [[ -n "${WIKI_ADMIN_EMAIL:-}" ]]; then
    python3 "$CURSOR_RDF_ROOT/scripts/refresh-formation-nav-published.py" --all || true
  fi
fi

sudo mkdir -p "$WIKI_ROOT/build"
sudo cp "$ROOT/deploy/docker-compose.prod.yml" "$WIKI_ROOT/docker-compose.yml"
grep -q '^REDSTONE_WIKI_ROOT=' "$WIKI_ROOT/.env" 2>/dev/null || \
  echo "REDSTONE_WIKI_ROOT=$ROOT" | sudo tee -a "$WIKI_ROOT/.env" >/dev/null

cd "$WIKI_ROOT"

build_fast() {
  sudo -E docker compose --profile dev build wiki-builder
  sudo -E docker compose --profile dev run --rm wiki-builder
}

build_cold() {
  sudo docker build -f "$ROOT/Dockerfile" --target assets -t redstone-wiki:assets-cache "$ROOT"
  cid="$(sudo docker create redstone-wiki:assets-cache)"
  sudo rm -rf "$WIKI_ROOT/build/assets" "$WIKI_ROOT/build/server"
  sudo mkdir -p "$WIKI_ROOT/build/assets" "$WIKI_ROOT/build/server"
  sudo docker cp "$cid:/wiki/assets/." "$WIKI_ROOT/build/assets/"
  sudo docker cp "$cid:/wiki/server/." "$WIKI_ROOT/build/server/"
  sudo docker rm -f "$cid"
}

case "$MODE" in
  fast) build_fast || build_cold ;;
  cold) build_cold ;;
esac

wiki_cid="$(sudo docker compose ps -q wiki)"
[[ -n "$wiki_cid" ]] || { echo "wiki container missing — run build-image.sh" >&2; exit 1; }

sudo docker cp "$WIKI_ROOT/build/assets/." "$wiki_cid:/wiki/assets/"
sudo docker cp "$WIKI_ROOT/build/server/." "$wiki_cid:/wiki/server/"

if [[ "$RESTART" -eq 1 ]]; then
  sudo docker compose restart wiki
fi

echo "==> Reload OK ($(date -u +%H:%M:%S) UTC)"
