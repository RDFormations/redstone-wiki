const { SESSION_STATES } = require('./session-state')

const DATE_PRESETS = ['upcoming_7', 'upcoming_30', 'in_progress', 'past', 'all']

const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

const todayIso = () => new Date().toISOString().split('T')[0]

/**
 * F13 — parse query params liste sessions admin.
 */
const parseSessionListFilters = (query = {}) => {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 100)
  const offset = Math.max(Number.parseInt(query.offset, 10) || 0, 0)
  const state = query.state && SESSION_STATES.includes(query.state) ? query.state : null
  const datePreset = DATE_PRESETS.includes(query.date_preset) ? query.date_preset : 'all'
  const published = ['any', 'none', 'all_published', 'partial'].includes(query.published)
    ? query.published
    : 'all'
  const terminated = ['yes', 'no', 'all'].includes(query.terminated) ? query.terminated : 'all'
  const q = typeof query.q === 'string' ? query.q.trim() : ''

  return {
    limit,
    offset,
    state,
    datePreset,
    published,
    terminated,
    q,
    startsAfter: query.starts_after || null,
    startsBefore: query.starts_before || null
  }
}

const applyDatePreset = (builder, preset, knex) => {
  const today = todayIso()
  if (preset === 'upcoming_7') {
    return builder
      .where('startsAt', '>=', today)
      .where('startsAt', '<=', addDays(today, 7))
  }
  if (preset === 'upcoming_30') {
    return builder
      .where('startsAt', '>=', today)
      .where('startsAt', '<=', addDays(today, 30))
  }
  if (preset === 'in_progress') {
    return builder.where('startsAt', '<=', today).where('endsAt', '>=', today)
  }
  if (preset === 'past') {
    return builder.where('endsAt', '<', today)
  }
  return builder
}

module.exports = {
  DATE_PRESETS,
  parseSessionListFilters,
  applyDatePreset,
  todayIso,
  addDays
}
