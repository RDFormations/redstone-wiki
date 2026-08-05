#!/usr/bin/env bash
# Build image prod + wiki-builder (VPS /opt/redstone-wiki).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export REDSTONE_WIKI_ROOT="$ROOT"
export RDF_FORMATIONS_ROOT="${RDF_FORMATIONS_ROOT:-/home/ubuntu/RDF-formations}"
WIKI_ROOT="${WIKI_ROOT:-/opt/redstone-wiki}"

if [[ -d "$ROOT/.git" ]]; then
  git fetch origin main 2>/dev/null || true
  git pull --ff-only origin main 2>/dev/null || true
fi

if [[ -n "${CURSOR_RDF_ROOT:-}" && -x "$CURSOR_RDF_ROOT/scripts/build-formation-nav.py" ]]; then
  echo "==> Static formations (CursorRDF)"
  export REDSTONE_WIKI_ROOT="$ROOT"
  python3 "$CURSOR_RDF_ROOT/scripts/build-formation-nav.py"
  python3 "$CURSOR_RDF_ROOT/scripts/build-formation-formateur.py" 2>/dev/null || true
fi

echo "==> Sync stack prod → $WIKI_ROOT"
sudo mkdir -p "$WIKI_ROOT/build" "$WIKI_ROOT/data/postgres" "$WIKI_ROOT/data/wiki"
sudo cp "$ROOT/deploy/docker-compose.prod.yml" "$WIKI_ROOT/docker-compose.yml"

if [[ ! -f "$WIKI_ROOT/.env" ]]; then
  sudo tee "$WIKI_ROOT/.env" > /dev/null <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
REDSTONE_WIKI_ROOT=$ROOT
RDF_FORMATIONS_ROOT=$RDF_FORMATIONS_ROOT
EOF
  sudo chmod 600 "$WIKI_ROOT/.env"
else
  grep -q '^REDSTONE_WIKI_ROOT=' "$WIKI_ROOT/.env" 2>/dev/null || \
    echo "REDSTONE_WIKI_ROOT=$ROOT" | sudo tee -a "$WIKI_ROOT/.env" >/dev/null
fi

cd "$WIKI_ROOT"
sudo -E docker compose build wiki
sudo docker tag redstone-wiki:2.5-redstone redstone-wiki:deps 2>/dev/null || true
sudo -E docker compose --profile dev build wiki-builder
sudo -E docker compose up -d wiki

echo "==> redstone-wiki image prête — reload : $ROOT/scripts/reload.sh"
