const path = require('path')

/* global WIKI */

const validateLmsConfig = () => {
  const warnings = []
  if (!process.env.REDSTONE_LMS_AGENT_TOKEN && !process.env.LMS_AGENT_BOT_TOKEN) {
    warnings.push('REDSTONE_LMS_AGENT_TOKEN absent — API /api/v1 agents désactivée (401).')
  }
  if (
    (process.env.REDSTONE_LMS_WEBHOOK_URL || process.env.LMS_WEBHOOK_URL) &&
    !process.env.REDSTONE_LMS_WEBHOOK_SECRET
  ) {
    warnings.push('REDSTONE_LMS_WEBHOOK_URL défini sans secret HMAC — recommandé en production.')
  }
  return warnings
}

module.exports = {
  async init () {
    const knex = WIKI.models.knex
    const base = path.join(WIKI.SERVERPATH, 'modules/redstone')

    const { createSessionRepository } = require(path.join(base, 'repository/session.repository'))
    const { createContentRepository } = require(path.join(base, 'repository/content.repository'))
    const { createHealthRepository } = require(path.join(base, 'repository/health.repository'))
    const { createWebhookOutboxRepository } = require(path.join(base, 'repository/webhook-outbox.repository'))
    const { createSessionService } = require(path.join(base, 'services/session.service'))
    const { createImportService } = require(path.join(base, 'services/import.service'))
    const { createDistributeService } = require(path.join(base, 'services/distribute.service'))
    const { createProjectionService } = require(path.join(base, 'services/projection.service'))
    const { createPublishService } = require(path.join(base, 'services/publish.service'))
    const { createNavService } = require(path.join(base, 'services/nav.service'))
    const { createWebhooksService } = require(path.join(base, 'services/webhooks.service'))
    const { createMondaySyncService } = require(path.join(base, 'services/monday-sync.service'))
    const { createGuestAccessService } = require(path.join(base, 'services/guest-access.service'))
    const { createHealthService } = require(path.join(base, 'services/health.service'))
    const { createContentNavService } = require(path.join(base, 'services/content-nav.service'))
    const { createMondayPushService } = require(path.join(base, 'services/monday-push.service'))
    const { createAdminSessionsService } = require(path.join(base, 'services/admin-sessions.service'))
    const { createContentVersionsService } = require(path.join(base, 'services/content-versions.service'))
    const { createContentEditService } = require(path.join(base, 'services/content-edit.service'))
    const { createLegalPagesService } = require(path.join(base, 'services/legal-pages.service'))
    const { createPortalService } = require(path.join(base, 'services/portal.service'))
    const { fetchMissionItem } = require(path.join(base, 'infrastructure/monday-client'))

    validateLmsConfig().forEach(msg => WIKI.logger.warn(`(REDSTONE/LMS) ${msg}`))

    const sessionRepo = createSessionRepository(knex)
    const contentRepo = createContentRepository(knex)
    const healthRepo = createHealthRepository(knex)
    const webhookOutboxRepo = createWebhookOutboxRepository(knex)
    const webhooks = createWebhooksService({
      outboxRepo: webhookOutboxRepo,
      logger: WIKI.logger
    })

    const projection = createProjectionService({ knex, logger: WIKI.logger })
    const guestAccess = createGuestAccessService({
      knex,
      reloadAuthGroups: () => WIKI.auth.reloadGroups(),
      logger: WIKI.logger
    })
    const nav = createNavService()
    const health = createHealthService({ sessionRepo, contentRepo, healthRepo })
    const contentNav = createContentNavService({ sessionRepo, contentRepo, navService: nav })
    const portal = createPortalService({
      sessionRepo,
      contentRepo,
      navService: nav,
      getSiteHost: () => WIKI.config?.host || process.env.WIKI_SITE_HOST || 'https://formation.redstoneformations.fr',
      logger: WIKI.logger
    })
    const adminSessions = createAdminSessionsService({ sessionRepo, contentRepo, healthRepo })
    const contentVersions = createContentVersionsService({ sessionRepo, contentRepo })
    const contentEdit = createContentEditService({
      sessionRepo,
      contentRepo,
      projectionService: projection,
      logger: WIKI.logger
    })
    const legalPages = createLegalPagesService({ knex, logger: WIKI.logger })
    const getMondayToken = () => process.env.MONDAY_API_TOKEN || process.env.MONDAY_TOKEN
    const mondayPush = createMondayPushService({
      sessionRepo,
      contentRepo,
      getMondayToken,
      getSiteHost: () => WIKI.config?.host || process.env.WIKI_SITE_HOST || 'https://formation.redstoneformations.fr',
      logger: WIKI.logger
    })

    WIKI.redstone = {
      sessions: createSessionService({ repo: sessionRepo, logger: WIKI.logger }),
      content: contentRepo,
      health: healthRepo,
      webhooks,
      webhookOutbox: webhookOutboxRepo,
      mondaySync: createMondaySyncService({
        sessionRepo,
        fetchMissionItem,
        getMondayToken,
        logger: WIKI.logger
      }),
      mondayPush,
      import: createImportService({
        sessionRepo,
        contentRepo,
        healthRepo,
        webhooks,
        mondayPush,
        logger: WIKI.logger
      }),
      distribute: createDistributeService({
        sessionRepo,
        contentRepo,
        healthRepo,
        projectionService: projection,
        guestAccess,
        webhooks,
        mondayPush,
        getSiteHost: () => WIKI.config?.host || process.env.WIKI_SITE_HOST || 'https://formation.redstoneformations.fr',
        logger: WIKI.logger
      }),
      guestAccess,
      portal,
      adminSessions,
      contentVersions,
      contentEdit,
      legalPages,
      health,
      contentNav,
      publish: createPublishService({
        sessionRepo,
        contentRepo,
        projectionService: projection,
        webhooks,
        logger: WIKI.logger
      }),
      nav,
      projection
    }

    setImmediate(() => {
      webhooks.processPending(50).catch(err => {
        WIKI.logger.warn(`(REDSTONE/LMS) Webhook pending replay: ${err.message}`)
      })
      legalPages.ensureSiteLegalPages(['fr']).then(() => {
        return guestAccess.ensureGuestLegalPagesAccess()
      }).catch(err => {
        WIKI.logger.warn(`(REDSTONE/LMS) Pages légales: ${err.message}`)
      })
    })

    WIKI.logger.info('(REDSTONE/LMS) Module initialisé — F01–F13, M03, S01/M01, T01, E01/E02/E07, O02/O03, T04, C12/C14')
  },
  validateLmsConfig
}
