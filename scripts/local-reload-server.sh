#!/usr/bin/env bash
# Sync server/ dans le conteneur prod + restart (~5–10 s, sans rebuild image).
# Utile pour itérer sur l'API LMS quand le mode dev complet n'est pas lancé.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CID="$(docker compose ps -q wiki)"
if [[ -z "$CID" ]]; then
  echo "Conteneur wiki absent — lancez: bash scripts/local-up.sh ou local-dev.sh" >&2
  exit 1
fi

if docker compose ps wiki-dev --status running -q 2>/dev/null | grep -q .; then
  echo "wiki-dev actif : les fichiers server/ sont déjà montés, pas besoin de ce script." >&2
  exit 0
fi

echo "==> Copie server/ → conteneur wiki"
docker compose cp "$ROOT/server/." "wiki:/wiki/server/"

echo "==> Restart wiki"
docker compose restart wiki

for _ in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)"
  if [[ "$code" == "200" || "$code" == "302" ]]; then
    echo "OK: rechargé (HTTP $code)"
    exit 0
  fi
  sleep 2
done

echo "WARN: wiki pas encore prêt" >&2
exit 1
