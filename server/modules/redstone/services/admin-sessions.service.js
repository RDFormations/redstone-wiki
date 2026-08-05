const { parseSessionListFilters } = require('../domain/session-filters')
const { enrichSessionStatus } = require('../domain/session-status')
const { SESSION_STATES } = require('../domain/session-state')
const { canDistribute } = require('../domain/session-actions')

const MONDAY_BOARD_ID = process.env.MONDAY_MISSIONS_BOARD_ID || '18420737449'

const businessStatus = session => {
  const today = new Date().toISOString().split('T')[0]
  if (session.state === 'archived') return 'terminated'
  if (session.ends_at && session.ends_at < today) return 'terminated'
  if (session.starts_at && session.starts_at <= today && (!session.ends_at || session.ends_at >= today)) {
    return 'in_progress'
  }
  if (session.starts_at && session.starts_at > today) return 'upcoming'
  return 'unknown'
}

const mondayUrl = itemId =>
  itemId ? `https://rdformations.monday.com/boards/${MONDAY_BOARD_ID}/pulses/${itemId}` : ''

const toListRow = (session, stats = {}) => {
  const locale = session.locale_default || 'fr'
  return {
    ...session,
    ...enrichSessionStatus(session),
    publication: {
      published_modules: stats.published_modules || 0,
      total_modules: stats.total_modules || 0,
      label: `${stats.published_modules || 0}/${stats.total_modules || 0}`
    },
    business_status: businessStatus(session),
    monday_url: mondayUrl(session.monday_item_id),
    links: {
      stagiaire: `/${locale}/formations/${session.slug}/stagiaire`,
      formateur: `/${locale}/formations/${session.slug}/formateur`,
      monday: mondayUrl(session.monday_item_id)
    }
  }
}

const createAdminSessionsService = ({ sessionRepo, contentRepo, healthRepo }) => ({
  async list(query = {}) {
    const filters = parseSessionListFilters(query)
    const result = await sessionRepo.list(filters)
    const statsMap = await contentRepo.moduleStatsBySessions(result.items.map(s => s.id))
    return {
      ok: true,
      status: 200,
      sessions: result.items.map(s => toListRow(s, statsMap[s.id])),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      filters: {
        states: SESSION_STATES,
        date_presets: ['upcoming_7', 'upcoming_30', 'in_progress', 'past', 'all'],
        published: ['any', 'none', 'all_published', 'partial'],
        terminated: ['yes', 'no', 'all']
      }
    }
  },

  async getDetail(sessionId) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) {
      return { ok: false, status: 404, error: { code: 'session_not_found', message: 'Session introuvable.' } }
    }
    const stats = await contentRepo.moduleStatsBySessions([sessionId])
    const storedChecks = await healthRepo.listBySession(sessionId)
    const row = toListRow(session, stats[sessionId])
    return {
      ok: true,
      status: 200,
      session: {
        ...row,
        actions: { can_distribute: canDistribute(row) }
      },
      health_checks: storedChecks
    }
  }
})

module.exports = { createAdminSessionsService, toListRow, businessStatus }
