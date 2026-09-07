# Ops RedStone LMS — staging (I01) & backups (I02)

## Staging (I01)

```bash
cp .env.example .env.staging
# Éditer WIKI_SITE_HOST, tokens non-prod
docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up -d
bash scripts/smoke-test.sh  # si adapté au port staging
```

Règles : pas de tokens Monday/agents prod ; base Postgres dédiée (`wiki-staging-db`).

## Backup & restore drill (I02)

```bash
chmod +x scripts/backup-pg.sh scripts/restore-pg.sh
bash scripts/backup-pg.sh
# Drill trimestriel (environnement jetable) :
bash scripts/restore-pg.sh data/backups/redstone-wiki-XXXX.sql.gz
```

Cibles CDC : RPO < 24 h, RTO < 4 h — documenter la dernière date de drill dans le runbook VPS.
