const {
  mapMondayItemToSessionPatch,
  mergeSessionMetadata
} = require('../domain/monday-metadata')
const {
  validateMondaySyncPatch,
  applyMetadataMerge
} = require('../domain/monday-sync-validation')

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
    if (options.mode === 'override') {
      const validation = validateMondaySyncPatch(options.body)
      if (!validation.ok) {
        return { ok: false, status: 422, error: validation }
      }
      patch = applyMetadataMerge(session, validation.value)
    } else {
      const token = getMondayToken()
      if (!token) {
        return {
          ok: false,
          status: 503,
          error: {
            code: 'monday_token_missing',
            message: 'MONDAY_API_TOKEN requis pour sync Monday (ou fournir un body override).'
          }
        }
      }
      const item = await fetchMissionItem(session.monday_item_id, token)
      patch = mapMondayItemToSessionPatch(item)
      patch.metadata = mergeSessionMetadata(session.metadata || {}, patch.metadata || {})
    }

    const updatePatch = { ...patch }
    Object.keys(updatePatch).forEach(key => {
      if (updatePatch[key] === undefined) delete updatePatch[key]
    })

    const updated = await sessionRepo.update(sessionId, updatePatch)
    logger.info(`(REDSTONE/LMS) Monday sync OK: ${updated.slug} (${options.mode})`)

    return {
      ok: true,
      status: 200,
      session: updated,
      synced_fields: Object.keys(updatePatch),
      mode: options.mode
    }
  }
})

module.exports = { createMondaySyncService }
