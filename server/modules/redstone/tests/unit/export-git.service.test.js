const fs = require('fs')
const os = require('os')
const path = require('path')
const { createExportGitService } = require('../../services/export-git.service')

describe('export-git.service C03′', () => {
  it('503 si racine export absente', async () => {
    const svc = createExportGitService({
      sessionRepo: { findById: async () => ({ id: 's1', slug: 'demo', locale_default: 'fr' }) },
      contentRepo: { listBySession: async () => [] },
      getExportRoot: () => null
    })
    const result = await svc.exportSession('s1')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
  })

  it('écrit les modules MD sous formations/{slug}/cours/{locale}', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-export-'))
    const svc = createExportGitService({
      sessionRepo: {
        findById: async () => ({ id: 's1', slug: 'demo-export', locale_default: 'en' })
      },
      contentRepo: {
        listBySession: async () => ([
          { path: 'module-01-a', kind: 'module', body_md: '# Hello' },
          { path: 'stagiaire', kind: 'hub', body_md: 'skip' }
        ])
      },
      getExportRoot: () => root,
      logger: { info: jest.fn() }
    })
    const result = await svc.exportSession('s1')
    expect(result.ok).toBe(true)
    expect(result.files).toHaveLength(1)
    const written = fs.readFileSync(
      path.join(root, 'formations/demo-export/cours/en/module-01-a.md'),
      'utf8'
    )
    expect(written).toBe('# Hello')
  })

  it('404 session absente', async () => {
    const svc = createExportGitService({
      sessionRepo: { findById: async () => null },
      contentRepo: { listBySession: async () => [] },
      getExportRoot: () => '/tmp'
    })
    const result = await svc.exportSession('missing')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })
})
