#!/usr/bin/env bash
# E2E API LMS RedStone — nécessite Wiki.js local (scripts/local-dev-api.sh).
# Alias de test-redstone.sh --e2e (integration + e2e).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/test-redstone.sh" --e2e
