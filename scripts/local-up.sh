#!/usr/bin/env bash
# Stack locale RedStone Wiki.js — setup + formation de démo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CURSOR_RDF="${CURSOR_RDF_ROOT:-$(cd "$ROOT/../CursorRDF" 2>/dev/null && pwd || echo /root/CursorRDF)}"
FORMATIONS="${RDF_FORMATIONS_ROOT:-$CURSOR_RDF/formations}"
DEMO_SLUG="${WIKI_DEMO_SLUG:-quiris-admin-m365}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Créé .env depuis .env.example"
fi

# Permissions volumes Docker
sudo chown -R 70:70 "$ROOT/data/postgres" 2>/dev/null || chown -R 70:70 "$ROOT/data/postgres"
sudo chown -R 1000:1000 "$ROOT/data/wiki" 2>/dev/null || chown -R 1000:1000 "$ROOT/data/wiki"

export REDSTONE_WIKI_ROOT="$ROOT"
export RDF_FORMATIONS_ROOT="$FORMATIONS"
export CURSOR_RDF_ROOT="$CURSOR_RDF"

docker compose up -d --build
echo "==> Attente Wiki.js..."
for _ in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)"
  [[ "$code" == "200" ]] && break
  sleep 2
done

if curl -s http://127.0.0.1:3000/ | grep -q 'Wiki.js Setup'; then
  echo "==> Finalisation setup Wiki.js"
  curl -sS -X POST http://127.0.0.1:3000/finalize \
    -H 'Content-Type: application/json' \
    -d "{\"adminEmail\":\"${WIKI_ADMIN_EMAIL:-admin@redstone.local}\",\"adminPassword\":\"${WIKI_ADMIN_PASSWORD:-redstone-local-test}\",\"adminPasswordConfirm\":\"${WIKI_ADMIN_PASSWORD:-redstone-local-test}\",\"siteUrl\":\"http://127.0.0.1:3000\",\"telemetry\":false}"
  sleep 15
  export $(grep -v '^#' .env | xargs)
  for loc in en fr; do
  python3 - <<PY
import json, os, urllib.request, time
url='http://127.0.0.1:3000/graphql'
email=os.environ.get('WIKI_ADMIN_EMAIL','admin@redstone.local')
pwd=os.environ.get('WIKI_ADMIN_PASSWORD','redstone-local-test')
def gql(q,v=None,t=None):
    h={'Content-Type':'application/json'}
    if t: h['Authorization']=f'Bearer {t}'
    b={'query':q}; if v: b['variables']=v
    r=urllib.request.Request(url,data=json.dumps(b).encode(),headers=h,method='POST')
    d=json.loads(urllib.request.urlopen(r,timeout=60).read())
    if d.get('errors'): raise SystemExit(d['errors'])
    return d['data']
for _ in range(5):
    try:
        t=gql('mutation($e:String!,$p:String!){authentication{login(username:$e,password:$p,strategy:\"local\"){jwt}}}',{'e':email,'p':pwd})['authentication']['login']['jwt']
        break
    except Exception:
        time.sleep(10)
gql('mutation($l:String!){localization{downloadLocale(locale:$l){responseResult{succeeded}}}}',{'l':'$loc'},t)
PY
  done
  python3 "$CURSOR_RDF/scripts/configure-wiki-redstone.py"
fi

if [[ -d "$FORMATIONS/$DEMO_SLUG/cours" ]]; then
  echo "==> Sync formation démo: $DEMO_SLUG"
  export $(grep -v '^#' .env | xargs)
  python3 "$CURSOR_RDF/scripts/sync-formation-wiki.py" "$DEMO_SLUG"
  python3 "$CURSOR_RDF/scripts/build-formation-nav.py" "$DEMO_SLUG"
  python3 "$CURSOR_RDF/scripts/build-formation-formateur.py" "$DEMO_SLUG"
  python3 "$CURSOR_RDF/scripts/setup-formation-access.py" "$DEMO_SLUG"
  export WIKI_ROOT="$ROOT"
  bash "$ROOT/scripts/reload.sh"
fi

bash "$ROOT/scripts/smoke-test.sh"
echo ""
echo "Wiki.js local : http://127.0.0.1:3000"
echo "Login         : ${WIKI_ADMIN_EMAIL:-admin@redstone.local} / ${WIKI_ADMIN_PASSWORD:-redstone-local-test}"
echo "Formation     : http://127.0.0.1:3000/formations/$DEMO_SLUG"
