#!/usr/bin/env bash
# I02 — backup PostgreSQL LMS RedStone
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICE="${PG_SERVICE:-db}"
BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/redstone-wiki-${STAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"
echo "Backup → ${OUT}"
docker compose -f "${COMPOSE_FILE}" exec -T "${SERVICE}" \
  pg_dump -U "${POSTGRES_USER:-wikijs}" "${POSTGRES_DB:-wiki}" \
  | gzip -c > "${OUT}"
echo "OK $(du -h "${OUT}" | awk '{print $1}')"
