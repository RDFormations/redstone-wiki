const { createContentVersionsService, normalizePath } = require('../../services/content-versions.service')

const session = { id: 'sess-1', slug: 'test' }
const mod = {
  id: 'mod-1',
  path: 'module-01-a',
  current_version: 2
}
const versions = [
  { id: 'v2', module_id: 'mod-1', version: 2, source: 'agent', created_at: '2026-08-01' },
  { id: 'v1', module_id: 'mod-1', version: 1, source: 'agent', created_at: '2026-07-01' }
]

describe('content-versions.service', () => {
  it('normalizePath retire .md', () => {
    expect(normalizePath('module-01-a')).toBe('module-01-a')
    expect(normalizePath('module-01-a.md')).toBe('module-01-a')
  })

  it('listForModule retourne les versions', async () => {
    const svc = createContentVersionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findBySessionAndPath: jest.fn().mockResolvedValue(mod),
        listVersions: jest.fn().mockResolvedValue(versions)
      }
    })
    const result = await svc.listForModule('sess-1', 'module-01-a')
    expect(result.ok).toBe(true)
    expect(result.versions).toHaveLength(2)
    expect(result.current_version).toBe(2)
  })

  it('listForModule 404 si module absent', async () => {
    const svc = createContentVersionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: jest.fn().mockResolvedValue(null) }
    })
    const result = await svc.listForModule('sess-1', 'missing.md')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('getVersion retourne le corps markdown', async () => {
    const version = {
      id: 'v2',
      module_id: 'mod-1',
      version: 2,
      body_md: '# v2',
      source: 'ui_edit',
      created_at: '2026-08-02'
    }
    const svc = createContentVersionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findVersion: jest.fn().mockResolvedValue(version),
        listBySession: jest.fn().mockResolvedValue([mod])
      }
    })
    const result = await svc.getVersion('sess-1', 'v2')
    expect(result.ok).toBe(true)
    expect(result.version.body_md).toBe('# v2')
    expect(result.path).toBe('module-01-a')
  })

  it('getVersion 404 si version hors session', async () => {
    const svc = createContentVersionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findVersion: jest.fn().mockResolvedValue({
          id: 'v9',
          module_id: 'other-mod',
          version: 1,
          body_md: 'x'
        }),
        listBySession: jest.fn().mockResolvedValue([mod])
      }
    })
    const result = await svc.getVersion('sess-1', 'v9')
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('version_not_found')
  })

  it('compareVersions diff automatique vs version précédente', async () => {
    const version = {
      id: 'v2',
      module_id: 'mod-1',
      version: 2,
      body_md: 'ligne A\nligne B modifiée',
      source: 'ui_edit'
    }
    const svc = createContentVersionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findVersion: jest.fn()
          .mockResolvedValueOnce(version)
          .mockResolvedValueOnce({ id: 'v1', module_id: 'mod-1', version: 1, body_md: 'ligne A\nligne B' }),
        listBySession: jest.fn().mockResolvedValue([mod]),
        listVersions: jest.fn().mockResolvedValue([
          { id: 'v2', version: 2 },
          { id: 'v1', version: 1 }
        ])
      }
    })
    const result = await svc.compareVersions('sess-1', 'v2')
    expect(result.ok).toBe(true)
    expect(result.base_version).toBe(1)
    expect(result.summary.added + result.summary.removed).toBeGreaterThan(0)
    expect(result.diff.some(h => h.type === 'add' || h.type === 'remove')).toBe(true)
  })

  it('compareVersions avec base explicite', async () => {
    const version = { id: 'v3', module_id: 'mod-1', version: 3, body_md: 'final' }
    const base = { id: 'v1', module_id: 'mod-1', version: 1, body_md: 'initial' }
    const svc = createContentVersionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findVersion: jest.fn()
          .mockResolvedValueOnce(version)
          .mockResolvedValueOnce(base),
        listBySession: jest.fn().mockResolvedValue([mod])
      }
    })
    const result = await svc.compareVersions('sess-1', 'v3', 'v1')
    expect(result.ok).toBe(true)
    expect(result.summary.removed).toBeGreaterThan(0)
    expect(result.summary.added).toBeGreaterThan(0)
  })

  it('compareVersions 404 si base invalide', async () => {
    const version = { id: 'v2', module_id: 'mod-1', version: 2, body_md: 'x' }
    const svc = createContentVersionsService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findVersion: jest.fn()
          .mockResolvedValueOnce(version)
          .mockResolvedValueOnce(null),
        listBySession: jest.fn().mockResolvedValue([mod])
      }
    })
    const result = await svc.compareVersions('sess-1', 'v2', 'missing-base')
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('base_version_not_found')
  })
})
