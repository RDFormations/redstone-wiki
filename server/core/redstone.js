const path = require('path')

/* global WIKI */

module.exports = {
  async init () {
    const { createSessionRepository } = require(path.join(
      WIKI.SERVERPATH,
      'modules/redstone/repository/session.repository'
    ))
    const { createSessionService } = require(path.join(
      WIKI.SERVERPATH,
      'modules/redstone/services/session.service'
    ))

    const repo = createSessionRepository(WIKI.models.knex)
    const sessions = createSessionService({ repo, logger: WIKI.logger })

    WIKI.redstone = {
      sessions
    }

    WIKI.logger.info('(REDSTONE/LMS) Module initialisé — registre sessions F01')
  }
}
