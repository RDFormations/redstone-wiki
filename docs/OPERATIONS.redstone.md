# LMS RedStone — opérations production

Guide de déploiement et d'exploitation du fork Wiki.js (module `server/modules/redstone/`).

## Principes

| Principe | Implication |
|----------|-------------|
| **DB fork = vérité runtime** | Pas de `sync-formation-wiki.py` en prod — API `/api/v1` uniquement |
| **Agents = brouillon** | Token `REDSTONE_LMS_AGENT_TOKEN` — jamais publish stagiaire (E02) |
| **Formateur = publish** | Token `REDSTONE_LMS_FORMATEUR_TOKEN` — `/publish` uniquement |
| **Webhooks durables** | Table `rs_webhook_outbox` — retry 3×, replay au démarrage |

## Variables d'environnement

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `REDSTONE_LMS_AGENT_TOKEN` | Oui (prod) | Agents Cursor, pipeline C01 |
| `REDSTONE_LMS_FORMATEUR_TOKEN` | Oui (prod) | Publication modules stagiaire |
| `REDSTONE_LMS_OPS_TOKEN` | Recommandé | Scope `*` admin OPS |
| `REDSTONE_LMS_WEBHOOK_URL` | Si agents cloud | URL agent-gateway (O02) |
| `REDSTONE_LMS_WEBHOOK_SECRET` | Avec webhook URL | Signature HMAC `X-RedStone-Signature` |
| `MONDAY_API_TOKEN` | Sync M02 live | `POST /sessions/{id}/sync-monday` sans body |

## Migrations

Exécutées automatiquement au démarrage Wiki.js :

| Version | Tables |
|---------|--------|
| `2.5.129` | `rs_sessions` |
| `2.5.130` | `rs_content_modules`, `rs_content_versions`, `rs_session_health_checks` |
| `2.5.131` | `rs_webhook_outbox` |

Vérifier après deploy :

```sql
SELECT name FROM migrations WHERE name LIKE '2.5.12%' OR name LIKE '2.5.13%' ORDER BY name;
```

## Déploiement

1. Build image release : `docker build -t redstone-wiki:2.5-redstone --target release .`
2. Injecter les tokens LMS dans `docker-compose.yml` (section `wiki.environment`)
3. Smoke : `bash scripts/smoke-test.sh`
4. API : `bash scripts/e2e-redstone.sh` (sur staging avant prod)

## Développement local

| Mode | Commande | Usage |
|------|----------|-------|
| API watch | `bash scripts/local-dev-api.sh` | Backend LMS (~10 s) |
| Dev complet | `bash scripts/local-dev.sh` | UI + API webpack |
| Tests | `npm run test:redstone:all` | unit + integration + e2e |

## Webhooks (O02)

Événements :

- `content.draft_ready` — QA verte après import
- `session.distributed` — distribute OK
- `session.incomplete` — health/projection/QA échec
- `module.published` — publish formateur

Format POST :

```json
{
  "event": "content.draft_ready",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "payload": { "session_id": "...", "slug": "...", "qa_score": 100 }
}
```

En-têtes : `X-RedStone-Event`, `X-RedStone-Signature: sha256=<hmac>` (si secret configuré).

Replay manuel des pending :

```sql
SELECT id, event, status, attempts, lastError FROM rs_webhook_outbox WHERE status = 'pending';
```

Redémarrer le conteneur `wiki` relance `processPending(50)` au boot.

## Pipeline agents (C01)

Prérequis CursorRDF :

```bash
export LMS_API_URL=https://formation.redstoneformations.fr/api/v1
export REDSTONE_LMS_AGENT_TOKEN=<secret>
export MONDAY_API_TOKEN=<secret>   # optionnel — sync metadata M02
```

Commande :

```bash
python3 .cursor/skills/rdf-formation-portal/scripts/lms_api.py pipeline push \
  --slug <slug> --monday-item-id <id> --client <client> --title "<titre>" \
  --from-dir formations/<slug>/cours/ --distribute --sync-monday
```

Sans tokens LMS → fallback legacy CLI (`sync-formation-wiki.py`, etc.) — **à éviter en prod**.

## Checklist PR (rappel DEV-RULES)

- [ ] Couches router / service / domain respectées
- [ ] OpenAPI `docs/api/openapi-v1.yaml` à jour
- [ ] Tests unit + integration/e2e
- [ ] Messages erreur FR métier
- [ ] Pas de logique formation dans `server/core/` Wiki
