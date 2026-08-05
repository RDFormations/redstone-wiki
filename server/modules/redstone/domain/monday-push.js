const { supportReady } = require('./session-status')

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

const supportReadyLabel = (session, moduleStats = {}, healthOk = true) => {
  if (!supportReady(session) || !healthOk) return SUPPORT_LABEL.NO
  const total = moduleStats.total_modules || 0
  const published = moduleStats.published_modules || 0
  if (total === 0) return SUPPORT_LABEL.NO
  if (published >= total) return SUPPORT_LABEL.YES
  if (published > 0) return SUPPORT_LABEL.PARTIAL
  return SUPPORT_LABEL.NO
}

const errorDetail = (session, health) => {
  if (session.state !== 'incomplete') return ''
  const blocking = (health?.checks || []).filter(c => c.blocking)
  if (!blocking.length) return session.metadata?.lms?.last_error || 'Session incomplète'
  return blocking.map(c => c.message).join(' · ')
}

const portalUrl = (session, siteHost = 'https://formation.redstoneformations.fr') => {
  const host = String(siteHost).replace(/\/$/, '')
  const path = session.wiki_path || `/formations/${session.slug}`
  return `${host}${path}`
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
    portail_formation_url: portalUrl(session, siteHost),
    synced_at: syncedAt
  }
}

module.exports = {
  PORTAL_STATUS,
  SUPPORT_LABEL,
  portalStatusLabel,
  supportReadyLabel,
  errorDetail,
  portalUrl,
  buildMondayColumnPatch
}
