const crypto = require('crypto')
const { supportReady } = require('./session-status')
const { siteBase } = require('./portal-hub')

const PORTAL_STATUS = Object.freeze({
  LIVE: 'Live',
  DRAFT: 'Brouillon',
  ERROR: 'Erreur',
  ABSENT: 'Absent'
})

const SUPPORT_LABEL = Object.freeze({
  YES: 'Oui',
  NO: 'Non',
  PARTIAL: 'Partiel'
})

const portalStatusLabel = session => {
  if (session.state === 'incomplete') return PORTAL_STATUS.ERROR
  if (session.distributed_at && ['distributed', 'live', 'archived'].includes(session.state)) {
    return PORTAL_STATUS.LIVE
  }
  if (session.content_ready_at || session.state === 'draft_ready') return PORTAL_STATUS.DRAFT
  return PORTAL_STATUS.ABSENT
}

/** O03 — « Support prêt » = distribué live + health OK ; Partiel = publication stagiaire partielle. */
const supportReadyLabel = (session, moduleStats = {}, healthOk = true) => {
  if (!supportReady(session) || !healthOk) return SUPPORT_LABEL.NO
  const total = moduleStats.total_modules || 0
  const published = moduleStats.published_modules || 0
  if (total === 0 || published === 0) return SUPPORT_LABEL.YES
  if (published >= total) return SUPPORT_LABEL.YES
  return SUPPORT_LABEL.PARTIAL
}

const errorDetail = (session, health) => {
  if (session.state !== 'incomplete') return ''
  const blocking = (health?.checks || []).filter(c => c.blocking)
  if (!blocking.length) return session.metadata?.lms?.last_error || 'Session incomplète'
  return blocking.map(c => c.message).join(' · ')
}

/** M01 — URL canonique stagiaire (Monday + convocation). */
const stagiaireUrl = (session, siteHost = 'https://formation.redstoneformations.fr') => {
  const locale = session.locale_default || 'fr'
  const host = siteBase(siteHost)
  return `${host}/${locale}/formations/${session.slug}/stagiaire`
}

const buildMondayColumnPatch = ({ session, moduleStats, health, siteHost }) => {
  const healthOk = health?.ok !== false
  const syncedAt = new Date().toISOString()
  return {
    portal_status: portalStatusLabel(session),
    support_ready: supportReadyLabel(session, moduleStats, healthOk),
    session_state: session.state,
    last_sync: syncedAt.slice(0, 10),
    error_detail: errorDetail(session, health),
    portail_formation_url: stagiaireUrl(session, siteHost),
    synced_at: syncedAt
  }
}

/** Empreinte stable pour idempotence M04 (hors last_sync). */
const patchFingerprint = patch =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        portal_status: patch.portal_status,
        support_ready: patch.support_ready,
        session_state: patch.session_state,
        error_detail: patch.error_detail || '',
        portail_formation_url: patch.portail_formation_url || ''
      })
    )
    .digest('hex')

module.exports = {
  PORTAL_STATUS,
  SUPPORT_LABEL,
  portalStatusLabel,
  supportReadyLabel,
  errorDetail,
  stagiaireUrl,
  buildMondayColumnPatch,
  patchFingerprint
}
