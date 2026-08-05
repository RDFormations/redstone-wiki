#!/usr/bin/env bash
# Dev API LMS — server/ monté + node --watch (~10 s démarrage, ~2 s par modif).
# Pas de rebuild image, pas de webpack. Recommandé pour itérer sur server/modules/redstone/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CURSOR_RDF="${CURSOR_RDF_ROOT:-$(cd "$ROOT/../CursorRDF" 2>/dev/null && pwd || echo /root/CursorRDF)}"
FORMATIONS="${RDF_FORMATIONS_ROOT:-$CURSOR_RDF/formations}"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

export REDSTONE_WIKI_ROOT="$ROOT"
export RDF_FORMATIONS_ROOT="$FORMATIONS"
export $(grep -v '^#' .env | xargs)

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)

if ! docker image inspect redstone-wiki:2.5-redstone >/dev/null 2>&1; then
  echo "==> Image release absente — build initial requis..."
  docker compose build wiki
fi

echo "==> Arrêt wiki / wiki-dev (libère le port 3000)..."
docker compose stop wiki 2>/dev/null || true
"${COMPOSE[@]}" stop wiki-dev wiki-dev-api 2>/dev/null || true

echo "==> Démarrage db + wiki-dev-api..."
"${COMPOSE[@]}" up -d db wiki-dev-api

for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)"
  if [[ "$code" == "200" || "$code" == "302" ]]; then
    echo "OK: Wiki API dev (HTTP $code)"
    break
  fi
  sleep 2
done

if [[ -x "$CURSOR_RDF/scripts/configure-wiki-redstone.py" ]]; then
  echo "==> Activation renderers Wiki (markdownCore, Mermaid…)…"
  WIKI_URL="${WIKI_URL:-http://127.0.0.1:3000}" \
  WIKI_SITE_HOST="${WIKI_SITE_HOST:-http://127.0.0.1:3000}" \
    python3 "$CURSOR_RDF/scripts/configure-wiki-redstone.py" || echo "WARN: configure-wiki-redstone (wiki pas prêt ?)"
fi

echo ""
echo "Mode DEV API — modifier server/ → redémarrage auto (node --watch)"
echo "  Wiki   : http://127.0.0.1:3000"
echo "  API    : http://127.0.0.1:3000/api/v1"
echo "  Logs   : ${COMPOSE[*]} logs -f wiki-dev-api"
echo "  Stop   : bash scripts/local-dev-stop.sh"
echo "  UI HMR : bash scripts/local-dev.sh"
