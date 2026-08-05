const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { minimalCourseModules, uniqueSlug, uniqueMondayId } = require('./helpers/fixtures')

describeE2e('LMS API — auth (E02)', () => {
  it('rejette une requête sans token', async () => {
    const res = await api('GET', '/sessions')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('rejette un token invalide', async () => {
    const res = await api('GET', '/sessions', { token: 'invalid-token' })
    expect(res.status).toBe(401)
  })

  it('refuse publish avec token agent', async () => {
    const slug = uniqueSlug('e2e-auth')
    const created = await api('POST', '/sessions', {
      token: tokens().agent,
      body: {
        slug,
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Auth E2E'
      }
    })
    expect(created.status).toBe(201)
    const sessionId = created.body.session.id

    const res = await api('POST', `/sessions/${sessionId}/publish`, {
      token: tokens().agent,
      body: { action: 'module', path: 'module-01-e2e.md' }
    })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('forbidden')
  })
})

describeE2e('LMS API — pipeline F01→F05 (e2e)', () => {
  let sessionId
  let slug

  beforeAll(async () => {
    slug = uniqueSlug('e2e-pipeline')
    const created = await api('POST', '/sessions', {
      token: tokens().agent,
      body: {
        slug,
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Pipeline E2E RedStone'
      }
    })
    expect(created.status).toBe(201)
    sessionId = created.body.session.id
    expect(created.body.session.state).toBe('draft')
    expect(created.body.session.wiki_path).toBe(`/formations/${slug}`)
  })

  it('F01 — lit la session par id et par slug', async () => {
    const byId = await api('GET', `/sessions/${sessionId}`, { token: tokens().agent })
    expect(byId.status).toBe(200)
    expect(byId.body.session.slug).toBe(slug)

    const bySlug = await api('GET', `/sessions/by-slug/${slug}`, { token: tokens().agent })
    expect(bySlug.status).toBe(200)
    expect(bySlug.body.session.id).toBe(sessionId)
  })

  it('F01 — liste les sessions', async () => {
    const list = await api('GET', '/sessions', {
      token: tokens().agent,
      query: { q: slug, limit: 10 }
    })
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body.sessions)).toBe(true)
    expect(list.body.sessions.some(s => s.slug === slug)).toBe(true)
    expect(typeof list.body.total).toBe('number')
  })

  it('F03/C02 — importe le contenu et passe en draft_ready', async () => {
    const res = await api('POST', `/sessions/${sessionId}/content/import`, {
      token: tokens().agent,
      body: { modules: minimalCourseModules(), source: 'e2e-test' }
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.qa.status).toBe('green')
    expect(res.body.session.state).toBe('draft_ready')
    expect(res.body.content_ready).toBe(true)
    expect(res.body.distributed).toBe(false)

    const session = await api('GET', `/sessions/${sessionId}`, { token: tokens().agent })
    expect(session.body.session.content_ready).toBe(true)
    expect(session.body.session.distributed).toBe(false)
    expect(session.body.session.support_ready).toBe(false)
  })

  it('O11 — health checks après import', async () => {
    const res = await api('GET', `/sessions/${sessionId}/health`, { token: tokens().agent })
    expect(res.status).toBe(200)
    expect(res.body.session_id).toBe(sessionId)
    expect(res.body.content_ready).toBe(true)
    expect(Array.isArray(res.body.checks)).toBe(true)
    expect(res.body.checks.some(c => c.checkId === 'intro_present' && c.level === 'ok')).toBe(true)
  })

  it('F02 — distribue vers Wiki.js', async () => {
    const res = await api('POST', `/sessions/${sessionId}/distribute`, {
      token: tokens().agent,
      body: {}
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.session.state).toBe('distributed')
    expect(res.body.session.distributed_at).toBeTruthy()
    expect(res.body.distributed).toBe(true)

    const session = await api('GET', `/sessions/${sessionId}`, { token: tokens().agent })
    expect(session.body.session.support_ready).toBe(true)
    expect(session.body.session.metadata.lms.support_ready).toBe(true)
    expect(session.body.session.metadata.lms.renders_ok).toBe(true)
  })

  it('F05 — expose la navigation stagiaire et formateur', async () => {
    const stagiaire = await api('GET', `/sessions/${sessionId}/nav`, {
      token: tokens().agent,
      query: { audience: 'stagiaire' }
    })
    expect(stagiaire.status).toBe(200)
    expect(stagiaire.body.slug).toBe(slug)
    expect(stagiaire.body.audience).toBe('stagiaire')
    expect(stagiaire.body.items.length).toBeGreaterThan(0)

    const formateur = await api('GET', `/sessions/${sessionId}/nav`, {
      token: tokens().agent,
      query: { audience: 'formateur' }
    })
    expect(formateur.status).toBe(200)
    expect(formateur.body.audience).toBe('formateur')
  })

  it('T04 — publie un module avec token formateur', async () => {
    const res = await api('POST', `/sessions/${sessionId}/publish`, {
      token: tokens().formateur,
      body: { action: 'module', path: 'module-01-e2e.md' }
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.published).toContain('module-01-e2e')
  })

  it('M02 — sync metadata Monday (override local)', async () => {
    const res = await api('POST', `/sessions/${sessionId}/sync-monday`, {
      token: tokens().agent,
      body: {
        ref_client: 'E2E-REF',
        metadata: {
          links: { teams: 'https://teams.microsoft.com/l/e2e-test' },
          monday: { etat: 'Confirmé' }
        }
      }
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.session.ref_client).toBe('E2E-REF')
    expect(res.body.session.metadata.links.teams).toContain('teams.microsoft.com')
  })
})

describeE2e('LMS API — upsert idempotent (C01)', () => {
  it('retourne la même session sur double upsert', async () => {
    const slug = uniqueSlug('e2e-upsert')
    const mondayId = uniqueMondayId()
    const body = {
      slug,
      monday_item_id: mondayId,
      client: 'RDF',
      title: 'Upsert E2E'
    }
    const first = await api('POST', '/sessions/upsert', { token: tokens().agent, body })
    expect([200, 201]).toContain(first.status)
    expect(first.body.created).toBe(true)

    const second = await api('POST', '/sessions/upsert', {
      token: tokens().agent,
      body: { ...body, slug: uniqueSlug('other-slug') }
    })
    expect(second.status).toBe(200)
    expect(second.body.created).toBe(false)
    expect(second.body.session.id).toBe(first.body.session.id)
  })
})
