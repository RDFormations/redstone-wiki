/**
 * E2E — page hub formateur Wiki.js (HTML) + API JSON cohérents.
 */
const { describeE2e } = require('./helpers/e2e-suite')
const { wikiLogin, wikiApi } = require('./helpers/wiki-client')
const { provisionDistributedSession } = require('./helpers/session-factory')
const { formationPath } = require('./helpers/site-assertions')

describeE2e('Wiki — page hub formateur (HTML + API)', () => {
  let slug
  let jwt

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-hub-page' })
    slug = provisioned.slug
    jwt = await wikiLogin()
  }, 120000)

  it('page formateur accessible avec JWT (non 404/500)', async () => {
    const res = await wikiApi('GET', `/fr${formationPath(slug, 'formateur')}`, { jwt })
    expect(res.status).not.toBe(404)
    expect(res.status).not.toBe(500)
    expect([200, 302, 403]).toContain(res.status)
  })

  it('page formateur refusée sans authentification (403)', async () => {
    const res = await wikiApi('GET', `/fr${formationPath(slug, 'formateur')}`)
    expect(res.status).toBe(403)
  })

  it('API hub JSON accessible ; page HTML non bloquée pour admin JWT', async () => {
    const apiRes = await wikiApi('GET', `/api/formation/${slug}/formateur`, { jwt })
    expect(apiRes.status).toBe(200)
    expect(apiRes.body.title).toBeTruthy()

    const pageRes = await wikiApi('GET', `/fr${formationPath(slug, 'formateur')}`, { jwt })
    expect(pageRes.status).not.toBe(403)
    expect(pageRes.status).not.toBe(404)
    expect([200, 302]).toContain(pageRes.status)
  })
})
