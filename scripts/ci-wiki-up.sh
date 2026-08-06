#!/usr/bin/env bash
# Bootstrap Wiki.js local pour CI (db + wiki-dev-api + setup minimal).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CURSOR_RDF="${CURSOR_RDF_ROOT:-$(cd "$ROOT/../CursorRDF" 2>/dev/null && pwd || echo /root/CursorRDF)}"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

export REDSTONE_WIKI_ROOT="$ROOT"
export RDF_FORMATIONS_ROOT="${RDF_FORMATIONS_ROOT:-/tmp/rdf-formations-ci}"
mkdir -p "$RDF_FORMATIONS_ROOT" data/postgres data/wiki
chmod -R 777 data/postgres data/wiki 2>/dev/null || true
export $(grep -v '^#' .env | xargs)

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)

echo "==> Build image release (wiki-dev-api)..."
docker build -t redstone-wiki:2.5-redstone --target release .

echo "==> Démarrage db + wiki-dev-api..."
"${COMPOSE[@]}" up -d db wiki-dev-api

echo "==> Attente Wiki.js..."
ready=0
for _ in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)"
  if [[ "$code" == "200" || "$code" == "302" ]]; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "Wiki.js non prêt après 180 s" >&2
  "${COMPOSE[@]}" logs wiki-dev-api | tail -80 >&2 || true
  exit 1
fi

if curl -s http://127.0.0.1:3000/ | grep -q 'Wiki.js Setup'; then
  echo "==> Finalisation setup Wiki.js"
  curl -sS -X POST http://127.0.0.1:3000/finalize \
    -H 'Content-Type: application/json' \
    -d "{\"adminEmail\":\"${WIKI_ADMIN_EMAIL:-admin@redstone.local}\",\"adminPassword\":\"${WIKI_ADMIN_PASSWORD:-redstone-local-test}\",\"adminPasswordConfirm\":\"${WIKI_ADMIN_PASSWORD:-redstone-local-test}\",\"siteUrl\":\"http://127.0.0.1:3000\",\"telemetry\":false}"
  sleep 15
  for loc in en fr; do
    python3 - <<PY
import json, os, urllib.request, time
url='http://127.0.0.1:3000/graphql'
email=os.environ.get('WIKI_ADMIN_EMAIL','admin@redstone.local')
pwd=os.environ.get('WIKI_ADMIN_PASSWORD','redstone-local-test')
def gql(q,v=None,t=None):
    h={'Content-Type':'application/json'}
    if t: h['Authorization']=f'Bearer {t}'
    b={'query':q}
    if v: b['variables']=v
    r=urllib.request.Request(url,data=json.dumps(b).encode(),headers=h,method='POST')
    d=json.loads(urllib.request.urlopen(r,timeout=60).read())
    if d.get('errors'): raise SystemExit(d['errors'])
    return d['data']
for _ in range(8):
    try:
        t=gql('mutation($e:String!,$p:String!){authentication{login(username:$e,password:$p,strategy:\"local\"){jwt}}}',{'e':email,'p':pwd})['authentication']['login']['jwt']
        break
    except Exception:
        time.sleep(5)
else:
    raise SystemExit('login failed')
gql('mutation($l:String!){localization{downloadLocale(locale:$l){responseResult{succeeded}}}}',{'l':'$loc'},t)
PY
  done
fi

if [[ -x "$CURSOR_RDF/scripts/configure-wiki-redstone.py" ]]; then
  WIKI_URL="${WIKI_URL:-http://127.0.0.1:3000}" \
  WIKI_SITE_HOST="${WIKI_SITE_HOST:-http://127.0.0.1:3000}" \
    python3 "$CURSOR_RDF/scripts/configure-wiki-redstone.py" || echo "WARN: configure-wiki-redstone"
fi

code="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer ${REDSTONE_LMS_AGENT_TOKEN:-dev-local-test-token}" \
  "http://127.0.0.1:3000/api/v1/sessions?limit=1" 2>/dev/null || echo 000)"
if [[ "$code" != "200" ]]; then
  echo "API LMS non prête (HTTP $code)" >&2
  "${COMPOSE[@]}" logs wiki-dev-api | tail -80 >&2 || true
  exit 1
fi

echo "OK: Wiki.js + API LMS prêts pour e2e (HTTP $code)"
