const { describeE2e } = require('./helpers/e2e-suite')
const { api, pingSite, tokens } = require('./helpers/lms-client')
const { uniqueSlug } = require('./helpers/fixtures')
const {
  provisionDistributedSession,
  publishModule,
  publishExercice,
  stagiaireNav
} = require('./helpers/session-factory')
const { SITE, expectSiteStatus, formationPath } = require('./helpers/site-assertions')
const { BODY_MODULE, BODY_CORRECTION } = require('./helpers/fixtures')

describeE2e('LMS — stagiaire sans compte (HTTP Wiki + contrat nav)', () => {
  let sessionId
  let slug
  let otherSlug

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-stagiaire' })
    sessionId = provisioned.sessionId
    slug = provisioned.slug
    otherSlug = uniqueSlug('e2e-stagiaire-other')
  }, 120000)

  it('n’a aucun accès API (pas de token stagiaire)', async () => {
    const endpoints = [
      ['GET', '/sessions'],
      ['GET', `/sessions/${sessionId}`],
      ['GET', `/sessions/${sessionId}/nav`],
      ['GET', `/sessions/${sessionId}/health`],
      ['POST', `/sessions/${sessionId}/publish`, { action: 'module', path: 'x.md' }]
    ]
    for (const [method, path, body] of endpoints) {
      const res = await api(method, path, { body })
      expect(res.status).toBe(401)
    }
  })

  it('slug inconnu → pas d’accès (403 ou 404, pas de fuite)', async () => {
    await expectSiteStatus(formationPath('formation-inexistante-xyz-404'), SITE.UNKNOWN)
    await expectSiteStatus(
      formationPath('formation-inexistante-xyz-404', 'module-01'),
      SITE.UNKNOWN
    )
  })

  it('autre slug non distribué → pas d’accès', async () => {
    await expectSiteStatus(formationPath(otherSlug), SITE.UNKNOWN)
  })

  it('après distribute : M01 redirect racine + modules non publiés → page friendly S02', async () => {
    await expectSiteStatus(formationPath(slug), SITE.REDIRECT_STAGIAIRE)
    await expectSiteStatus(formationPath(slug, 'stagiaire'), SITE.OK)
    const moduleRes = await expectSiteStatus(formationPath(slug, 'module-01-e2e'), SITE.OK)
    expect(moduleRes.raw).not.toContain(BODY_MODULE.trim().slice(0, 40))
    await expectSiteStatus(formationPath(slug, 'exercice-01-e2e'), SITE.OK)
    await expectSiteStatus(formationPath(slug, 'correction-01-e2e'), SITE.OK)
  })

  it('nav stagiaire : intro visible, modules restreints masqués avant publish', async () => {
    const nav = await stagiaireNav(sessionId)
    const paths = nav.body.items.map(i => i.path)
    expect(paths).toContain('00-introduction')
    expect(paths).not.toContain('module-01-e2e')
    expect(paths).not.toContain('exercice-01-e2e')
    expect(nav.body.progress.published_modules).toBe(0)
  })

  it('après publish module : HTTP 200 + nav stagiaire inclut le module', async () => {
    const pub = await publishModule(sessionId, 'module-01-e2e.md')
    expect(pub.status).toBe(200)

    await expectSiteStatus(formationPath(slug, 'module-01-e2e'), SITE.OK)

    const nav = await stagiaireNav(sessionId)
    expect(nav.body.items.some(i => i.path === 'module-01-e2e' && i.published)).toBe(true)
    expect(nav.body.progress.published_modules).toBeGreaterThanOrEqual(1)
  })

  it('exercice reste en page friendly tant que le formateur ne l’a pas publié', async () => {
    await expectSiteStatus(formationPath(slug, 'exercice-01-e2e'), SITE.OK)
    await expectSiteStatus(formationPath(slug, 'correction-01-e2e'), SITE.OK)
  })

  it('publish exercice débloque uniquement l’exercice (correction séparée)', async () => {
    const pub = await publishExercice(sessionId, 'exercice-01-e2e.md')
    expect(pub.status).toBe(200)

    await expectSiteStatus(formationPath(slug, 'exercice-01-e2e'), SITE.OK)
    const corrRes = await expectSiteStatus(formationPath(slug, 'correction-01-e2e'), SITE.OK)
    expect(corrRes.raw).not.toContain(BODY_CORRECTION.trim().slice(0, 40))

    const nav = await stagiaireNav(sessionId)
    const paths = nav.body.items.map(i => i.path)
    expect(paths).toContain('exercice-01-e2e')
    expect(paths).not.toContain('correction-01-e2e')
  })

  it('publish intro : page hub stagiaire reste accessible', async () => {
    await publishModule(sessionId, '00-introduction.md')
    await expectSiteStatus(formationPath(slug, 'stagiaire'), SITE.OK)
    await expectSiteStatus(formationPath(slug), SITE.REDIRECT_STAGIAIRE)
  })

  it('tentative path traversal / slug adjacent → pas d’accès', async () => {
    const traversal = await pingSite(`/formations/${slug}/../${otherSlug}`)
    expect([301, 302, 404, 403]).toContain(traversal.status)
    expect(traversal.status).not.toBe(200)

    await expectSiteStatus(formationPath(slug, '../../../etc/passwd'), SITE.UNKNOWN)
  })

  it('isolation : une session ne donne pas accès aux pages d’une autre', async () => {
    const other = await provisionDistributedSession({ prefix: 'e2e-stagiaire-iso' })
    await publishModule(other.sessionId, 'module-01-e2e.md', tokens().formateur)

    await expectSiteStatus(formationPath(other.slug, 'module-01-e2e'), SITE.OK)
    expect(other.slug).not.toBe(slug)

    const ownModule = await pingSite(formationPath(slug, 'module-01-e2e'))
    expect(ownModule.status).toBe(200)
  })

  it('distribute provisionne guest_access (E01)', async () => {
    const fresh = await provisionDistributedSession({ prefix: 'e2e-stagiaire-guest' })
    expect(fresh.distribute.guest_access?.ok).toBe(true)
    expect(fresh.distribute.guest_access?.path).toBe(`formations/${fresh.slug}`)
  })
})

describeE2e('LMS — stagiaire : agent import ne bypass pas E02', () => {
  it('import agent avec published:true sur module reste brouillon stagiaire', async () => {
    const { sessionId, slug } = await provisionDistributedSession({ prefix: 'e2e-stagiaire-e02' })
    const sneaky = await api('POST', `/sessions/${sessionId}/content/import`, {
      token: tokens().agent,
      body: {
        modules: [
          {
            path: 'module-02-bypass.md',
            content: `---\ntitle: Bypass\npublished: true\n---\n# Bypass\n\n${'x'.repeat(400)}\n`
          }
        ]
      }
    })
    expect(sneaky.status).toBe(422)
    expect(sneaky.body.error.code).toBe('published_forbidden')

    await expectSiteStatus(formationPath(slug, 'module-02-bypass'), SITE.NOT_FOUND)
  })
})
