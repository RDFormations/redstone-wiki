# UPGRADE.md — Merge upstream Wiki.js (F12)

Inventaire des zones RedStone à rejouer lors d’un merge `Requarks/wiki` → `redstone-wiki`.

## Chemins custom (ne pas écraser sans revue)

| Zone | Chemins |
|------|---------|
| LMS API | `server/modules/redstone/**`, `server/core/redstone.js`, `server/controllers/redstone*.js` |
| Migrations | `server/db/migrations/2.5.129.js` … `2.5.133.js` |
| Admin | `client/components/admin.vue`, `client/components/admin/admin-redstone-sessions.vue` |
| Formation UI | `client/components/formation/**` |
| Page shell | `client/themes/default/components/page.vue` |
| Callouts / Mermaid | `client/helpers/callouts.js`, `client/helpers/mermaid.js` |
| Routing | `server/master.js` (`/api/v1`, `/api/formation`, `/api/admin`) |
| Common view | `server/controllers/common.js` (F06 edit path rewrite) |

## Procédure

1. `git fetch upstream && git merge upstream/main` (ou cherry-pick tag)
2. Résoudre conflits en **gardant** les chemins ci-dessus
3. `npm run test:redstone`
4. Smoke `bash scripts/smoke-test.sh`
5. Documenter le tag upstream dans `README.redstone.md`
