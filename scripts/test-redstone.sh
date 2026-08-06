#!/usr/bin/env bash
# RedStone LMS — runner tests (unit offline, e2e avec serveur Wiki local).
#
# Usage:
#   bash scripts/test-redstone.sh           # unitaires seuls (< 10 s, offline)
#   bash scripts/test-redstone.sh --all     # unit + integration + e2e (serveur :3000)
#   bash scripts/test-redstone.sh --e2e     # integration + e2e seulement
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RUN_UNIT=1
RUN_E2E=0

for arg in "$@"; do
  case "$arg" in
    --all) RUN_UNIT=1; RUN_E2E=1 ;;
    --e2e) RUN_UNIT=0; RUN_E2E=1 ;;
    --unit) RUN_UNIT=1; RUN_E2E=0 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "Option inconnue: $arg" >&2
      exit 2
      ;;
  esac
done

ensure_jest() {
  if [[ ! -d node_modules/jest ]]; then
    echo "==> yarn install (jest requis)..."
    if command -v yarn >/dev/null 2>&1; then
      yarn install --frozen-lockfile --non-interactive
    else
      npx --yes yarn@1.22.22 install --frozen-lockfile --non-interactive
    fi
  fi
}

if [[ "$RUN_UNIT" -eq 1 ]]; then
  ensure_jest
  echo "==> Tests unitaires LMS (offline)"
  npm run test:redstone
fi

if [[ "$RUN_E2E" -eq 1 ]]; then
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
    echo "Ou en CI : bash scripts/ci-wiki-up.sh" >&2
    exit 1
  fi

  ensure_jest
  echo "==> Tests integration + e2e LMS"
  npm run test:redstone:integration
  npm run test:redstone:e2e
fi

echo "==> OK — tests RedStone LMS terminés"
