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
| Thème SCSS | `client/themes/default/scss/redstone.scss` |
| Callouts Obsidian | `client/helpers/callouts.js` |
| Assets session | `client/static/nav/`, `formateur/`, `stagiaires/`, `svg/`, favicons |

JSON `nav` / `formateur` / `stagiaires` : générés par [`CursorRDF`](https://github.com/RDFormations/CursorRDF) (`build-formation-nav.py`, `build-formation-formateur.py`). Sync vers ce repo via `scripts/sync-from-cursorrdf.sh` ou pipeline release.

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

```bash
# Build image
docker build -t redstone-wiki:2.5-redstone --target release .

# Stack locale
cp .env.example .env
docker compose up -d --build
bash scripts/smoke-test.sh
```

## Sync overlay depuis CursorRDF (transition)

Pendant la migration depuis `infra/formation-portal/wiki-custom/` :

```bash
export CURSOR_RDF_ROOT=/path/to/CursorRDF
./scripts/sync-from-cursorrdf.sh
git diff --stat
```

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
