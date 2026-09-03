/**
 * Registre des features CDC Validé — preuves d'implémentation + tests dédiés.
 * Source : FEATURES-CATALOG-v1.0.md (statut ✅ Validé) + Vague 2 M03/M05.
 */
const path = require('path')

const WIKI_ROOT = path.resolve(__dirname, '../../../../')

const feature = (id, title, evidence, tests) => ({ id, title, evidence, tests })

/** Chemins relatifs à la racine redstone-wiki (sauf préfixe cursorrdf:) */
const CDC_VALIDATED_FEATURES = [
  feature('F01', 'Registre sessions', [
    'server/modules/redstone/repository/session.repository.js',
    'server/modules/redstone/domain/session-validation.js'
  ], ['session.repository.test.js', 'session-validation.test.js']),
  feature('F02', 'API distribute', [
    'server/modules/redstone/services/distribute.service.js'
  ], ['distribute.service.test.js']),
  feature('F03', 'Import MD → DB', [
    'server/modules/redstone/services/import.service.js',
    'server/modules/redstone/domain/import-normalize.js'
  ], ['import.service.test.js', 'import-normalize.test.js']),
  feature('F04', 'États session', [
    'server/modules/redstone/domain/session-state.js'
  ], ['session-state.test.js', 'session-state-transitions.test.js']),
  feature('F05', 'Navigation runtime', [
    'server/modules/redstone/services/nav.service.js'
  ], ['nav.service.test.js']),
  feature('F06', 'Routes /edit/{module}', [
    'server/modules/redstone/domain/formation-edit-path.js'
  ], ['formation-edit-path.test.js']),
  feature('F07', 'Mode Formation', [
    'server/modules/redstone/domain/site-mode.js',
    'docs/FORMATION-MODE.md'
  ], ['site-mode.test.js']),
  feature('F08', 'i18n native', [
    'server/modules/redstone/domain/import-normalize.js',
    'server/modules/redstone/services/nav.service.js'
  ], ['import-normalize.test.js', 'nav.service.test.js']),
  feature('F09', 'Versionning / rollback', [
    'server/modules/redstone/services/content-versions.service.js'
  ], ['content-versions.service.test.js', 'content-versions-restore.test.js']),
  feature('F12', 'Upgrade upstream', [
    'UPGRADE.md'
  ], ['upgrade-process.test.js']),
  feature('F13', 'Admin Sessions', [
    'client/components/admin/admin-redstone-sessions.vue',
    'server/controllers/redstone-admin.js'
  ], ['admin-sessions.service.test.js']),
  feature('O01', 'API agents', [
    'server/controllers/redstone.js',
    'server/modules/redstone/api/middleware/auth-scopes.js',
    'server/modules/redstone/api/middleware/agent-rate-limit.js'
  ], ['auth-scopes.test.js', 'agent-rate-limit.test.js']),
  feature('O02', 'Webhooks sortants', [
    'server/modules/redstone/services/webhooks.service.js'
  ], ['webhooks.service.test.js']),
  feature('O03', 'content_ready vs distributed', [
    'server/modules/redstone/domain/distribute-outcome.js'
  ], ['distribute-outcome.test.js']),
  feature('O11', 'Health checks', [
    'server/modules/redstone/domain/health-checks.js',
    'server/modules/redstone/services/health.service.js'
  ], ['health-checks.test.js', 'health.service.test.js']),
  feature('M01', 'URL stagiaire', [
    'server/modules/redstone/domain/portal-hub.js'
  ], ['portal-hub.test.js']),
  feature('M02', 'Sync Monday → session', [
    'server/modules/redstone/services/monday-sync.service.js',
    'server/modules/redstone/domain/monday-metadata.js'
  ], ['monday-metadata.test.js', 'monday-sync-validation.test.js']),
  feature('M03', 'Colonnes Monday LMS', [
    'server/modules/redstone/domain/monday-columns.js'
  ], ['monday-columns.test.js', 'monday-push.test.js']),
  feature('M05', 'Provision formateur', [
    'server/modules/redstone/services/trainer-access.service.js'
  ], ['trainer-m05.test.js']),
  feature('T01', 'Cockpit formateur', [
    'client/components/formation/formation-formateur-hub.vue',
    'server/modules/redstone/domain/formateur-hub.js'
  ], ['formateur-hub.test.js']),
  feature('T02', 'RBAC formateurs-{slug}', [
    'server/modules/redstone/domain/trainer-access.js'
  ], ['trainer-access.test.js']),
  feature('T03', 'Publication rapide', [
    'server/modules/redstone/services/publish.service.js'
  ], ['publish.service.test.js']),
  feature('T04', 'Publication granulaire', [
    'server/modules/redstone/services/publish.service.js'
  ], ['publish.service.test.js']),
  feature("T10'", 'Indicateurs session', [
    'server/modules/redstone/domain/session-readiness.js'
  ], ['session-readiness.test.js']),
  feature('S01', 'Hub stagiaire', [
    'client/components/formation/formation-stagiaire-hub.vue',
    'server/modules/redstone/domain/portal-hub.js'
  ], ['portal-hub.test.js']),
  feature('S02', 'Module non publié', [
    'client/components/formation/formation-unpublished-friendly.vue',
    'server/modules/redstone/domain/formation-page-access.js'
  ], ['formation-page-access.test.js']),
  feature('E01', 'Assets brouillon protégés', [
    'server/modules/redstone/api/middleware/enforce-asset-access.js'
  ], ['enforce-asset-access.test.js']),
  feature('E02', 'published:true interdit agents', [
    'server/modules/redstone/domain/publish-policy.js'
  ], ['publish-policy.test.js']),
  feature('E07', 'Pages légales', [
    'server/modules/redstone/domain/legal-pages.js'
  ], ['legal-pages.test.js']),
  feature('E11', 'Stagiaire sans cookie', [
    'server/modules/redstone/api/v1/public.router.js'
  ], ['guest-access.service.test.js', 'portal-hub.test.js']),
  feature('C01', 'Pipeline rédaction → API import', [
    'docs/api/openapi-v1.yaml'
  ], ['import.service.test.js']),
  feature('C02', 'QA gate', [
    'server/modules/redstone/domain/qa-gate.js'
  ], ['qa-gate.test.js']),
  feature("C03'", 'Export git optionnel', [
    'server/modules/redstone/services/export-git.service.js'
  ], ['export-git.service.test.js']),
  feature('C04', 'Traçabilité PDC', [
    'server/modules/redstone/services/pdc.service.js',
    'client/components/formation/formation-pdc-diff.vue'
  ], ['pdc.service.test.js', 'text-diff.test.js']),
  feature('C05', 'Labs natifs', [
    'server/modules/redstone/services/labs.service.js'
  ], ['labs.service.test.js']),
  feature('C12', 'Éditeur UI modules', [
    'client/components/formation/formation-module-editor.vue',
    'server/modules/redstone/services/content-edit.service.js'
  ], ['content-edit.service.test.js']),
  feature('C13', 'Chatbot édition', [
    'server/modules/redstone/services/chatbot.service.js',
    'client/components/formation/formation-module-chatbot.vue'
  ], ['chatbot.service.test.js']),
  feature('C14', 'Historique / diff', [
    'server/modules/redstone/services/content-versions.service.js',
    'client/components/formation/formation-module-versions.vue'
  ], ['content-versions.service.test.js']),
  feature('I01', 'Staging', [
    'docker-compose.staging.yml',
    'docs/OPERATIONS-staging-backup.md'
  ], ['ops-staging-backup.test.js']),
  feature('I02', 'Backup / restore PG', [
    'scripts/backup-pg.sh',
    'scripts/restore-pg.sh'
  ], ['ops-staging-backup.test.js']),
  feature('B02', 'Branding client (logo, couleurs)', [
    'server/modules/redstone/domain/client-branding.js',
    'client/static/branding/quiris/logo.svg',
    'client/components/common/nav-header.vue',
    'client/components/formation/formation-nav-sidebar.vue'
  ], ['client-branding.test.js', 'session.service.test.js', 'portal-hub.test.js'])
]

module.exports = { CDC_VALIDATED_FEATURES, WIKI_ROOT, feature }
