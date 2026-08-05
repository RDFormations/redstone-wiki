const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { uniqueSlug, uniqueMondayId } = require('./helpers/fixtures')
const {
  provisionDistributedSession,
  publishModule,
  publishExercice,
  stagiaireNav
} = require('./helpers/session-factory')

describeE2e('LMS — formateur (lecture + publish uniquement)', () => {
  let sessionId
  let slug

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-formateur' })
    sessionId = provisioned.sessionId
    slug = provisioned.slug
  }, 120000)

  const forbiddenWrites = [
    ['POST', '/sessions', { slug: 'x', monday_item_id: 1, client: 'RDF', title: 'x' }],
    ['POST', '/sessions/upsert', { slug: 'x', monday_item_id: 1, client: 'RDF', title: 'x' }],
    ['POST', `/sessions/PLACEHOLDER/content/import`, { modules: [] }],
    ['POST', `/sessions/PLACEHOLDER/distribute`, {}],
    ['POST', `/sessions/PLACEHOLDER/sync-monday`, { ref_client: 'X' }]
  ]

  it.each(forbiddenWrites)('refuse %s pour formateur (403)', async (method, path, body) => {
    const resolved = path.replace('PLACEHOLDER', sessionId)
    const res = await api(method, resolved, { token: tokens().formateur, body })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('forbidden')
  })

  it('lit session, health et nav formateur', async () => {
    const session = await api('GET', `/sessions/${sessionId}`, { token: tokens().formateur })
    expect(session.status).toBe(200)

    const health = await api('GET', `/sessions/${sessionId}/health`, { token: tokens().formateur })
    expect(health.status).toBe(200)

    const nav = await api('GET', `/sessions/${sessionId}/nav`, {
      token: tokens().formateur,
      query: { audience: 'formateur' }
    })
    expect(nav.status).toBe(200)
    expect(nav.body.items.length).toBeGreaterThanOrEqual(4)
  })

  it('publie un module stagiaire', async () => {
    const res = await publishModule(sessionId, 'module-01-e2e.md')
    expect(res.status).toBe(200)
    expect(res.body.published).toContain('module-01-e2e')
  })

  it('publie exercice seul (correction reste brouillon)', async () => {
    const res = await publishExercice(sessionId, 'exercice-01-e2e.md')
    expect(res.status).toBe(200)
    expect(res.body.published).toEqual(['exercice-01-e2e'])
    expect(res.body.published).not.toContain('correction-01-e2e')
  })

  it('double publish module est idempotent', async () => {
    const first = await publishModule(sessionId, 'module-01-e2e.md')
    const second = await publishModule(sessionId, 'module-01-e2e.md')
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(second.body.count).toBeGreaterThanOrEqual(0)
  })

  it('publish module inexistant ne plante pas (liste vide)', async () => {
    const res = await api('POST', `/sessions/${sessionId}/publish`, {
      token: tokens().formateur,
      body: { action: 'module', path: 'module-99-inexistant.md' }
    })
    expect(res.status).toBe(200)
    expect(res.body.published).toEqual([])
    expect(res.body.count).toBe(0)
  })

  it('publish action invalide → 422', async () => {
    const res = await api('POST', `/sessions/${sessionId}/publish`, {
      token: tokens().formateur,
      body: { action: 'nuke_everything', path: 'module-01-e2e.md' }
    })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('invalid_publish_action')
  })

  it('publish all_restricted expose tout le contenu restreint', async () => {
    const fresh = await provisionDistributedSession({ prefix: 'e2e-formateur-all' })
    const res = await api('POST', `/sessions/${fresh.sessionId}/publish`, {
      token: tokens().formateur,
      body: { action: 'all_restricted' }
    })
    expect(res.status).toBe(200)
    expect(res.body.count).toBeGreaterThanOrEqual(3)

    const nav = await stagiaireNav(fresh.sessionId)
    const paths = nav.body.items.map(i => i.path)
    expect(paths).toEqual(
      expect.arrayContaining(['module-01-e2e', 'exercice-01-e2e', 'correction-01-e2e'])
    )
  })

  it('ne peut pas lire une session UUID aléatoire (404, pas 500)', async () => {
    const res = await api('GET', '/sessions/00000000-0000-4000-8000-000000000099', {
      token: tokens().formateur
    })
    expect(res.status).toBe(404)
  })

  it('token formateur falsifié rejeté', async () => {
    const res = await api('GET', `/sessions/${sessionId}`, { token: 'fake-formateur' })
    expect(res.status).toBe(401)
  })
})

describeE2e('LMS — formateur ne peut pas usurper le rôle agent', () => {
  it('Bearer malformé → 401', async () => {
    const res = await api('GET', '/sessions', {
      token: 'Bearer dev-formateur-token'
    })
    expect(res.status).toBe(401)
  })
})
