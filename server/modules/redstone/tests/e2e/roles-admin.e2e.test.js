const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens } = require('./helpers/lms-client')
const { uniqueSlug, uniqueMondayId, minimalCourseModules } = require('./helpers/fixtures')
const { provisionDistributedSession } = require('./helpers/session-factory')

describeE2e('LMS — admin OPS (scope *)', () => {
  let sessionId
  let slug

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-admin' })
    sessionId = provisioned.sessionId
    slug = provisioned.slug
  }, 120000)

  it('liste et lit toutes les sessions', async () => {
    const list = await api('GET', '/sessions', { token: tokens().ops, query: { limit: 5 } })
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body.sessions)).toBe(true)

    const byId = await api('GET', `/sessions/${sessionId}`, { token: tokens().ops })
    expect(byId.status).toBe(200)
    expect(byId.body.session.slug).toBe(slug)
  })

  it('crée une session (même privilège qu’agent)', async () => {
    const res = await api('POST', '/sessions', {
      token: tokens().ops,
      body: {
        slug: uniqueSlug('e2e-admin-create'),
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Admin create'
      }
    })
    expect(res.status).toBe(201)
  })

  it('importe et distribue une nouvelle session', async () => {
    const created = await api('POST', '/sessions', {
      token: tokens().ops,
      body: {
        slug: uniqueSlug('e2e-admin-pipe'),
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Admin pipeline'
      }
    })
    const id = created.body.session.id
    const imp = await api('POST', `/sessions/${id}/content/import`, {
      token: tokens().ops,
      body: { modules: minimalCourseModules() }
    })
    expect(imp.status).toBe(200)
    const dist = await api('POST', `/sessions/${id}/distribute`, { token: tokens().ops, body: {} })
    expect(dist.status).toBe(200)
    expect(dist.body.guest_access?.ok).toBe(true)
  })

  it('publie un module (privilège réservé formateur/OPS)', async () => {
    const res = await api('POST', `/sessions/${sessionId}/publish`, {
      token: tokens().ops,
      body: { action: 'module', path: 'module-01-e2e.md' }
    })
    expect(res.status).toBe(200)
    expect(res.body.published).toContain('module-01-e2e')
  })

  it('sync-monday override : merge metadata sans écraser les clés existantes', async () => {
    await api('POST', `/sessions/${sessionId}/sync-monday`, {
      token: tokens().ops,
      body: { metadata: { links: { teams: 'https://teams.example/a' } } }
    })
    const merged = await api('POST', `/sessions/${sessionId}/sync-monday`, {
      token: tokens().ops,
      body: { metadata: { links: { emargement: 'https://emargement.example/b' } } }
    })
    expect(merged.status).toBe(200)
    expect(merged.body.session.metadata.links.teams).toContain('teams.example')
    expect(merged.body.session.metadata.links.emargement).toContain('emargement.example')
  })

  it('sync-monday rejette les champs interdits (injection vicieuse)', async () => {
    const res = await api('POST', `/sessions/${sessionId}/sync-monday`, {
      token: tokens().ops,
      body: {
        slug: 'hijack-slug',
        monday_item_id: 99999999,
        state: 'live',
        id: '00000000-0000-0000-0000-000000000001'
      }
    })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('invalid_sync_fields')
  })

  it('force distribute sur session incomplète si OPS le demande', async () => {
    const badSlug = uniqueSlug('e2e-admin-force')
    const created = await api('POST', '/sessions', {
      token: tokens().ops,
      body: {
        slug: badSlug,
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Force distribute'
      }
    })
    const id = created.body.session.id
    await api('POST', `/sessions/${id}/content/import`, {
      token: tokens().ops,
      body: {
        modules: [
          {
            path: '00-introduction.md',
            content: '---\ntitle: Intro invalide\n---\n# TODO à corriger\n\nIntro trop courte.\n'
          }
        ]
      }
    })
    const blocked = await api('POST', `/sessions/${id}/distribute`, { token: tokens().ops, body: {} })
    expect(blocked.status).toBe(422)

    const forced = await api('POST', `/sessions/${id}/distribute`, {
      token: tokens().ops,
      body: { force: true }
    })
    expect(forced.status).toBe(200)
    expect(forced.body.ok).toBe(true)
  })

  it('rejette un faux token OPS', async () => {
    const res = await api('GET', `/sessions/${sessionId}`, { token: 'not-ops-token' })
    expect(res.status).toBe(401)
  })
})

describeE2e('LMS — admin OPS vs agent (élévation refusée côté agent)', () => {
  it('l’agent ne peut pas publier même si OPS le peut', async () => {
    const { sessionId } = await provisionDistributedSession({ prefix: 'e2e-admin-vs-agent' })
    const opsPub = await api('POST', `/sessions/${sessionId}/publish`, {
      token: tokens().ops,
      body: { action: 'module', path: 'module-01-e2e.md' }
    })
    expect(opsPub.status).toBe(200)

    const agentPub = await api('POST', `/sessions/${sessionId}/publish`, {
      token: tokens().agent,
      body: { action: 'module', path: 'exercice-01-e2e.md' }
    })
    expect(agentPub.status).toBe(403)
  })
})
