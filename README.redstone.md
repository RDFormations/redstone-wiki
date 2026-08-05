# redstone-wiki

Fork de [Requarks/wiki](https://github.com/Requarks/wiki) **v2.5.314** avec le thème et les composants **RedStone Formations** (portail `formation.redstoneformations.fr`).

Upstream : Wiki.js 2.5.314 · customisations : client Vue/SCSS (formation sidebar, hubs formateur/stagiaire, callouts Obsidian).

## Contenu RedStone (vs upstream)

| Zone | Fichiers |
|------|----------|
| Shell page | `client/themes/default/components/page.vue` |
| Header | `client/components/common/nav-header.vue` |
| Bootstrap | `client/index-app.js`, `client/client-app.js` |
| Formation | `client/components/formation/*.vue` |
| Thème | `client/themes/default/scss/redstone.scss` |
| Callouts | `client/helpers/callouts.js` |
| Assets statiques | `client/static/nav`, `formateur`, `stagiaires`, favicons, logo |

Les JSON `nav/` / `formateur/` / `stagiaires/` sont générés par `CursorRDF` (`build-formation-nav.py`, `build-formation-formateur.py`) — copiés dans ce repo lors des releases portail.

## Build image

```bash
docker build -t redstone-wiki:2.5-redstone --target release .
```

## Test local (smoke)

```bash
cp .env.example .env
docker compose build wiki
docker compose up -d
# Premier accès : http://127.0.0.1:3000 — assistant Wiki.js
bash scripts/smoke-test.sh
docker compose down
```

## Branches

| Branche | Base |
|---------|------|
| `redstone/2.5.314` | Wiki.js v2.5.314 + RedStone |

## Repo liés

- [`RDFormations/CursorRDF`](https://github.com/RDFormations/CursorRDF) — scripts sync, overlay source (`infra/formation-portal/wiki-custom/`)
- [`RDFormations/RDF-formations`](https://github.com/RDFormations/RDF-formations) — contenu cours

## Upgrade upstream

```bash
git fetch upstream
git merge v2.5.315  # après ajout remote upstream Requarks/wiki
```

Résoudre les conflits sur les fichiers client listés ci-dessus.
