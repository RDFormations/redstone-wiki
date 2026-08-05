const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { provisionDistributedSession, publishModule } = require('./helpers/session-factory')

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
})
