const { isStaleMarkdownRender } = require('../../domain/wiki-render')

const mockKnex = rows => {
  const chain = {
    where: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({ id: 1 }),
    select: jest.fn().mockResolvedValue(rows),
    update: jest.fn().mockResolvedValue(1),
    insert: jest.fn().mockResolvedValue([1])
  }
  const knex = jest.fn(() => chain)
  knex.mockChain = chain
  return knex
}

const staleRow = (path, overrides = {}) => ({
  id: 10,
  path,
  localeCode: 'fr',
  content: '# Hello',
  editorKey: 'markdown',
  contentType: 'markdown',
  render: '',
  isPublished: 0,
  ...overrides
})

const validRow = (path, overrides = {}) => ({
  ...staleRow(path, { render: '<p>Hello</p>' }),
  ...overrides
})

describe('projection.service', () => {
  beforeEach(() => {
    global.WIKI = {
      models: {
        pages: {
          renderPage: jest.fn().mockResolvedValue(undefined),
          deletePageFromCache: jest.fn(),
          getPageFromDb: jest.fn().mockResolvedValue({ hash: 'h1' }),
          rebuildTree: jest.fn().mockResolvedValue(undefined)
        }
      },
      events: { outbound: { emit: jest.fn() } },
      data: { editors: [{ key: 'markdown', contentType: 'markdown' }] }
    }
  })

  it('verifySessionRenders répare puis valide', async () => {
    const stale = staleRow('formations/slug/module-01-a')
    const fixed = validRow('formations/slug/module-01-a')
    const knex = mockKnex([stale])
    knex.mockChain.select
      .mockResolvedValueOnce([stale])
      .mockResolvedValueOnce([stale])
      .mockResolvedValueOnce([fixed])

    const { createProjectionService } = require('../../services/projection.service')
    const svc = createProjectionService({ knex, logger: { info: jest.fn(), error: jest.fn() } })
    const result = await svc.verifySessionRenders({ slug: 'slug', locale_default: 'fr' })

    expect(result.ok).toBe(true)
    expect(result.repaired).toBe(1)
    expect(WIKI.models.pages.renderPage).toHaveBeenCalled()
  })

  it('verifySessionRenders échoue si rendu toujours stale', async () => {
    const rows = [staleRow('formations/slug/module-01-a')]
    const knex = mockKnex(rows)
    knex.mockChain.select.mockResolvedValue(rows)

    const { createProjectionService } = require('../../services/projection.service')
    const svc = createProjectionService({ knex, logger: { info: jest.fn(), error: jest.fn() } })
    const result = await svc.verifySessionRenders({ slug: 'slug', locale_default: 'fr' })

    expect(result.ok).toBe(false)
    expect(result.stale).toHaveLength(1)
  })

  it('projectSession saute les modules inchangés avec onlyChanged', async () => {
    const mod = {
      id: 'm1',
      path: 'module-01-a',
      page_id: 42,
      body_md: '# Same',
      published_stagiaire: false,
      locale: 'fr'
    }
    const row = validRow('formations/test-slug/module-01-a', {
      content: '# Same',
      editorKey: 'markdown',
      contentType: 'markdown',
      isPublished: 0
    })
    const knex = mockKnex([row])
    knex.mockChain.first.mockResolvedValue(row)

    const { createProjectionService } = require('../../services/projection.service')
    const svc = createProjectionService({ knex, logger: { info: jest.fn(), error: jest.fn() } })
    const session = { slug: 'test-slug', locale_default: 'fr' }
    const results = await svc.projectSession(session, [mod], { onlyChanged: true })

    expect(results).toEqual([{ path: 'module-01-a', page_id: 42, ok: true, skipped: true }])
    expect(WIKI.models.pages.renderPage).not.toHaveBeenCalled()
  })

  it('projectSession re-projette si published_stagiaire diverge', async () => {
    const mod = {
      id: 'm1',
      path: 'module-01-a',
      page_id: 42,
      body_md: '# Same',
      published_stagiaire: true,
      locale: 'fr'
    }
    const row = validRow('formations/test-slug/module-01-a', {
      content: '# Same',
      editorKey: 'markdown',
      contentType: 'markdown',
      isPublished: 0
    })
    const knex = mockKnex([row])
    knex.mockChain.first
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(row)

    const { createProjectionService } = require('../../services/projection.service')
    const svc = createProjectionService({ knex, logger: { info: jest.fn(), error: jest.fn() } })
    const session = { slug: 'test-slug', locale_default: 'fr' }
    const results = await svc.projectSession(session, [mod], { onlyChanged: true })

    expect(results[0].skipped).toBeUndefined()
    expect(WIKI.models.pages.renderPage).toHaveBeenCalled()
  })
})

describe('wiki-render isStaleMarkdownRender', () => {
  it('détecte render vide', () => {
    expect(isStaleMarkdownRender(staleRow('formations/x/y'))).toBe(true)
    expect(isStaleMarkdownRender(validRow('formations/x/y'))).toBe(false)
  })
})
