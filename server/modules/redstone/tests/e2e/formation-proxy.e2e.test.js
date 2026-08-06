/**
 * E2E — proxy Wiki.js /api/formation/:slug/* (auth cookie JWT, comme le navigateur).
 */
const { describeE2e } = require('./helpers/e2e-suite')
const { pingSite } = require('./helpers/lms-client')
const { wikiLogin, formationApi } = require('./helpers/wiki-client')
const { provisionDistributedSession, publishModule } = require('./helpers/session-factory')
const { formationPath } = require('./helpers/site-assertions')

describeE2e('Wiki — proxy formateur /api/formation (cookie JWT)', () => {
  let slug
  let jwt
  const modulePath = 'module-01-e2e'

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-formation-proxy' })
    slug = provisioned.slug
    jwt = await wikiLogin()
  }, 120000)

  describe('authentification', () => {
    it('refuse les requêtes sans JWT (401)', async () => {
      const endpoints = [
        ['GET', 'formateur'],
        ['GET', 'content/module', { query: { path: modulePath } }],
        ['PATCH', 'content/module', { body: { path: modulePath, body_md: 'x' } }],
        ['GET', 'content/versions', { query: { path: modulePath } }],
        ['POST', 'publish', { body: { action: 'module', path: modulePath } }]
      ]
      for (const [method, sub, extra = {}] of endpoints) {
        const res = await formationApi(method, slug, sub, extra)
        expect(res.status).toBe(401)
        expect(res.body.ok).toBe(false)
        expect(res.body.error.code).toBe('unauthorized')
      }
    })

    it('accepte Authorization Bearer (alternative au cookie)', async () => {
      const res = await formationApi('GET', slug, 'formateur', { jwt, useBearer: true })
      expect(res.status).toBe(200)
      expect(res.body.title).toBeTruthy()
    })
  })

  describe('hub formateur', () => {
    it('GET /formateur retourne le hub JSON', async () => {
      const res = await formationApi('GET', slug, 'formateur', { jwt })
      expect(res.status).toBe(200)
      expect(res.body.title).toBeTruthy()
      expect(res.body.modules).toBeInstanceOf(Array)
      expect(res.body.modules.some(m => m.stem === modulePath)).toBe(true)
      expect(res.body.publication).toBeDefined()
      expect(res.body.stagiaireUrl).toContain(slug)
    })

    it('slug inconnu → 404', async () => {
      const res = await formationApi('GET', 'formation-inexistante-xyz', 'formateur', { jwt })
      expect(res.status).toBe(404)
    })
  })

  describe('C12 — édition via proxy', () => {
    it('GET content/module retourne le markdown', async () => {
      const res = await formationApi('GET', slug, 'content/module', {
        jwt,
        query: { path: modulePath }
      })
      expect(res.status).toBe(200)
      expect(res.body.body_md).toContain('Module 1')
      expect(res.body.path).toBe(modulePath)
    })

    it('PATCH content/module crée une version ui_edit', async () => {
      const before = await formationApi('GET', slug, 'content/module', {
        jwt,
        query: { path: modulePath }
      })
      const marker = `<!-- proxy-e2e-${Date.now()} -->`
      const newBody = `${before.body.body_md}\n\n${marker}`

      const edited = await formationApi('PATCH', slug, 'content/module', {
        jwt,
        body: { path: modulePath, body_md: newBody }
      })
      expect(edited.status).toBe(200)
      expect(edited.body.version).toBeGreaterThan(before.body.current_version)

      const after = await formationApi('GET', slug, 'content/module', {
        jwt,
        query: { path: modulePath }
      })
      expect(after.body.body_md).toContain(marker)
    })

    it('PATCH hub formateur → 422', async () => {
      const res = await formationApi('PATCH', slug, 'content/module', {
        jwt,
        body: { path: 'formateur', body_md: '# hack' }
      })
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('hub_not_editable')
    })

    it('path manquant → 422', async () => {
      const res = await formationApi('GET', slug, 'content/module', { jwt })
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('path_required')
    })
  })

  describe('C14 — versions via proxy', () => {
    let latestVersionId

    it('liste les versions du module', async () => {
      const res = await formationApi('GET', slug, 'content/versions', {
        jwt,
        query: { path: modulePath }
      })
      expect(res.status).toBe(200)
      expect(res.body.versions.length).toBeGreaterThanOrEqual(2)
      expect(res.body.versions[0].source).toBe('ui_edit')
      latestVersionId = res.body.versions[0].id
    })

    it('GET version par id retourne body_md', async () => {
      const res = await formationApi('GET', slug, `content/versions/${latestVersionId}`, { jwt })
      expect(res.status).toBe(200)
      expect(res.body.version.body_md).toBeTruthy()
      expect(res.body.path).toBe(modulePath)
    })

    it('GET diff retourne hunks et summary', async () => {
      const res = await formationApi('GET', slug, `content/versions/${latestVersionId}/diff`, { jwt })
      expect(res.status).toBe(200)
      expect(res.body.summary).toBeDefined()
      expect(Array.isArray(res.body.diff)).toBe(true)
    })
  })

  describe('publication via proxy', () => {
    it('POST /publish publie un module', async () => {
      const res = await formationApi('POST', slug, 'publish', {
        jwt,
        body: { action: 'module', path: modulePath }
      })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.published).toContain(modulePath)
    })
  })
})

describeE2e('Wiki — parcours E2E complet proxy → page stagiaire', () => {
  it('edit proxy → publish → contenu visible sur le site', async () => {
    const { slug } = await provisionDistributedSession({ prefix: 'e2e-proxy-journey' })
    const jwt = await wikiLogin(true)
    const modulePath = 'module-01-e2e'
    const marker = `journey-marker-${Date.now()}`

    const mod = await formationApi('GET', slug, 'content/module', {
      jwt,
      query: { path: modulePath }
    })
    expect(mod.status).toBe(200)

    const edited = await formationApi('PATCH', slug, 'content/module', {
      jwt,
      body: {
        path: modulePath,
        body_md: `# Module journey\n\n${marker}\n\n${'j'.repeat(600)}`
      }
    })
    expect(edited.status).toBe(200)

    const pub = await formationApi('POST', slug, 'publish', {
      jwt,
      body: { action: 'module', path: modulePath }
    })
    expect(pub.status).toBe(200)

    const page = await pingSite(formationPath(slug, modulePath))
    expect(page.status).not.toBe(404)
    expect([200, 302, 403]).toContain(page.status)
    if (page.status === 200 && page.raw) {
      expect(page.raw).toContain(marker)
    }
  }, 120000)
})
