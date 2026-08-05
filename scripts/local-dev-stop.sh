#!/usr/bin/env bash
# Arrête le mode dev et relance le conteneur prod (image release).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export REDSTONE_WIKI_ROOT="$ROOT"
export $(grep -v '^#' .env 2>/dev/null | xargs)

COMPOSE_DEV=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)

echo "==> Arrêt wiki-dev..."
"${COMPOSE_DEV[@]}" stop wiki-dev wiki-dev-api 2>/dev/null || true
"${COMPOSE_DEV[@]}" rm -f wiki-dev wiki-dev-api 2>/dev/null || true

echo "==> Redémarrage wiki (image release)..."
docker compose up -d wiki

for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)"
  [[ "$code" == "200" || "$code" == "302" ]] && echo "OK: wiki prod (HTTP $code)" && exit 0
  sleep 2
done

echo "WARN: wiki pas encore prêt — vérifiez: docker compose logs wiki" >&2
