const { createMondayPushService } = require('../../services/monday-push.service')

describe('monday-push.service', () => {
  const session = {
    id: 's1',
    slug: 'test',
    state: 'distributed',
    monday_item_id: 12345,
    distributed_at: '2026-01-02',
    content_ready_at: '2026-01-01',
    wiki_path: '/formations/test',
    metadata: {}
  }

  const baseDeps = () => ({
    sessionRepo: {
      findById: jest.fn().mockResolvedValue(session),
      update: jest.fn().mockImplementation(async (id, patch) => ({ ...session, ...patch }))
    },
    contentRepo: {
      listBySession: jest.fn().mockResolvedValue([]),
      moduleStatsBySessions: jest.fn().mockResolvedValue({ s1: { total_modules: 0, published_modules: 0 } })
    },
    getMondayToken: () => 'fake-token',
    logger: { info: jest.fn(), warn: jest.fn() }
  })

  it('retourne 503 si token Monday absent', async () => {
    const svc = createMondayPushService({ ...baseDeps(), getMondayToken: () => null })
    const result = await svc.pushSession('s1')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
  })

  it('retourne 422 si monday_item_id absent', async () => {
    const deps = baseDeps()
    deps.sessionRepo.findById.mockResolvedValue({ ...session, monday_item_id: null })
    const svc = createMondayPushService(deps)
    const result = await svc.pushSession('s1')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
  })

  it('retourne 404 si session absente', async () => {
    const deps = baseDeps()
    deps.sessionRepo.findById.mockResolvedValue(null)
    const svc = createMondayPushService(deps)
    const result = await svc.pushSession('missing')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })
})
