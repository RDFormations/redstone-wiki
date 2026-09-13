const { isoDate } = require('./portal-hub')
const { publicationSummary } = require('./formateur-hub')
const { evaluateSessionIndicators } = require('./session-readiness')
const { messageFor } = require('./session-state')
const { resolveTrainerEmail, trainerRedirectPath } = require('./trainer-access')

const STATE_LABELS = Object.freeze({
  draft: 'Brouillon',
  draft_ready: 'Prêt à distribuer',
  distributed: 'Distribué',
  incomplete: 'Incomplet',
  live: 'En cours',
  archived: 'Archivé'
})

const stateLabel = state => STATE_LABELS[state] || state || '—'

const formatDateRange = (startsAt, endsAt) => {
  const start = isoDate(startsAt)
  const end = isoDate(endsAt)
  if (!start) return 'Dates à confirmer'
  if (!end || end === start) return start
  return `${start} → ${end}`
}

const publicationPercent = publication => {
  if (!publication?.total) return 0
  return Math.round((publication.published / publication.total) * 100)
}

const sessionSortKey = session => {
  const start = session.starts_at ? new Date(session.starts_at).getTime() : Number.MAX_SAFE_INTEGER
  const incomplete = session.state === 'incomplete' ? 0 : 1
  return [incomplete, start, session.slug || '']
}

const compareSessions = (a, b) => {
  const ka = sessionSortKey(a)
  const kb = sessionSortKey(b)
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1
    if (ka[i] > kb[i]) return 1
  }
  return 0
}

const sessionMatchesTrainerEmail = (session, email) => {
  if (!email) return false
  const resolved = resolveTrainerEmail(session)
  return resolved && resolved === String(email).trim().toLowerCase()
}

/**
 * T06 — carte session pour le dashboard formateur.
 */
const buildTrainerSessionCard = (session, modules, options = {}) => {
  const locale = options.locale || session.locale_default || 'fr'
  const publication = publicationSummary(modules)
  const indicators = evaluateSessionIndicators(session, modules)
  const prefix = locale ? `/${locale}` : ''

  return {
    sessionId: session.id,
    slug: session.slug,
    title: session.title,
    client: session.client,
    reference: session.ref_client || '',
    state: session.state,
    state_label: stateLabel(session.state),
    state_hint: messageFor(session.state, 'formateur'),
    dates: {
      start: isoDate(session.starts_at),
      end: isoDate(session.ends_at),
      label: formatDateRange(session.starts_at, session.ends_at)
    },
    location: session.metadata?.location || '',
    modality: session.metadata?.modality || session.metadata?.monday?.modalite || '',
    distributed: Boolean(session.distributed_at),
    content_ready: Boolean(session.content_ready_at),
    publication,
    publication_percent: publicationPercent(publication),
    indicators,
    cockpit_href: `${prefix}${trainerRedirectPath(session.slug)}`,
    stagiaire_href: `${prefix}/formations/${session.slug}/stagiaire`,
    trainer_email: resolveTrainerEmail(session)
  }
}

const sortTrainerSessionCards = cards =>
  [...cards].sort((a, b) => compareSessions(
    { slug: a.slug, state: a.state, starts_at: a.dates?.start },
    { slug: b.slug, state: b.state, starts_at: b.dates?.start }
  ))

const MES_SESSIONS_WIKI_PAGE = Object.freeze({
  path: 'formations/mes-sessions',
  title: 'Mes sessions',
  body_md: `# Mes sessions

Tableau de bord formateur RedStone — vos formations en cours et à venir.

L'interface interactive charge automatiquement la liste, les dates et les indicateurs de session.
`
})

module.exports = {
  STATE_LABELS,
  stateLabel,
  formatDateRange,
  publicationPercent,
  sessionMatchesTrainerEmail,
  buildTrainerSessionCard,
  sortTrainerSessionCards,
  MES_SESSIONS_WIKI_PAGE
}
