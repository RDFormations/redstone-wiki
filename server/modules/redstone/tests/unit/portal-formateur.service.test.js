const { createPortalService } = require('../../services/portal.service')

const mockSession = {
  id: 'sess-1',
  slug: 'test-slug',
  state: 'distributed',
  title: 'Test',
  client: 'RDF',
  locale_default: 'fr',
  content_ready_at: '2026-01-01',
  distributed_at: '2026-01-02',
  metadata: {}
}

const mockModules = [
  { path: 'module-01-a', kind: 'module', title: 'M1', published_stagiaire: false }
]

describe('portal.service formateur hub', () => {
  it('getFormateurHub retourne 404 si session absente', async () => {
    const svc = createPortalService({
      sessionRepo: { findBySlug: jest.fn().mockResolvedValue(null) },
      contentRepo: { listBySession: jest.fn() },
      navService: { getNav: jest.fn() },
      getSiteHost: () => 'http://localhost:3000'
    })
    const result = await svc.getFormateurHub('missing')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('getFormateurHub construit le hub pour session existante', async () => {
    const svc = createPortalService({
      sessionRepo: { findBySlug: jest.fn().mockResolvedValue(mockSession) },
      contentRepo: { listBySession: jest.fn().mockResolvedValue(mockModules) },
      navService: { getNav: jest.fn() },
      getSiteHost: () => 'http://localhost:3000'
    })
    const result = await svc.getFormateurHub('test-slug')
    expect(result.ok).toBe(true)
    expect(result.hub.slug).toBe('test-slug')
    expect(result.hub.sessionId).toBe('sess-1')
    expect(result.session.id).toBe('sess-1')
  })
})
