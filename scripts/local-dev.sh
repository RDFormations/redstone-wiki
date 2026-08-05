#!/usr/bin/env bash
# Stack dev locale — code monté, rechargement auto (pas de rebuild image à chaque modif).
# Premier démarrage : build image deps (~cache Docker) + yarn install dans le volume.
# Itérations suivantes : modifier server/ ou client/ → redémarrage auto (~2–5 s).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CURSOR_RDF="${CURSOR_RDF_ROOT:-$(cd "$ROOT/../CursorRDF" 2>/dev/null && pwd || echo /root/CursorRDF)}"
FORMATIONS="${RDF_FORMATIONS_ROOT:-$CURSOR_RDF/formations}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Créé .env depuis .env.example"
fi

export REDSTONE_WIKI_ROOT="$ROOT"
export RDF_FORMATIONS_ROOT="$FORMATIONS"
export $(grep -v '^#' .env | xargs)

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)

sudo chown -R 70:70 "$ROOT/data/postgres" 2>/dev/null || chown -R 70:70 "$ROOT/data/postgres"
sudo chown -R 1000:1000 "$ROOT/data/wiki" 2>/dev/null || chown -R 1000:1000 "$ROOT/data/wiki"

echo "==> Build image deps (une fois, cache Docker ensuite)..."
"${COMPOSE[@]}" build wiki-dev

echo "==> Arrêt conteneur prod (libère le port 3000)..."
docker compose stop wiki 2>/dev/null || true

echo "==> Démarrage db + wiki-dev..."
"${COMPOSE[@]}" up -d db wiki-dev

echo "==> Attente Wiki.js dev (webpack initial ~1–3 min la 1ère fois)..."
for _ in $(seq 1 120); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)"
  if [[ "$code" == "200" || "$code" == "302" ]]; then
    echo "OK: Wiki.js dev répond (HTTP $code)"
    break
  fi
  sleep 3
done

echo ""
echo "Mode DEV actif — modifications server/ et client/ → rechargement auto"
echo "  Wiki   : http://127.0.0.1:3000"
echo "  API    : http://127.0.0.1:3000/api/v1"
echo "  Logs   : ${COMPOSE[*]} logs -f wiki-dev"
echo "  Stop   : bash scripts/local-dev-stop.sh"
echo "  Sync API seul (conteneur prod) : bash scripts/local-reload-server.sh"
