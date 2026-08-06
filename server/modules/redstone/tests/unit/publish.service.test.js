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
    updatePublished: jest.fn().mockResolvedValue(undefined),
    updatePageId: jest.fn().mockResolvedValue(undefined)
  }
  const projectionService = {
    setPagePublished: jest.fn().mockResolvedValue(undefined),
    projectModule: jest.fn().mockImplementation(async (session, mod) => ({
      ok: true,
      path: mod.path,
      page_id: 501
    }))
  }
  const webhooks = { emit: jest.fn() }
  return {
    sessionRepo: { findById: jest.fn().mockResolvedValue(mockSession) },
    contentRepo,
    projectionService,
    webhooks,
    logger: { info: jest.fn(), warn: jest.fn() }
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

  it('publie un module seul (sans exercice ni correction)', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'module', path: 'module-01-a.md', by: 'formateur' })
    expect(result.ok).toBe(true)
    expect(result.published).toEqual(['module-01-a'])
    expect(result.count).toBe(1)
    expect(mocks.contentRepo.updatePublished).toHaveBeenCalledTimes(1)
    expect(mocks.projectionService.projectModule).toHaveBeenCalledWith(
      mockSession,
      expect.objectContaining({ path: 'module-01-a', published_stagiaire: true })
    )
    expect(mocks.webhooks.emit).toHaveBeenCalledWith(
      WEBHOOK_EVENTS.MODULE_PUBLISHED,
      expect.objectContaining({ slug: 'test-slug', by: 'formateur' })
    )
  })

  it('publie uniquement les stems listés pour un jour', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'day', day: 1 })
    expect(result.ok).toBe(true)
    expect(result.published).toEqual(['module-01-a', 'exercice-01-a'])
    expect(result.published).not.toContain('correction-01-a')
  })

  it('publie exercice seul (sans correction)', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'exercice', path: 'exercice-01-a' })
    expect(result.ok).toBe(true)
    expect(result.published).toEqual(['exercice-01-a'])
    expect(mocks.contentRepo.updatePublished).toHaveBeenCalledTimes(1)
  })

  it('publie correction seule', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'correction', path: 'correction-01-a' })
    expect(result.ok).toBe(true)
    expect(result.published).toEqual(['correction-01-a'])
  })

  it('rejette une action invalide', async () => {
    const mocks = createMocks()
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'unknown' })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('invalid_publish_action')
  })

  it('échoue si la projection/render échoue', async () => {
    const mocks = createMocks()
    mocks.projectionService.projectModule = jest.fn().mockResolvedValue({
      ok: false,
      path: 'module-01-a',
      error: 'Rendu HTML invalide'
    })
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'module', path: 'module-01-a.md' })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.error.code).toBe('render_failed')
    expect(result.failed).toHaveLength(1)
    expect(mocks.contentRepo.updatePublished).not.toHaveBeenCalled()
  })

  it('met à jour published_stagiaire après projection réussie', async () => {
    const calls = []
    const mocks = createMocks()
    mocks.projectionService.projectModule = jest.fn().mockImplementation(async () => {
      calls.push('project')
      return { ok: true, path: 'module-01-a', page_id: 501 }
    })
    mocks.contentRepo.updatePublished = jest.fn().mockImplementation(async () => {
      calls.push('lms')
    })
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', { action: 'module', path: 'module-01-a.md' })
    expect(result.ok).toBe(true)
    expect(calls).toEqual(['project', 'lms'])
  })

  it('dépublie un module restreint sans re-projection', async () => {
    const mocks = createMocks()
    mocks.contentRepo.updatePublished = jest.fn().mockResolvedValue(undefined)
    const svc = createPublishService(mocks)
    const result = await svc.publish('sess-1', {
      action: 'module',
      path: 'module-01-a',
      published: false
    })
    expect(result.ok).toBe(true)
    expect(result.unpublished).toEqual(['module-01-a'])
    expect(result.published).toEqual([])
    expect(mocks.projectionService.projectModule).not.toHaveBeenCalled()
    expect(mocks.projectionService.setPagePublished).toHaveBeenCalledWith(
      mockSession,
      expect.objectContaining({ path: 'module-01-a' }),
      false
    )
    expect(mocks.contentRepo.updatePublished).toHaveBeenCalledWith('m1', false)
    expect(mocks.webhooks.emit).not.toHaveBeenCalled()
  })
})
