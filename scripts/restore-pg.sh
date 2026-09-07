#!/usr/bin/env bash
# I02 — restore drill (ATTENTION : écrase la base cible)
set -euo pipefail

ARCHIVE="${1:?Usage: $0 <backup.sql.gz>}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICE="${PG_SERVICE:-db}"

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Fichier introuvable: ${ARCHIVE}" >&2
  exit 1
fi

echo "Restore drill depuis ${ARCHIVE}"
gunzip -c "${ARCHIVE}" | docker compose -f "${COMPOSE_FILE}" exec -T "${SERVICE}" \
  psql -U "${POSTGRES_USER:-wikijs}" -d "${POSTGRES_DB:-wiki}"
echo "Restore terminé — vérifier health LMS."
