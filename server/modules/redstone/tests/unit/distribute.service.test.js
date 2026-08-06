const { createDistributeService } = require('../../services/distribute.service')
const { WEBHOOK_EVENTS } = require('../../domain/webhook-events')

const long = n => 'x'.repeat(n)

const mockSession = {
  id: 'sess-1',
  slug: 'test-slug',
  state: 'draft_ready',
  content_ready_at: '2026-01-01T00:00:00.000Z',
  metadata: {}
}

const validModules = () => [
  { id: 'm0', path: '00-introduction', body_md: long(900), kind: 'intro' },
  { id: 'm1', path: 'module-01-a', body_md: long(900), kind: 'module' },
  {
    id: 'm2',
    path: 'exercice-01-a',
    body_md: long(250),
    kind: 'exercice',
    frontmatter: { paired: 'correction-01-a' }
  },
  {
    id: 'm3',
    path: 'correction-01-a',
    body_md: long(350),
    kind: 'correction',
    frontmatter: { paired: 'exercice-01-a' }
  }
]

const createMocks = (overrides = {}) => {
  const webhooks = { emit: jest.fn() }
  const sessionRepo = {
    findById: jest.fn().mockResolvedValue(mockSession),
    update: jest.fn().mockImplementation(async (id, patch) => ({ ...mockSession, ...patch }))
  }
  const contentRepo = {
    listBySession: jest.fn().mockResolvedValue(validModules()),
    updatePageId: jest.fn().mockResolvedValue(undefined)
  }
  const healthRepo = { replaceForSession: jest.fn().mockResolvedValue(undefined) }
  const projectionService = {
    projectSession: jest.fn().mockResolvedValue([
      { ok: true, path: '00-introduction', page_id: 101 },
      { ok: true, path: 'module-01-a', page_id: 102 }
    ]),
    ensureHubPages: jest.fn().mockResolvedValue([
      { ok: true, path: 'stagiaire', page_id: 201 },
      { ok: true, path: 'formateur', page_id: 202 }
    ]),
    verifySessionRenders: jest.fn().mockResolvedValue({ ok: true, stale: [], repaired: 0 })
  }
  const guestAccess = {
    ensureGuestFormationAccess: jest.fn().mockResolvedValue({ ok: true, created: true })
  }
  const trainerAccess = {
    ensureSessionTrainerAccess: jest.fn().mockResolvedValue({
      ok: true,
      group_id: 99,
      group_name: 'formateurs-test-slug',
      created: true,
      assignment: { ok: true, skipped: true }
    })
  }
  return {
    sessionRepo,
    contentRepo,
    healthRepo,
    projectionService,
    guestAccess,
    trainerAccess,
    webhooks,
    logger: { info: jest.fn() },
    ...overrides
  }
}

describe('distribute.service', () => {
  it('retourne 404 si session absente', async () => {
    const mocks = createMocks({
      sessionRepo: { findById: jest.fn().mockResolvedValue(null) }
    })
    const svc = createDistributeService(mocks)
    const result = await svc.distribute('missing')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('rejette si aucun contenu', async () => {
    const mocks = createMocks({
      contentRepo: { listBySession: jest.fn().mockResolvedValue([]) }
    })
    const svc = createDistributeService(mocks)
    const result = await svc.distribute('sess-1')
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('no_content')
  })

  it('bloque sur health failed sans force', async () => {
    const badModules = [
      { path: 'module-01-a', body_md: `# TODO\n${long(50)}`, kind: 'module' }
    ]
    const mocks = createMocks({
      contentRepo: { listBySession: jest.fn().mockResolvedValue(badModules) }
    })
    const svc = createDistributeService(mocks)
    const result = await svc.distribute('sess-1')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.error.code).toBe('health_failed')
    expect(mocks.webhooks.emit).toHaveBeenCalledWith(
      WEBHOOK_EVENTS.SESSION_INCOMPLETE,
      expect.objectContaining({ session_id: 'sess-1' })
    )
  })

  it('distribue avec succès et émet SESSION_DISTRIBUTED', async () => {
    const mocks = createMocks()
    const svc = createDistributeService(mocks)
    const result = await svc.distribute('sess-1')
    expect(result.ok).toBe(true)
    expect(result.session.state).toBe('distributed')
    expect(result.distributed).toBe(true)
    expect(mocks.healthRepo.replaceForSession).toHaveBeenCalled()
    expect(mocks.guestAccess.ensureGuestFormationAccess).toHaveBeenCalledWith('test-slug')
    expect(mocks.trainerAccess.ensureSessionTrainerAccess).toHaveBeenCalled()
    expect(mocks.webhooks.emit).toHaveBeenCalledWith(
      WEBHOOK_EVENTS.SESSION_DISTRIBUTED,
      expect.objectContaining({ slug: 'test-slug', distributed: true })
    )
  })

  it('bloque si rendus HTML invalides après projection', async () => {
    const mocks = createMocks({
      projectionService: {
        projectSession: jest.fn().mockResolvedValue([
          { ok: true, path: '00-introduction', page_id: 101 }
        ]),
        ensureHubPages: jest.fn().mockResolvedValue([
          { ok: true, path: 'formateur', page_id: 202 }
        ]),
        verifySessionRenders: jest.fn().mockResolvedValue({
          ok: false,
          stale: [{ path: 'formations/test-slug/formateur', render: '' }],
          repaired: 1
        })
      }
    })
    const svc = createDistributeService(mocks)
    const result = await svc.distribute('sess-1')
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('render_invalid')
    expect(mocks.webhooks.emit).toHaveBeenCalledWith(
      WEBHOOK_EVENTS.SESSION_INCOMPLETE,
      expect.objectContaining({ session_id: 'sess-1' })
    )
  })
})
