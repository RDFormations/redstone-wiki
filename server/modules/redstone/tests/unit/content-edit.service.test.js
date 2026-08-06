const { createContentEditService } = require('../../services/content-edit.service')

const session = { id: 'sess-1', slug: 'test-course', locale_default: 'fr' }
const mod = {
  id: 'mod-1',
  path: 'module-01-a',
  kind: 'module',
  title: 'Module 1',
  body_md: '# Avant',
  frontmatter: {},
  published_stagiaire: false,
  content_hash: 'hash-old',
  current_version: 1,
  page_id: null,
  locale: 'fr'
}

describe('content-edit.service', () => {
  it('getModule retourne le contenu courant', async () => {
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: jest.fn().mockResolvedValue(mod) }
    })
    const result = await svc.getModule('sess-1', 'module-01-a')
    expect(result.ok).toBe(true)
    expect(result.body_md).toBe('# Avant')
    expect(result.current_version).toBe(1)
  })

  it('updateModule crée une nouvelle version ui_edit', async () => {
    const upsertModule = jest.fn().mockResolvedValue({
      ...mod,
      body_md: '# Après',
      current_version: 2,
      content_hash: 'hash-new'
    })
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findBySessionAndPath: jest.fn().mockResolvedValue(mod),
        upsertModule
      },
      projectionService: { projectModule: jest.fn() }
    })
    const result = await svc.updateModule('sess-1', {
      path: 'module-01-a',
      body_md: '# Après'
    }, { author: 'formateur@test' })
    expect(result.ok).toBe(true)
    expect(result.version).toBe(2)
    expect(upsertModule).toHaveBeenCalled()
    const versionRow = upsertModule.mock.calls[0][1]
    expect(versionRow.source).toBe('ui_edit')
    expect(versionRow.author).toBe('formateur@test')
  })

  it('updateModule unchanged si hash identique', async () => {
    const { hashContent } = require('../../domain/content-hash')
    const hash = hashContent('# Avant', {})
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findBySessionAndPath: jest.fn().mockResolvedValue({ ...mod, content_hash: hash }),
        upsertModule: jest.fn()
      }
    })
    const result = await svc.updateModule('sess-1', { path: 'module-01-a', body_md: '# Avant' })
    expect(result.ok).toBe(true)
    expect(result.unchanged).toBe(true)
  })

  it('refuse édition hub formateur', async () => {
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: jest.fn() }
    })
    const result = await svc.updateModule('sess-1', { path: 'formateur', body_md: 'x' })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.error.code).toBe('hub_not_editable')
  })

  it('re-projecte si page_id présent', async () => {
    const withPage = { ...mod, page_id: 42, content_hash: 'old' }
    const projectModule = jest.fn().mockResolvedValue({ ok: true, page_id: 42 })
    const upsertModule = jest.fn().mockResolvedValue({
      ...withPage,
      body_md: '# New',
      current_version: 2
    })
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findBySessionAndPath: jest.fn().mockResolvedValue(withPage),
        upsertModule,
        updatePageId: jest.fn()
      },
      projectionService: { projectModule }
    })
    const result = await svc.updateModule('sess-1', { path: 'module-01-a', body_md: '# New' })
    expect(result.projected).toBe(true)
    expect(projectModule).toHaveBeenCalled()
  })

  it('getModule 404 si session absente', async () => {
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(null) },
      contentRepo: {}
    })
    const result = await svc.getModule('missing', 'module-01-a')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('getModule 404 si module absent', async () => {
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: jest.fn().mockResolvedValue(null) }
    })
    const result = await svc.getModule('sess-1', 'module-99')
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('module_not_found')
  })

  it('getModule normalise le path .md', async () => {
    const find = jest.fn().mockResolvedValue(mod)
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: find }
    })
    await svc.getModule('sess-1', 'module-01-a.md')
    expect(find).toHaveBeenCalledWith('sess-1', 'module-01-a')
  })

  it('updateModule exige body_md', async () => {
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: jest.fn().mockResolvedValue(mod) }
    })
    const result = await svc.updateModule('sess-1', { path: 'module-01-a' })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.error.code).toBe('body_required')
  })

  it('updateModule 404 si module absent', async () => {
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: jest.fn().mockResolvedValue(null) }
    })
    const result = await svc.updateModule('sess-1', { path: 'module-99', body_md: 'x' })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('module_not_found')
  })

  it('refuse édition hub stagiaire', async () => {
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: { findBySessionAndPath: jest.fn() }
    })
    const result = await svc.updateModule('sess-1', { path: 'stagiaire', body_md: 'x' })
    expect(result.error.code).toBe('hub_not_editable')
  })

  it('conserve le contenu sauvegardé si projection échoue', async () => {
    const withPage = { ...mod, page_id: 42, content_hash: 'old' }
    const upsertModule = jest.fn().mockResolvedValue({
      ...withPage,
      body_md: '# Fail projection',
      current_version: 2
    })
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findBySessionAndPath: jest.fn().mockResolvedValue(withPage),
        upsertModule,
        updatePageId: jest.fn()
      },
      projectionService: {
        projectModule: jest.fn().mockResolvedValue({ ok: false, error: 'render_invalid' })
      },
      logger: { warn: jest.fn(), info: jest.fn() }
    })
    const result = await svc.updateModule('sess-1', { path: 'module-01-a', body_md: '# Fail projection' })
    expect(result.ok).toBe(true)
    expect(result.version).toBe(2)
    expect(result.projected).toBe(false)
    expect(result.projection_error).toBe('render_invalid')
    expect(upsertModule).toHaveBeenCalled()
  })

  it('met à jour title et frontmatter', async () => {
    const upsertModule = jest.fn().mockResolvedValue({
      ...mod,
      title: 'Nouveau titre',
      frontmatter: { day: 2 },
      current_version: 2
    })
    const svc = createContentEditService({
      sessionRepo: { findById: jest.fn().mockResolvedValue(session) },
      contentRepo: {
        findBySessionAndPath: jest.fn().mockResolvedValue(mod),
        upsertModule
      },
      projectionService: { projectModule: jest.fn() }
    })
    await svc.updateModule('sess-1', {
      path: 'module-01-a',
      body_md: '# Contenu modifié',
      title: 'Nouveau titre',
      frontmatter: { day: 2 }
    })
    const record = upsertModule.mock.calls[0][0]
    expect(record.title).toBe('Nouveau titre')
    expect(record.frontmatter).toEqual({ day: 2 })
  })
})
