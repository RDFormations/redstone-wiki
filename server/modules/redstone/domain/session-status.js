/**
 * O03 — distinction contenu prêt vs distribué live.
 */

const contentReady = session => Boolean(session?.content_ready_at)

const distributed = session => Boolean(session?.distributed_at)

/** Support prêt stagiaire : distribué live uniquement (pas draft_ready seul). */
const supportReady = session =>
  distributed(session) && ['distributed', 'live', 'archived'].includes(session?.state)

const enrichSessionStatus = session => ({
  content_ready: contentReady(session),
  distributed: distributed(session),
  support_ready: supportReady(session)
})

module.exports = {
  contentReady,
  distributed,
  supportReady,
  enrichSessionStatus
}
