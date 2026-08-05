#!/usr/bin/env bash
# E2E API LMS RedStone — nécessite Wiki.js local (scripts/local-dev-api.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  export $(grep -v '^#' .env | xargs)
fi

export LMS_E2E_BASE_URL="${LMS_E2E_BASE_URL:-http://127.0.0.1:3000/api/v1}"
export LMS_E2E_SITE_URL="${LMS_E2E_SITE_URL:-${WIKI_URL:-http://127.0.0.1:3000}}"
export REDSTONE_LMS_AGENT_TOKEN="${REDSTONE_LMS_AGENT_TOKEN:-dev-local-test-token}"
export REDSTONE_LMS_FORMATEUR_TOKEN="${REDSTONE_LMS_FORMATEUR_TOKEN:-dev-formateur-token}"
export REDSTONE_LMS_OPS_TOKEN="${REDSTONE_LMS_OPS_TOKEN:-dev-ops-token}"

code="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer ${REDSTONE_LMS_AGENT_TOKEN}" \
  "${LMS_E2E_BASE_URL}/sessions?limit=1" 2>/dev/null || echo 000)"

if [[ "$code" != "200" ]]; then
  echo "Serveur LMS indisponible (HTTP $code) sur ${LMS_E2E_BASE_URL}" >&2
  echo "Lancez d'abord : bash scripts/local-dev-api.sh" >&2
  exit 1
fi

if [[ ! -d node_modules/jest ]]; then
  echo "==> yarn install (jest requis)..."
  docker run --rm -v "$ROOT:/wiki" -v redstone-wiki_wiki-node-modules:/wiki/node_modules \
    -w /wiki redstone-wiki:deps sh -c 'yarn install --frozen-lockfile --non-interactive' 2>/dev/null \
    || npx --yes yarn@1.22.22 install --frozen-lockfile --non-interactive
fi

exec npm run test:redstone:e2e
