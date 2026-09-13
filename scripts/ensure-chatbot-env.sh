#!/usr/bin/env bash
# Garantit REDSTONE_CHATBOT_URL + TOKEN dans /opt/redstone-wiki/.env (prod).
set -euo pipefail

WIKI_ROOT="${WIKI_ROOT:-/opt/redstone-wiki}"
ENV_FILE="$WIKI_ROOT/.env"
AGENT_ENV="${AGENT_GATEWAY_ENV:-/home/ubuntu/agent-gateway/.env}"
OPS_CHATBOT_URL="${REDSTONE_CHATBOT_OPS_URL:-https://ops.redstoneformations.fr/agent-gateway/lms/chatbot}"
LOCAL_CHATBOT_URL="${REDSTONE_CHATBOT_LOCAL_URL:-http://172.17.0.1:9474/lms/chatbot}"

resolve_chatbot_url() {
  if [[ -n "${REDSTONE_CHATBOT_URL:-}" ]]; then
    echo "$REDSTONE_CHATBOT_URL"
    return
  fi
  if curl -sf --max-time 2 "http://127.0.0.1:9474/health" \
    -H "X-Webhook-Secret: $(grep '^WEBHOOK_SECRET=' "$AGENT_ENV" 2>/dev/null | cut -d= -f2- || true)" \
    >/dev/null 2>&1; then
    echo "$LOCAL_CHATBOT_URL"
    return
  fi
  echo "$OPS_CHATBOT_URL"
}

ensure_line() {
  local key="$1"
  local value="$2"
  if sudo grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sudo sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    echo "==> $key mis à jour dans $ENV_FILE"
  else
    echo "${key}=${value}" | sudo tee -a "$ENV_FILE" >/dev/null
    echo "==> $key ajouté dans $ENV_FILE"
  fi
}

[[ -f "$ENV_FILE" ]] || { echo "Fichier $ENV_FILE absent" >&2; exit 1; }

CHATBOT_URL="$(resolve_chatbot_url)"
ensure_line REDSTONE_CHATBOT_URL "$CHATBOT_URL"
echo "==> REDSTONE_CHATBOT_URL=$CHATBOT_URL"

if ! sudo grep -q '^REDSTONE_CHATBOT_TOKEN=.' "$ENV_FILE" 2>/dev/null; then
  token=""
  if [[ -f "$AGENT_ENV" ]]; then
    token="$(sudo grep '^WEBHOOK_SECRET=' "$AGENT_ENV" 2>/dev/null | cut -d= -f2- || true)"
  fi
  if [[ -z "$token" && -n "${REDSTONE_CHATBOT_TOKEN:-}" ]]; then
    token="$REDSTONE_CHATBOT_TOKEN"
  fi
  if [[ -z "$token" ]]; then
    echo "REDSTONE_CHATBOT_TOKEN manquant — copier WEBHOOK_SECRET de ops agent-gateway dans $ENV_FILE" >&2
    exit 1
  fi
  ensure_line REDSTONE_CHATBOT_TOKEN "$token"
fi

sudo chmod 600 "$ENV_FILE"
