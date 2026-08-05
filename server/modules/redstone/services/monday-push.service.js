const { MONDAY_COLUMNS, LMS_PUSH_COLUMNS } = require('../domain/monday-columns')
const { buildMondayColumnPatch } = require('../domain/monday-push')
const { runHealthChecks } = require('../domain/health-checks')
const {
  DEFAULT_BOARD_ID,
  changeStatusColumn,
  changeTextColumn,
  changeDateColumn,
  changeLinkColumn
} = require('../infrastructure/monday-client')

const columnWriters = {
  portal_status: changeStatusColumn,
  support_ready: changeStatusColumn,
  session_state: changeTextColumn,
  last_sync: changeDateColumn,
  error_detail: changeTextColumn
}

const createMondayPushService = ({
  sessionRepo,
  contentRepo,
  getMondayToken,
  getSiteHost = () => process.env.WIKI_SITE_HOST || 'https://formation.redstoneformations.fr',
  boardId = process.env.MONDAY_MISSIONS_BOARD_ID || DEFAULT_BOARD_ID,
  logger = console
}) => {
  const pushColumns = async (token, itemId, patch) => {
    const updated = []
    const skipped = []

    for (const key of LMS_PUSH_COLUMNS) {
      const columnId = MONDAY_COLUMNS[key]
      if (!columnId) {
        skipped.push(key)
        continue
      }
      const writer = columnWriters[key]
      const value = patch[key]
      if (value === undefined || value === '') {
        if (key === 'error_detail') continue
      }
      await writer(token, { boardId, itemId, columnId, value })
      updated.push(key)
    }

    if (MONDAY_COLUMNS.portail_formation && patch.portail_formation_url) {
      await changeLinkColumn(token, {
        boardId,
        itemId,
        columnId: MONDAY_COLUMNS.portail_formation,
        value: patch.portail_formation_url
      })
      updated.push('portail_formation')
    }

    return { updated, skipped }
  }

  return {
    async pushSession(sessionId, options = {}) {
      const session = options.session || (await sessionRepo.findById(sessionId))
      if (!session) {
        return { ok: false, status: 404, error: { code: 'session_not_found', message: 'Session introuvable.' } }
      }
      if (!session.monday_item_id) {
        return {
          ok: false,
          status: 422,
          error: { code: 'monday_item_missing', message: 'monday_item_id absent.' }
        }
      }

      const token = getMondayToken()
      if (!token) {
        return {
          ok: false,
          status: 503,
          error: { code: 'monday_token_missing', message: 'MONDAY_API_TOKEN requis.' }
        }
      }

      const modules = options.modules || (await contentRepo.listBySession(session.id))
      const statsMap = await contentRepo.moduleStatsBySessions([session.id])
      const health = options.health || runHealthChecks(session, modules)
      const patch = buildMondayColumnPatch({
        session,
        moduleStats: statsMap[session.id],
        health,
        siteHost: getSiteHost()
      })

      try {
        const result = await pushColumns(token, session.monday_item_id, patch)
        const merged = await sessionRepo.update(session.id, {
          metadata: {
            monday: {
              lms_push: {
                ...patch,
                updated_columns: result.updated,
                skipped_columns: result.skipped,
                pushed_at: new Date().toISOString()
              }
            }
          }
        })
        logger.info(
          `(REDSTONE/LMS) Monday push ${session.slug}: ${result.updated.length} colonne(s), skip=${result.skipped.length}`
        )
        return {
          ok: true,
          status: 200,
          session: merged,
          patch,
          monday: result
        }
      } catch (err) {
        logger.warn(`(REDSTONE/LMS) Monday push échec ${session.slug}: ${err.message}`)
        return {
          ok: false,
          status: 502,
          error: { code: 'monday_push_failed', message: err.message },
          patch
        }
      }
    },

    schedulePush(sessionId) {
      setImmediate(() => {
        this.pushSession(sessionId).catch(err => {
          logger.warn(`(REDSTONE/LMS) Monday push async ${sessionId}: ${err.message}`)
        })
      })
    }
  }
}

module.exports = { createMondayPushService }
