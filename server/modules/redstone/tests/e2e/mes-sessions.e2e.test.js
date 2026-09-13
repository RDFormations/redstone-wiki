/**
 * E2E — T06 Dashboard « Mes sessions » (API + page Wiki).
 */
const { describeE2e } = require('./helpers/e2e-suite')
const { wikiLogin, wikiApi, adminCreds } = require('./helpers/wiki-client')
const { provisionDistributedSession } = require('./helpers/session-factory')

describeE2e('LMS — T06 Mes sessions formateur', () => {
  let jwt
  let assignedSlug

  beforeAll(async () => {
    jwt = await wikiLogin()
    const provisioned = await provisionDistributedSession({
      prefix: 'e2e-t06',
      trainerEmail: adminCreds().email
    })
    assignedSlug = provisioned.slug
  }, 120000)

  it('GET /api/formation/mes-sessions — liste la session assignée', async () => {
    const res = await wikiApi('GET', '/api/formation/mes-sessions', { jwt })
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
    const match = (res.body.sessions || []).find(s => s.slug === assignedSlug)
    expect(match).toBeDefined()
    expect(match.title).toBeTruthy()
    expect(match.dates.label).toBeTruthy()
    expect(match.state_label).toBeTruthy()
    expect(match.cockpit_href).toContain(`/formations/${assignedSlug}/formateur`)
    expect(match.indicators).toBeDefined()
    expect(match.publication).toBeDefined()
  })

  it('refus sans authentification', async () => {
    const res = await wikiApi('GET', '/api/formation/mes-sessions')
    expect(res.status).toBe(401)
  })

  it('page /fr/formations/mes-sessions accessible avec JWT', async () => {
    const res = await wikiApi('GET', '/fr/formations/mes-sessions', { jwt })
    expect(res.status).not.toBe(404)
    expect(res.status).not.toBe(500)
    expect([200, 302, 403]).toContain(res.status)
  })
})
