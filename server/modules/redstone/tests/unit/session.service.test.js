const { createSessionService } = require('../../services/session.service')

const TEST_PAYLOAD = {
  slug: 'rdf-test-e2e-pipeline-auto-2026-08-04',
  monday_item_id: 12718272029,
  client: 'RDF',
  ref_client: 'TEST-E2E-2026-08',
  title: 'TEST E2E pipeline auto 2026-08-04'
}

const createMockRepo = (overrides = {}) => ({
  findBySlug: jest.fn().mockResolvedValue(null),
  findByMondayItemId: jest.fn().mockResolvedValue(null),
  findById: jest.fn(),
  insert: jest.fn().mockImplementation(async session => ({
    ...session,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })),
  list: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
  ...overrides
})

describe('session.service', () => {
  describe('create', () => {
    it('crée une session avec état draft et wiki_path dérivé', async () => {
      const repo = createMockRepo()
      const service = createSessionService({ repo, logger: { info: jest.fn() } })

      const result = await service.create(TEST_PAYLOAD)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(201)
      expect(result.session.slug).toBe(TEST_PAYLOAD.slug)
      expect(result.session.state).toBe('draft')
      expect(result.session.wiki_path).toBe(`/formations/${TEST_PAYLOAD.slug}`)
      expect(result.session.monday_item_id).toBe(TEST_PAYLOAD.monday_item_id)
      expect(repo.insert).toHaveBeenCalledTimes(1)
    })

    it('rejette un slug dupliqué', async () => {
      const repo = createMockRepo({
        findBySlug: jest.fn().mockResolvedValue({ id: 'existing', slug: TEST_PAYLOAD.slug })
      })
      const service = createSessionService({ repo, logger: { info: jest.fn() } })

      const result = await service.create(TEST_PAYLOAD)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(409)
      expect(result.error.code).toBe('slug_exists')
      expect(repo.insert).not.toHaveBeenCalled()
    })

    it('rejette un monday_item_id dupliqué', async () => {
      const repo = createMockRepo({
        findByMondayItemId: jest.fn().mockResolvedValue({ id: 'existing' })
      })
      const service = createSessionService({ repo, logger: { info: jest.fn() } })

      const result = await service.create(TEST_PAYLOAD)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(409)
      expect(result.error.code).toBe('monday_item_id_exists')
    })

    it('rejette un payload invalide', async () => {
      const repo = createMockRepo()
      const service = createSessionService({ repo, logger: { info: jest.fn() } })

      const result = await service.create({ slug: '!!' })

      expect(result.ok).toBe(false)
      expect(result.status).toBe(422)
    })
  })

  describe('upsert', () => {
    it('retourne la session existante par monday_item_id', async () => {
      const existing = { id: 'uuid-existing', slug: 'existing', monday_item_id: 12718272029 }
      const repo = createMockRepo({
        findByMondayItemId: jest.fn().mockResolvedValue(existing)
      })
      const service = createSessionService({ repo, logger: { info: jest.fn() } })

      const result = await service.upsert(TEST_PAYLOAD)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.created).toBe(false)
      expect(result.session).toBe(existing)
      expect(repo.insert).not.toHaveBeenCalled()
    })

    it('crée si monday_item_id absent', async () => {
      const repo = createMockRepo()
      const service = createSessionService({ repo, logger: { info: jest.fn() } })

      const result = await service.upsert(TEST_PAYLOAD)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(201)
      expect(result.created).toBe(true)
      expect(repo.insert).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('retourne 404 si absente', async () => {
      const repo = createMockRepo({ findById: jest.fn().mockResolvedValue(null) })
      const service = createSessionService({ repo })

      const result = await service.getById('missing-uuid')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    })
  })

  describe('getBySlug', () => {
    it('normalise le slug en minuscules', async () => {
      const session = { id: '1', slug: 'my-slug' }
      const repo = createMockRepo({
        findBySlug: jest.fn().mockResolvedValue(session)
      })
      const service = createSessionService({ repo })

      await service.getBySlug('MY-SLUG')

      expect(repo.findBySlug).toHaveBeenCalledWith('my-slug')
    })
  })

  describe('list', () => {
    it('borne limit entre 1 et 100', async () => {
      const repo = createMockRepo()
      const service = createSessionService({ repo })

      await service.list({ limit: '999', offset: '-5' })

      expect(repo.list).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
        q: '',
        state: null,
        datePreset: 'all',
        published: 'all',
        terminated: 'all',
        startsAfter: null,
        startsBefore: null
      })
    })
  })
})
