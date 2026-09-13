#!/usr/bin/env bash
# M04 — Garantit MONDAY_API_TOKEN + colonnes M03 dans /opt/redstone-wiki/.env (prod).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_ROOT="${WIKI_ROOT:-/opt/redstone-wiki}"
ENV_FILE="$WIKI_ROOT/.env"
COLS_FILE="${MONDAY_LMS_COLS_FILE:-$ROOT/config/monday-lms-columns.prod.env}"

ensure_line() {
  local key="$1"
  local value="$2"
  if sudo grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    echo "==> $key mis à jour"
  else
    echo "${key}=${value}" | sudo tee -a "$ENV_FILE" >/dev/null
    echo "==> $key ajouté"
  fi
}

[[ -f "$ENV_FILE" ]] || { echo "Fichier $ENV_FILE absent" >&2; exit 1; }

if [[ -f "$COLS_FILE" ]]; then
  echo "==> Colonnes M03 depuis $COLS_FILE"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" != *=* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    ensure_line "$key" "$val"
  done < "$COLS_FILE"
else
  echo "WARN: $COLS_FILE absent — colonnes M03 non mises à jour" >&2
fi

if ! sudo grep -q '^MONDAY_API_TOKEN=.' "$ENV_FILE" 2>/dev/null \
  && ! sudo grep -q '^MONDAY_TOKEN=.' "$ENV_FILE" 2>/dev/null; then
  for src in /home/ubuntu/CursorRDF/.env /home/ubuntu/redstone-wiki/.env; do
    [[ -f "$src" ]] || continue
    token="$(grep -E '^MONDAY_(API_)?TOKEN=' "$src" 2>/dev/null | head -1 | cut -d= -f2- || true)"
    if [[ -n "$token" ]]; then
      ensure_line MONDAY_API_TOKEN "$token"
      break
    fi
  done
fi

if ! sudo grep -q '^WIKI_SITE_HOST=.' "$ENV_FILE" 2>/dev/null; then
  ensure_line WIKI_SITE_HOST "https://formation.redstoneformations.fr"
fi

sudo chmod 600 "$ENV_FILE"
echo "==> ensure-monday-lms-env OK"
