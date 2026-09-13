const { WEBHOOK_EVENTS } = require('../domain/webhook-events')

/** M04 — événements O02 qui déclenchent une projection Monday (colonnes M03). */
const MONDAY_PUSH_EVENTS = new Set([
  WEBHOOK_EVENTS.CONTENT_DRAFT_READY,
  WEBHOOK_EVENTS.SESSION_DISTRIBUTED,
  WEBHOOK_EVENTS.SESSION_INCOMPLETE,
  WEBHOOK_EVENTS.MODULE_PUBLISHED
])

/**
 * Branche le push Monday sur les webhooks sortants (M04 sortant).
 * Entrant Monday → agents : agent-gateway (hors scope LMS).
 */
const wireMondayPushBridge = (webhooks, mondayPush, logger = console) => {
  if (!webhooks?.emit || !mondayPush?.schedulePush) return webhooks

  const originalEmit = webhooks.emit.bind(webhooks)
  webhooks.emit = (event, payload) => {
    const result = originalEmit(event, payload)
    if (MONDAY_PUSH_EVENTS.has(event) && payload?.session_id) {
      mondayPush.schedulePush(payload.session_id)
      logger.debug?.(`(REDSTONE/LMS) M04 Monday push planifié (${event})`)
    }
    return result
  }
  return webhooks
}

module.exports = { wireMondayPushBridge, MONDAY_PUSH_EVENTS }
