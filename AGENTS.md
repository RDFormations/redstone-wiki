# AGENTS.md — redstone-wiki

Wiki.js v2.5.314 fork RedStone Formations (`formation.redstoneformations.fr`).

## Repos liés

| Repo | Rôle |
|------|------|
| **redstone-wiki** (ce repo) | Source Wiki.js + UI Vue/SCSS + Docker |
| **RDF-formations** | Contenu Markdown `formations/<slug>/cours/` |
| **CursorRDF** | Scripts sync Wiki GraphQL, génération JSON static, Monday |

## Où travailler

| Tâche | Emplacement |
|-------|-------------|
| UI portail (sidebar, hubs formateur/stagiaire, thème) | `client/` |
| JSON nav / formateur / stagiaires | `client/static/` — **générés** par CursorRDF, commités ici |
| Docker / prod reload | `Dockerfile`, `deploy/`, `scripts/build-image.sh`, `scripts/reload.sh` |

Ne pas recréer un overlay dans CursorRDF — tout le code client Wiki est **ici**.

## Fichiers RedStone (merges upstream)

| Zone | Chemins |
|------|---------|
| Page shell | `client/themes/default/components/page.vue` |
| Header | `client/components/common/nav-header.vue` |
| Bootstrap | `client/index-app.js`, `client/client-app.js` |
| Formation UI | `client/components/formation/*.vue` |
| Thème SCSS | `client/themes/default/scss/redstone.scss` |
| Callouts | `client/helpers/callouts.js` |

## Développement local

```bash
cp .env.example .env
docker compose up -d --build
bash scripts/smoke-test.sh
```

Itération webpack (~1–3 min) :

```bash
export CURSOR_RDF_ROOT=/path/to/CursorRDF   # optionnel : regénère static avant build
./scripts/reload.sh
```

## Prod VPS

- Clone : `/home/ubuntu/redstone-wiki`
- Runtime : `/opt/redstone-wiki` (data + compose copié depuis `deploy/`)
- Bootstrap : `CursorRDF/infra/formation-portal/install.sh` ou `scripts/build-image.sh`

Variables `.env` prod : `POSTGRES_PASSWORD`, `REDSTONE_WIKI_ROOT`, `RDF_FORMATIONS_ROOT`.

## Génération static formations

Depuis CursorRDF (écrit dans ce repo) :

```bash
export REDSTONE_WIKI_ROOT=/path/to/redstone-wiki
python3 scripts/build-formation-nav.py
python3 scripts/build-formation-formateur.py
python3 scripts/refresh-formation-nav-published.py --all
```

Puis commit JSON dans redstone-wiki si besoin release.
