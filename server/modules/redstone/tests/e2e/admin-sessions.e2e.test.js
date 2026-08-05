const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { provisionDistributedSession, publishModule } = require('./helpers/session-factory')
const { minimalCourseModules, uniqueSlug, uniqueMondayId } = require('./helpers/fixtures')

describeE2e('LMS — F13 admin sessions API (OPS token)', () => {
  let slug

  beforeAll(async () => {
    const p = await provisionDistributedSession({ prefix: 'e2e-f13' })
    slug = p.slug
    await publishModule(p.sessionId, 'module-01-e2e.md', tokens().formateur)
  }, 120000)

  it('liste sessions avec filtres q et state', async () => {
    const list = await api('GET', '/sessions', {
      token: tokens().ops,
      query: { q: slug, limit: 10 }
    })
    expect(list.status).toBe(200)
    expect(list.body.sessions.some(s => s.slug === slug)).toBe(true)
    expect(list.body.sessions[0].content_ready).toBe(true)
    expect(list.body.sessions[0].support_ready).toBe(true)
  })

  it('filtre published=any via API OPS', async () => {
    const list = await api('GET', '/sessions', {
      token: tokens().ops,
      query: { q: slug, published: 'any', limit: 20 }
    })
    expect(list.status).toBe(200)
    expect(list.body.sessions.length).toBeGreaterThanOrEqual(1)
  })

  it('incomplete épinglé en tête si présent', async () => {
    const list = await api('GET', '/sessions', {
      token: tokens().ops,
      query: { state: 'incomplete', limit: 5 }
    })
    expect(list.status).toBe(200)
    if (list.body.sessions.length > 1) {
      expect(list.body.sessions[0].state).toBe('incomplete')
    }
  })

  it('OPS peut distribuer via API LMS (parité admin F02)', async () => {
    const created = await api('POST', '/sessions', {
      token: tokens().ops,
      body: {
        slug: uniqueSlug('e2e-f13-dist'),
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'F13 distribute OPS'
      }
    })
    expect(created.status).toBe(201)
    const sessionId = created.body.session.id

    const imported = await api('POST', `/sessions/${sessionId}/content/import`, {
      token: tokens().ops,
      body: { modules: minimalCourseModules(), source: 'e2e-f13' }
    })
    expect(imported.status).toBe(200)
    expect(imported.body.session.state).toBe('draft_ready')

    const distributed = await api('POST', `/sessions/${sessionId}/distribute`, {
      token: tokens().ops,
      body: {}
    })
    expect(distributed.status).toBe(200)
    expect(distributed.body.session.state).toBe('distributed')
  }, 120000)
})
