const { createPublishService } = require('../../services/publish.service')
const { WEBHOOK_EVENTS } = require('../../domain/webhook-events')

const mockSession = {
  id: 'sess-1',
  slug: 'test-slug',
  metadata: { planning: [{ day: 1, modules: ['module-01-a', 'exercice-01-a'] }] }
}

const mockModules = [
  { id: 'm1', path: 'module-01-a', kind: 'module', published_stagiaire: false },
  { id: 'm2', path: 'exercice-01-a', kind: 'exercice', frontmatter: { paired: 'correction-01-a' } },
  { id: 'm3', path: 'correction-01-a', kind: 'correction', frontmatter: { paired: 'exercice-01-a' } }
]

const createMocks = () => {
  const contentRepo = {
    listBySession: jest.fn().mockResolvedValue(mockModules),
    updatePublished: jest.fn().mockResolvedValue(undefined)
  }
  const projectionService = {
    setPagePublished: jest.fn().mockResolvedValue(undefined)
  }
  const webhooks = { emit: jest.fn() }
  return {
    sessionRepo: { findById: jest.fn().mockResolvedValue(mockSession) },
    contentRepo,
    projectionService,
    webhooks,
    logger: { info: jest.fn() }
  }
}

describe('publish.service', () => {
  it('retourne 404 si session absente', async () => {
    const svc = createPublishService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(null) },
      contentRepo: { listBySession: jest.fn() },
      projectionService: { setPagePublished: jest.fn() }
    })
    const result = await svc.publish('missing', { action: 'module', path: 'module-01-a' })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('publie un module unique', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'module', path: 'module-01-a.md', by: 'formateur' })
    expect(result.ok).toBe(true)
    expect(result.published).toEqual(expect.arrayContaining(['module-01-a', 'exercice-01-a', 'correction-01-a']))
    expect(result.count).toBe(3)
    expect(mocks.contentRepo.updatePublished).toHaveBeenCalledTimes(3)
    expect(mocks.webhooks.emit).toHaveBeenCalledWith(
      WEBHOOK_EVENTS.MODULE_PUBLISHED,
      expect.objectContaining({ slug: 'test-slug', by: 'formateur' })
    )
  })

  it('publie tous les modules du jour avec leurs triplets', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'day', day: 1 })
    expect(result.ok).toBe(true)
    expect(result.published).toEqual(expect.arrayContaining(['module-01-a', 'exercice-01-a', 'correction-01-a']))
  })

  it('publie exercice + correction en paire', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'exercice', path: 'exercice-01-a' })
    expect(result.ok).toBe(true)
    expect(result.published).toEqual(expect.arrayContaining(['exercice-01-a', 'correction-01-a']))
  })

  it('rejette une action invalide', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'unknown' })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('invalid_publish_action')
  })
})
