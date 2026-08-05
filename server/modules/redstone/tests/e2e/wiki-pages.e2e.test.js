const { describeE2e } = require('./helpers/e2e-suite')
const { pingSite, api, tokens } = require('./helpers/lms-client')
const { minimalCourseModules, uniqueSlug, uniqueMondayId } = require('./helpers/fixtures')

describeE2e('LMS — pages Wiki.js après distribute (e2e smoke)', () => {
  let slug

  beforeAll(async () => {
    slug = uniqueSlug('e2e-wiki')
    const created = await api('POST', '/sessions', {
      token: tokens().agent,
      body: {
        slug,
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Wiki pages E2E'
      }
    })
    expect(created.status).toBe(201)
    const sessionId = created.body.session.id

    const imported = await api('POST', `/sessions/${sessionId}/content/import`, {
      token: tokens().agent,
      body: { modules: minimalCourseModules() }
    })
    expect(imported.status).toBe(200)

    const distributed = await api('POST', `/sessions/${sessionId}/distribute`, {
      token: tokens().agent,
      body: {}
    })
    expect(distributed.status).toBe(200)
  }, 120000)

  it('projette la page formation (403 = page existe, accès stagiaire restreint)', async () => {
    const res = await pingSite(`/formations/${slug}`)
    expect(res.status).not.toBe(404)
    expect([200, 302, 403]).toContain(res.status)
  })

  it('projette un module (non 404)', async () => {
    const res = await pingSite(`/formations/${slug}/module-01-e2e`)
    expect(res.status).not.toBe(404)
    expect([200, 302, 403]).toContain(res.status)
  })

  it('projette les hubs formateur et stagiaire (non 404, pas 500)', async () => {
    for (const hub of ['formateur', 'stagiaire']) {
      const res = await pingSite(`/formations/${slug}/${hub}`)
      expect(res.status).not.toBe(404)
      expect(res.status).not.toBe(500)
      expect([200, 302, 403]).toContain(res.status)
    }
  })
})
