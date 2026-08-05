#!/usr/bin/env bash
# Sync overlay depuis CursorRDF (dev) vers ce fork — après edits dans infra/formation-portal/wiki-custom/
set -euo pipefail

CURSOR_RDF="${CURSOR_RDF_ROOT:-/root/CursorRDF}"
SRC="$CURSOR_RDF/infra/formation-portal/wiki-custom"
DEST="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$SRC/client" ]]; then
  echo "Source introuvable: $SRC" >&2
  exit 1
fi

rsync -a --delete "$SRC/" "$DEST/"
echo "==> Overlay synchronisé $SRC → $DEST"
echo "    git diff --stat && commit dans redstone-wiki"
