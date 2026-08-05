const { describeE2e } = require('./helpers/e2e-suite')
const { api, pingSite } = require('./helpers/lms-client')
const { provisionDistributedSession, publishModule } = require('./helpers/session-factory')
const { formationPath } = require('./helpers/site-assertions')

describeE2e('LMS — API publique S01/M01 (sans auth)', () => {
  let slug
  let sessionId

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-public' })
    slug = provisioned.slug
    sessionId = provisioned.sessionId
  }, 120000)

  it('GET /public/.../hub — 200 sans token', async () => {
    const res = await api('GET', `/public/sessions/by-slug/${slug}/hub`)
    expect(res.status).toBe(200)
    expect(res.body.hub.slug).toBe(slug)
    expect(res.body.hub.title).toBeTruthy()
    expect(res.body.hub.links).toBeInstanceOf(Array)
    expect(JSON.stringify(res.body)).not.toMatch(/monday_item_id|REDSTONE_LMS/)
  })

  it('GET /public/.../nav — stagiaire sans modules non publiés', async () => {
    const res = await api('GET', `/public/sessions/by-slug/${slug}/nav`, {
      query: { audience: 'stagiaire' }
    })
    expect(res.status).toBe(200)
    expect(res.body.slug).toBe(slug)
    const paths = res.body.items.map(i => i.path)
    expect(paths).toContain(`formations/${slug}`)
    expect(paths.some(p => p.includes('module-01-e2e'))).toBe(false)
  })

  it('nav publique reflète publish formateur en temps réel', async () => {
    await publishModule(sessionId, 'module-01-e2e.md')
    const res = await api('GET', `/public/sessions/by-slug/${slug}/nav`, {
      query: { audience: 'stagiaire' }
    })
    expect(res.status).toBe(200)
    expect(res.body.items.some(i => i.path.endsWith('module-01-e2e'))).toBe(true)
  })

  it('slug inconnu → 404 (pas de fuite)', async () => {
    const res = await api('GET', '/public/sessions/by-slug/formation-absente-xyz/hub')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('session_not_found')
  })

  it('session draft non exposée publiquement', async () => {
    const created = await api('POST', '/sessions', {
      token: process.env.REDSTONE_LMS_AGENT_TOKEN || 'dev-local-test-token',
      body: {
        slug: `e2e-draft-only-${Date.now()}`,
        monday_item_id: Math.floor(Math.random() * 1e9),
        client: 'RDF',
        title: 'Draft hidden'
      }
    })
    expect(created.status).toBe(201)
    const res = await api('GET', `/public/sessions/by-slug/${created.body.session.slug}/hub`)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('session_not_public')
  })

  it('M01 — redirect invité racine → /stagiaire', async () => {
    const res = await pingSite(`/formations/${slug}`)
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain(`/formations/${slug}/stagiaire`)
  })
})
