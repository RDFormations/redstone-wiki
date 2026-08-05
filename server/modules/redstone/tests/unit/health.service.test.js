const { createHealthService } = require('../../services/health.service')

const mockSession = {
  id: 'sess-1',
  slug: 'test-slug',
  content_ready_at: '2026-01-01T00:00:00.000Z',
  distributed_at: null,
  metadata: {}
}

const mockModules = [
  { path: '00-introduction', body_md: 'x'.repeat(900) },
  { path: 'module-01-a', body_md: 'x'.repeat(900), kind: 'module' }
]

describe('health.service', () => {
  it('retourne 404 si session absente', async () => {
    const svc = createHealthService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(null) },
      contentRepo: { listBySession: jest.fn() },
      healthRepo: { listBySession: jest.fn() }
    })
    const result = await svc.getForSession('missing')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
    expect(result.error.code).toBe('session_not_found')
  })

  it('agrège checks + stored_checks pour une session existante', async () => {
    const stored = [{ id: 'h1', checkId: 'intro_present', level: 'ok' }]
    const svc = createHealthService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(mockSession) },
      contentRepo: { listBySession: jest.fn().mockResolvedValue(mockModules) },
      healthRepo: { listBySession: jest.fn().mockResolvedValue(stored) }
    })
    const result = await svc.getForSession('sess-1')
    expect(result.ok).toBe(true)
    expect(result.body.session_id).toBe('sess-1')
    expect(result.body.content_ready).toBe(true)
    expect(result.body.distributed).toBe(false)
    expect(Array.isArray(result.body.checks)).toBe(true)
    expect(result.body.stored_checks).toEqual(stored)
  })
})
