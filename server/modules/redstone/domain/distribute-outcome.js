const { WEBHOOK_EVENTS } = require('../domain/webhook-events')

/** Factorise les retours incomplete + webhook SESSION_INCOMPLETE (distribute). */
const buildIncompleteOutcome = async ({
  sessionRepo,
  sessionId,
  session,
  webhooks,
  errors,
  projection,
  errorCode,
  errorMessage
}) => {
  const updated = await sessionRepo.update(sessionId, { state: 'incomplete' })
  if (webhooks) {
    webhooks.emit(WEBHOOK_EVENTS.SESSION_INCOMPLETE, {
      session_id: sessionId,
      slug: session.slug,
      errors
    })
  }
  return {
    ok: false,
    status: 422,
    state: 'incomplete',
    session: updated,
    projection,
    error: { code: errorCode, message: errorMessage }
  }
}

module.exports = { buildIncompleteOutcome }
