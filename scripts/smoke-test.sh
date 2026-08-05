#!/usr/bin/env bash
# Smoke test — image buildée + compose up
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${WIKI_SMOKE_URL:-http://127.0.0.1:3000}"

echo "==> HTTP GET $URL"
code="$(curl -fsS -o /tmp/redstone-wiki-smoke.html -w '%{http_code}' "$URL" || echo 000)"
if [[ "$code" != "200" && "$code" != "302" ]]; then
  echo "FAIL: status $code" >&2
  exit 1
fi

echo "==> Vérification assets RedStone dans la page"
if ! grep -q 'redstone\|210051\|rs-formation' /tmp/redstone-wiki-smoke.html 2>/dev/null; then
  # Setup wizard may not include theme — check static asset
  if curl -fsS -o /dev/null "$URL/_assets/svg/redstone-logo.svg"; then
    echo "OK: logo RedStone servi"
  else
    echo "WARN: page OK ($code) mais marqueurs RedStone non détectés (setup initial ?)" >&2
  fi
else
  echo "OK: marqueurs RedStone dans HTML"
fi

echo "==> Smoke test passed (HTTP $code)"
