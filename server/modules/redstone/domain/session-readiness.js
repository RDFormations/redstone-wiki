const { pageKind } = require('./publish-policy')

const HOURS_J48 = 48

const stemFromPath = path => String(path || '').replace(/\.md$/, '')

const hoursUntilStart = startsAt => {
  if (!startsAt) return null
  const start = new Date(startsAt).getTime()
  if (Number.isNaN(start)) return null
  return (start - Date.now()) / (1000 * 60 * 60)
}

const dayOneModuleStems = (session, modules) => {
  const planning = session.metadata?.planning || []
  const moduleStems = modules
    .filter(m => pageKind(stemFromPath(m.path)) === 'module')
    .map(m => stemFromPath(m.path))

  if (planning.length) {
    const day1 = planning.find(d => Number(d.day) === 1) || planning[0]
    return (day1?.modules || []).filter(stem => moduleStems.includes(stem))
  }
  return moduleStems
}

/**
 * T10′ / CDC §7.4 — définition « cours prêt » à J-48 h.
 */
const evaluateCourseReady = (session, modules) => {
  const issues = []
  const stateOk = ['draft_ready', 'distributed', 'live'].includes(session.state)
  if (!stateOk) issues.push('state')
  if (!session.content_ready_at) issues.push('qa')
  const stems = new Set(modules.map(m => stemFromPath(m.path)))
  if (!stems.has('00-introduction')) issues.push('intro')
  for (const stem of dayOneModuleStems(session, modules)) {
    if (!stems.has(stem)) issues.push(`missing:${stem}`)
  }
  return { ready: issues.length === 0, issues }
}

const linkIndicator = (url, label) => ({
  label,
  ok: Boolean(url),
  status: url ? 'ok' : 'missing'
})

/** T10′ — pastilles Teams/émargement + alerte J-48 h. */
const evaluateSessionIndicators = (session, modules) => {
  const links = session.metadata?.links || {}
  const readiness = evaluateCourseReady(session, modules)
  const hours = hoursUntilStart(session.starts_at)
  const withinJ48 = hours !== null && hours <= HOURS_J48

  return {
    teams: linkIndicator(links.teams, 'Teams'),
    emargement: linkIndicator(links.emargement, 'Émargement'),
    readiness: {
      ...readiness,
      within_j48: withinJ48,
      hours_until_start: hours,
      alert: withinJ48 && !readiness.ready,
      message: withinJ48 && !readiness.ready
        ? 'Support non prêt — contactez RedStone.'
        : ''
    }
  }
}

module.exports = {
  HOURS_J48,
  hoursUntilStart,
  dayOneModuleStems,
  evaluateCourseReady,
  evaluateSessionIndicators,
  linkIndicator
}
