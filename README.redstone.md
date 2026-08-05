# RedStone Formations — Wiki.js fork

**Dépôt public** : fork de [Requarks/wiki](https://github.com/Requarks/wiki) **v2.5.314** avec les customisations portail `formation.redstoneformations.fr`.

Travaillez **directement sur la source** dans ce repo (plus d’overlay `wiki-custom/` copié au build Docker).

| | |
|--|--|
| **Upstream** | https://github.com/Requarks/wiki |
| **Base tag** | `v2.5.314` |
| **Branche RedStone** | `main` (ou `redstone/2.5.314`) |
| **Image** | `redstone-wiki:2.5-redstone` |

## Customisations RedStone (fichiers à connaître pour merges upstream)

| Zone | Chemins |
|------|---------|
| Page shell | `client/themes/default/components/page.vue` |
| Header | `client/components/common/nav-header.vue` |
| Bootstrap | `client/index-app.js`, `client/client-app.js` |
| Formation UI | `client/components/formation/*.vue` |
| **LMS API (F01+)** | `server/modules/redstone/`, `server/controllers/redstone.js`, `server/core/redstone.js` |
| Thème SCSS | `client/themes/default/scss/redstone.scss` |
| Callouts Obsidian | `client/helpers/callouts.js` |
| Assets session | `client/static/nav/`, `formateur/`, `stagiaires/`, `svg/`, favicons |

JSON `nav` / `formateur` / `stagiaires` : générés par [`CursorRDF`](https://github.com/RDFormations/CursorRDF) (`build-formation-nav.py`, `build-formation-formateur.py`) **directement** dans `client/static/` (`scripts/wiki_static.py`).

## Première publication GitHub (org RDFormations)

```bash
# 1. Créer le repo public (GitHub UI ou CLI)
gh repo create RDFormations/redstone-wiki --public --description "Wiki.js fork RedStone Formations v2.5.314"

# 2. Pousser ce clone
git remote set-url origin git@github.com:RDFormations/redstone-wiki.git
git push -u origin main
git push origin redstone/2.5.314  # optionnel, branche versionnée
```

Sur GitHub : **Settings → General → check "fork"** si créé via « Fork » depuis Requarks/wiki ; sinon lier manuellement avec remote `upstream`.

## Développement local

### Itération rapide (recommandé)

| Besoin | Commande | Délai typique |
|--------|----------|---------------|
| **API LMS** (reload auto, sans webpack) | `bash scripts/local-dev-api.sh` | **~10 s** démarrage, **~2 s** par modif |
| **Dev complet** (API + UI, reload auto) | `bash scripts/local-dev.sh` | 1ère fois ~3–6 min, puis **2–5 s** par modif |
| **API seule** (conteneur prod) | `bash scripts/local-reload-server.sh` | **~5–10 s** |
| **Tests unitaires LMS** (hors Docker) | `npm run test:redstone` | **< 5 s** |
| **Image prod** (smoke CI / prod-like) | `bash scripts/local-up.sh` | rebuild image ~6 min |

```bash
# Mode dev API — recommandé pour server/modules/redstone/
bash scripts/local-dev-api.sh

# Mode dev complet — code monté, yarn dev (chokidar + webpack HMR)
bash scripts/local-dev.sh
# → modifier server/modules/redstone/ → redémarrage auto
# → logs : docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f wiki-dev

# Revenir au conteneur prod (image release)
bash scripts/local-dev-stop.sh

# Variante rapide API sans mode dev (sync server/ + restart)
bash scripts/local-reload-server.sh
```

### Stack prod-like (première install / CI)

```bash
# Build image
docker build -t redstone-wiki:2.5-redstone --target release .

# Stack locale
cp .env.example .env
docker compose up -d --build
bash scripts/smoke-test.sh
```

## Scripts prod (VPS)

```bash
./scripts/build-image.sh    # image + stack /opt/redstone-wiki
./scripts/reload.sh         # itération webpack (~1–3 min)
```

Voir `AGENTS.md` pour le workflow agents / CursorRDF.

## API LMS RedStone (F01 — registre sessions)

Base : `/api/v1` — auth `Authorization: Bearer $REDSTONE_LMS_AGENT_TOKEN`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/sessions` | Créer une session (`draft`) |
| `GET` | `/sessions` | Lister (pagination, `?q=`) |
| `GET` | `/sessions/{id}` | Lire par UUID |
| `GET` | `/sessions/by-slug/{slug}` | Lire par slug |
| `POST` | `/sessions/upsert` | Créer ou retourner par `monday_item_id` (C01) |
| `POST` | `/sessions/{id}/sync-monday` | Sync métadonnées Monday → session (M02) |
| `POST` | `/sessions/{id}/content/import` | Import bulk MD (F03) |
| `POST` | `/sessions/{id}/distribute` | Distribuer vers Wiki.js (F02) |
| `GET` | `/sessions/{id}/health` | Health checks (O11) |
| `POST` | `/sessions/{id}/publish` | Publication formateur (T04) — token formateur |
| `GET` | `/sessions/{id}/nav?audience=` | Navigation runtime (F05) |

Client CursorRDF : `.cursor/skills/rdf-formation-portal/scripts/lms_api.py`

OpenAPI : `docs/api/openapi-v1.yaml`

### Tests

| Commande | Cible | Prérequis |
|----------|-------|-----------|
| `npm run test:redstone` | Unitaires (43 tests) | `yarn install` |
| `bash scripts/e2e-redstone.sh` | E2E API + pages Wiki | `bash scripts/local-dev-api.sh` |
| `npm run test:redstone:e2e` | E2E seul (idem) | serveur sur `:3000` |

Couverture E2E (vague 1) : F01 sessions, F03 import, C02 QA, F02 distribute, O11 health, F05 nav, T04 publish, E02 auth, M02 sync-monday, C01 upsert, smoke pages Wiki.

Migrations : `2.5.129.js` (`rs_sessions`), `2.5.130.js` (`rs_content_*`, health)

## Upgrade Wiki.js upstream

```bash
git fetch upstream
git checkout -b upgrade/v2.5.315 upstream/v2.5.315   # quand tag existe
# merger ou cherry-pick commits RedStone depuis main
# résoudre conflits sur les fichiers listés ci-dessus
yarn build && docker build ...
```

## Repos liés

- [`RDFormations/CursorRDF`](https://github.com/RDFormations/CursorRDF) — sync contenu, Monday, agents
- [`RDFormations/RDF-formations`](https://github.com/RDFormations/RDF-formations) — Markdown cours

---

Le README principal Wiki.js (`README.md`) reste celui d’upstream ; ce fichier documente la couche RedStone.
