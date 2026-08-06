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
})
