const { createContentVersionsService } = require('../../services/content-versions.service')

describe('content-versions restore (F09)', () => {
  it('restaure une version via contentEdit', async () => {
    const updateModule = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      version: 4,
      path: 'module-01-a'
    })
    const svc = createContentVersionsService({
      sessionRepo: { findById: async () => ({ id: 's1' }) },
      contentRepo: {
        findVersion: async () => ({
          id: 'v2',
          module_id: 'm1',
          version: 2,
          body_md: '# Old',
          frontmatter: {}
        }),
        listBySession: async () => [{ id: 'm1', path: 'module-01-a' }]
      },
      contentEdit: { updateModule }
    })
    const result = await svc.restoreVersion('s1', 'v2', { author: 'ops' })
    expect(result.ok).toBe(true)
    expect(result.restored_from_version).toBe(2)
    expect(updateModule).toHaveBeenCalledWith(
      's1',
      { path: 'module-01-a', body_md: '# Old', frontmatter: {} },
      expect.objectContaining({ author: 'ops' })
    )
  })
})
