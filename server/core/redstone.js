const path = require('path')

/* global WIKI */

module.exports = {
  async init () {
    const knex = WIKI.models.knex
    const base = path.join(WIKI.SERVERPATH, 'modules/redstone')

    const { createSessionRepository } = require(path.join(base, 'repository/session.repository'))
    const { createContentRepository } = require(path.join(base, 'repository/content.repository'))
    const { createHealthRepository } = require(path.join(base, 'repository/health.repository'))
    const { createSessionService } = require(path.join(base, 'services/session.service'))
    const { createImportService } = require(path.join(base, 'services/import.service'))
    const { createDistributeService } = require(path.join(base, 'services/distribute.service'))
    const { createProjectionService } = require(path.join(base, 'services/projection.service'))
    const { createPublishService } = require(path.join(base, 'services/publish.service'))
    const { createNavService } = require(path.join(base, 'services/nav.service'))
    const { createWebhooksService } = require(path.join(base, 'services/webhooks.service'))
    const { createMondaySyncService } = require(path.join(base, 'services/monday-sync.service'))
    const { fetchMissionItem } = require(path.join(base, 'infrastructure/monday-client'))

    const sessionRepo = createSessionRepository(knex)
    const contentRepo = createContentRepository(knex)
    const healthRepo = createHealthRepository(knex)
    const webhooks = createWebhooksService({ logger: WIKI.logger })

    const projection = createProjectionService({ knex, logger: WIKI.logger })

    WIKI.redstone = {
      sessions: createSessionService({ repo: sessionRepo, logger: WIKI.logger }),
      content: contentRepo,
      health: healthRepo,
      webhooks,
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
        webhooks,
        logger: WIKI.logger
      }),
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

    WIKI.logger.info('(REDSTONE/LMS) Module initialisé — F01–F05, C02, E02, M02, O02, T04')
  }
}
