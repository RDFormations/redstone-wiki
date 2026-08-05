const {
  mapMondayItemToSessionPatch,
  mergeSessionMetadata
} = require('../domain/monday-metadata')

const createMondaySyncService = ({
  sessionRepo,
  fetchMissionItem,
  getMondayToken,
  logger = console
}) => ({
  async syncFromMonday(sessionId, options = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) {
      return { ok: false, status: 404, error: { code: 'session_not_found', message: 'Session introuvable.' } }
    }

    if (!session.monday_item_id) {
      return {
        ok: false,
        status: 422,
        error: { code: 'monday_item_missing', message: 'monday_item_id absent sur la session.' }
      }
    }

    let patch
    if (options.payload && Object.keys(options.payload).length) {
      patch = { ...options.payload }
      if (patch.metadata) {
        patch.metadata = mergeSessionMetadata(session.metadata || {}, patch.metadata)
      }
    } else {
      const token = getMondayToken()
      if (!token) {
        return {
          ok: false,
          status: 503,
          error: {
            code: 'monday_token_missing',
            message: 'MONDAY_API_TOKEN requis pour sync Monday.'
          }
        }
      }
      const item = await fetchMissionItem(session.monday_item_id, token)
      patch = mapMondayItemToSessionPatch(item)
    }

    const mergedMetadata = mergeSessionMetadata(session.metadata || {}, patch.metadata || {})
    const updatePatch = {
      ...patch,
      metadata: mergedMetadata
    }
    Object.keys(updatePatch).forEach(key => {
      if (updatePatch[key] === undefined) delete updatePatch[key]
    })

    const updated = await sessionRepo.update(sessionId, updatePatch)
    logger.info(`(REDSTONE/LMS) Monday sync OK: ${updated.slug}`)

    return {
      ok: true,
      status: 200,
      session: updated,
      synced_fields: Object.keys(updatePatch)
    }
  }
})

module.exports = { createMondaySyncService }
