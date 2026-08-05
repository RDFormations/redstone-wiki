const { createImportService } = require('../../services/import.service')

const longBody = 'x'.repeat(900)

const mockSession = {
  id: 'sess-1',
  slug: 'test-slug',
  state: 'draft',
  locale_default: 'fr',
  content_ready_at: null,
  metadata: {}
}

const createMocks = () => {
  const modules = []
  return {
    sessionRepo: {
      findById: jest.fn().mockResolvedValue(mockSession),
      update: jest.fn().mockImplementation(async (id, patch) => ({ ...mockSession, ...patch }))
    },
    contentRepo: {
      findBySessionAndPath: jest.fn().mockImplementation(async (sid, path) =>
        modules.find(m => m.path === path) || null
      ),
      upsertModule: jest.fn().mockImplementation(async (mod) => {
        const idx = modules.findIndex(m => m.path === mod.path)
        const saved = { ...mod, created_at: new Date().toISOString() }
        if (idx >= 0) modules[idx] = saved
        else modules.push(saved)
        return saved
      }),
      listBySession: jest.fn().mockImplementation(async () => modules)
    },
    healthRepo: {
      replaceForSession: jest.fn().mockResolvedValue(undefined)
    },
    modules
  }
}

describe('import.service', () => {
  it('importe et passe en draft_ready si QA verte', async () => {
    const mocks = createMocks()
    const service = createImportService({ ...mocks, logger: { info: jest.fn() } })

    const result = await service.importBulk('sess-1', {
      modules: [
        { path: '00-introduction.md', content: `---\ntitle: Intro\n---\n${longBody}` },
        { path: 'module-01-a.md', content: `---\n---\n${longBody}` },
        { path: 'exercice-01-a.md', content: `---\npaired: correction-01-a\n---\n${'x'.repeat(250)}` },
        { path: 'correction-01-a.md', content: `---\npaired: exercice-01-a\n---\n${'x'.repeat(350)}` }
      ]
    })

    expect(result.ok).toBe(true)
    expect(result.qa.status).toBe('green')
    expect(result.session.state).toBe('draft_ready')
    expect(result.content_ready).toBe(true)
    expect(mocks.modules.length).toBe(4)
  })

  it('rejette published agent sur module', async () => {
    const mocks = createMocks()
    const service = createImportService({ ...mocks, logger: { info: jest.fn() } })

    const result = await service.importBulk('sess-1', {
      modules: [
        { path: 'module-01-a.md', content: `---\npublished: true\n---\n${longBody}` }
      ]
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('published_forbidden')
  })
})
