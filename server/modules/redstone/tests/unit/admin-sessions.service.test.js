const { createAdminSessionsService, businessStatus } = require('../../services/admin-sessions.service')

const mockSession = {
  id: 's1',
  slug: 'test',
  title: 'Test',
  client: 'RDF',
  state: 'distributed',
  starts_at: '2026-08-10',
  ends_at: '2026-08-12',
  monday_item_id: 123,
  content_ready_at: '2026-01-01',
  distributed_at: '2026-01-02',
  metadata: {}
}

describe('admin-sessions.service F13', () => {
  it('businessStatus détecte à venir / terminée', () => {
    expect(businessStatus({ state: 'archived' })).toBe('terminated')
    expect(businessStatus({ state: 'distributed', starts_at: '2099-01-01', ends_at: '2099-01-05' })).toBe('upcoming')
  })

  it('liste avec stats publication', async () => {
    const svc = createAdminSessionsService({
      sessionRepo: {
        list: jest.fn().mockResolvedValue({ items: [mockSession], total: 1, limit: 50, offset: 0 })
      },
      contentRepo: {
        moduleStatsBySessions: jest.fn().mockResolvedValue({
          s1: { total_modules: 3, published_modules: 1 }
        })
      },
      healthRepo: { listBySession: jest.fn() }
    })
    const result = await svc.list({ q: 'test' })
    expect(result.ok).toBe(true)
    expect(result.sessions[0].publication.label).toBe('1/3')
    expect(result.sessions[0].support_ready).toBe(true)
    expect(result.sessions[0].links.stagiaire).toContain('/stagiaire')
  })

  it('getDetail expose actions.can_distribute', async () => {
    const draftReady = { ...mockSession, state: 'draft_ready', distributed_at: null }
    const svc = createAdminSessionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(draftReady) },
      contentRepo: {
        moduleStatsBySessions: jest.fn().mockResolvedValue({ s1: { total_modules: 1, published_modules: 0 } })
      },
      healthRepo: { listBySession: jest.fn().mockResolvedValue([]) }
    })
    const result = await svc.getDetail('s1')
    expect(result.ok).toBe(true)
    expect(result.session.actions.can_distribute).toBe(true)
  })
})
