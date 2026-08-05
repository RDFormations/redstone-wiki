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

    WIKI.redstone = {
      sessions: createSessionService({ repo: sessionRepo, logger: WIKI.logger }),
      content: contentRepo,
      health: healthRepo,
      webhooks,
      webhookOutbox: webhookOutboxRepo,
      mondaySync: createMondaySyncService({
        sessionRepo,
        fetchMissionItem,
        getMondayToken: () => process.env.MONDAY_API_TOKEN || process.env.MONDAY_TOKEN,
        logger: WIKI.logger
      }),
      import: createImportService({
        sessionRepo,
        contentRepo,
        healthRepo,
        webhooks,
        logger: WIKI.logger
      }),
      distribute: createDistributeService({
        sessionRepo,
        contentRepo,
        healthRepo,
        projectionService: projection,
        guestAccess,
        webhooks,
        logger: WIKI.logger
      }),
      guestAccess,
      publish: createPublishService({
        sessionRepo,
        contentRepo,
        projectionService: projection,
        webhooks,
        logger: WIKI.logger
      }),
      nav: createNavService(),
      projection
    }

    setImmediate(() => {
      webhooks.processPending(50).catch(err => {
        WIKI.logger.warn(`(REDSTONE/LMS) Webhook pending replay: ${err.message}`)
      })
    })

    WIKI.logger.info('(REDSTONE/LMS) Module initialisé — F01–F05, C02, E01/E02, M02, O02, T04')
  },
  validateLmsConfig
}
