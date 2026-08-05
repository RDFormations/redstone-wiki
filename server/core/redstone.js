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

    const sessionRepo = createSessionRepository(knex)
    const contentRepo = createContentRepository(knex)
    const healthRepo = createHealthRepository(knex)

    const projection = createProjectionService({ knex, logger: WIKI.logger })

    WIKI.redstone = {
      sessions: createSessionService({ repo: sessionRepo, logger: WIKI.logger }),
      content: contentRepo,
      health: healthRepo,
      import: createImportService({
        sessionRepo,
        contentRepo,
        healthRepo,
        logger: WIKI.logger
      }),
      distribute: createDistributeService({
        sessionRepo,
        contentRepo,
        healthRepo,
        projectionService: projection,
        logger: WIKI.logger
      }),
      publish: createPublishService({
        sessionRepo,
        contentRepo,
        projectionService: projection,
        logger: WIKI.logger
      }),
      nav: createNavService(),
      projection
    }

    WIKI.logger.info('(REDSTONE/LMS) Module initialisé — F01–F05, C02, E02, T04')
  }
}
