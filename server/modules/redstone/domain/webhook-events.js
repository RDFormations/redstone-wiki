/** O02 — événements webhooks sortants (contrat stable agent-gateway). */
const WEBHOOK_EVENTS = Object.freeze({
  CONTENT_DRAFT_READY: 'content.draft_ready',
  SESSION_DISTRIBUTED: 'session.distributed',
  SESSION_INCOMPLETE: 'session.incomplete',
  MODULE_PUBLISHED: 'module.published'
})

const isKnownEvent = event => Object.values(WEBHOOK_EVENTS).includes(event)

module.exports = { WEBHOOK_EVENTS, isKnownEvent }
