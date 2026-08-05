const {
  portalStatusLabel,
  supportReadyLabel,
  buildMondayColumnPatch,
  PORTAL_STATUS,
  SUPPORT_LABEL
} = require('../../domain/monday-push')

describe('monday-push domain M03', () => {
  const baseSession = {
    slug: 'test',
    state: 'distributed',
    distributed_at: '2026-01-02',
    content_ready_at: '2026-01-01',
    wiki_path: '/formations/test'
  }

  it('portalStatusLabel — Live après distribute', () => {
    expect(portalStatusLabel(baseSession)).toBe(PORTAL_STATUS.LIVE)
    expect(portalStatusLabel({ ...baseSession, state: 'draft_ready', distributed_at: null })).toBe(
      PORTAL_STATUS.DRAFT
    )
    expect(portalStatusLabel({ ...baseSession, state: 'incomplete' })).toBe(PORTAL_STATUS.ERROR)
  })

  it('supportReadyLabel — Oui / Partiel / Non', () => {
    expect(supportReadyLabel(baseSession, { total_modules: 2, published_modules: 2 }, true)).toBe(
      SUPPORT_LABEL.YES
    )
    expect(supportReadyLabel(baseSession, { total_modules: 2, published_modules: 1 }, true)).toBe(
      SUPPORT_LABEL.PARTIAL
    )
    expect(supportReadyLabel({ ...baseSession, distributed_at: null }, {}, true)).toBe(SUPPORT_LABEL.NO)
  })

  it('buildMondayColumnPatch agrège les champs M03', () => {
    const patch = buildMondayColumnPatch({
      session: baseSession,
      moduleStats: { total_modules: 3, published_modules: 1 },
      health: { ok: true, checks: [] },
      siteHost: 'http://localhost:3000'
    })
    expect(patch.portal_status).toBe('Live')
    expect(patch.support_ready).toBe('Partiel')
    expect(patch.session_state).toBe('distributed')
    expect(patch.portail_formation_url).toContain('/formations/test')
  })
})
