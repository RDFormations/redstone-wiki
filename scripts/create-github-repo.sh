#!/usr/bin/env bash
# Crée RDFormations/redstone-wiki (public) et pousse main — nécessite gh auth login
set -euo pipefail

ORG="${GITHUB_ORG:-RDFormations}"
NAME="${GITHUB_REPO_NAME:-redstone-wiki}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null; then
  echo "Installer gh : apt install gh && gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh non authentifié — gh auth login" >&2
  exit 1
fi

if gh repo view "$ORG/$NAME" >/dev/null 2>&1; then
  echo "==> Repo existe déjà : https://github.com/$ORG/$NAME"
else
  gh repo create "$ORG/$NAME" --public \
    --description "Wiki.js v2.5.314 fork — RedStone Formations portail"
  echo "==> Repo créé"
fi

git remote set-url origin "git@github.com:$ORG/$NAME.git"
git push -u origin main
git push origin redstone/2.5.314 2>/dev/null || true

echo "==> https://github.com/$ORG/$NAME"
