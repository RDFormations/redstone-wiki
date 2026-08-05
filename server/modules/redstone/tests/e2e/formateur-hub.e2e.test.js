const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { provisionDistributedSession } = require('./helpers/session-factory')

describeE2e('LMS — T01 formateur hub (API interne)', () => {
  let slug

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-formateur-hub' })
    slug = provisioned.slug
  }, 120000)

  it('session distribuée expose content_ready + support_ready (O03)', async () => {
    const bySlug = await api('GET', `/sessions/by-slug/${slug}`, { token: tokens().agent })
    expect(bySlug.status).toBe(200)
    expect(bySlug.body.session.content_ready).toBe(true)
    expect(bySlug.body.session.distributed).toBe(true)
    expect(bySlug.body.session.support_ready).toBe(true)
  })

  it('nav formateur inclut modules brouillon', async () => {
    const nav = await api('GET', `/sessions/${(await api('GET', `/sessions/by-slug/${slug}`, { token: tokens().agent })).body.session.id}/nav`, {
      token: tokens().formateur,
      query: { audience: 'formateur' }
    })
    expect(nav.status).toBe(200)
    const draftModule = nav.body.items.find(i => i.path === 'module-01-e2e')
    expect(draftModule).toBeTruthy()
    expect(draftModule.published).toBe(false)
  })
})
