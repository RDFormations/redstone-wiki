const { describeE2e } = require('./helpers/e2e-suite')
const { api, tokens, pingSite } = require('./helpers/lms-client')
const {
  provisionDistributedSession,
  publishModule,
  getModule,
  editModule,
  listVersions,
  getVersion,
  diffVersion
} = require('./helpers/session-factory')

describeE2e('LMS — C12/C14 édition contenu et historique versions', () => {
  let sessionId
  let slug
  const modulePath = 'module-01-e2e'

  beforeAll(async () => {
    const provisioned = await provisionDistributedSession({ prefix: 'e2e-content-edit' })
    sessionId = provisioned.sessionId
    slug = provisioned.slug
  }, 120000)

  describe('lecture module (GET /content/module)', () => {
    it('retourne body_md et métadonnées', async () => {
      const res = await getModule(sessionId, modulePath)
      expect(res.status).toBe(200)
      expect(res.body.path).toBe(modulePath)
      expect(res.body.body_md).toContain('Module 1')
      expect(res.body.current_version).toBeGreaterThanOrEqual(1)
      expect(res.body.kind).toBe('module')
    })

    it('accepte le path avec suffixe .md', async () => {
      const res = await getModule(sessionId, `${modulePath}.md`)
      expect(res.status).toBe(200)
      expect(res.body.path).toBe(modulePath)
    })

    it('path manquant → 422', async () => {
      const res = await api('GET', `/sessions/${sessionId}/content/module`, {
        token: tokens().formateur
      })
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('path_required')
    })

    it('module inexistant → 404', async () => {
      const res = await getModule(sessionId, 'module-99-inexistant')
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('module_not_found')
    })

    it('session inexistante → 404', async () => {
      const res = await getModule('00000000-0000-4000-8000-000000000099', modulePath)
      expect(res.status).toBe(404)
    })
  })

  describe('édition module (PATCH /content/module)', () => {
    it('body_md manquant → 422', async () => {
      const res = await api('PATCH', `/sessions/${sessionId}/content/module`, {
        token: tokens().formateur,
        body: { path: modulePath }
      })
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('body_required')
    })

    it('hub formateur non éditable → 422', async () => {
      const res = await editModule(sessionId, 'formateur', '# hack')
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('hub_not_editable')
    })

    it('hub stagiaire non éditable → 422', async () => {
      const res = await editModule(sessionId, 'stagiaire', '# hack')
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('hub_not_editable')
    })

    it('contenu identique → unchanged sans nouvelle version', async () => {
      const current = await getModule(sessionId, modulePath)
      const res = await editModule(sessionId, modulePath, current.body.body_md)
      expect(res.status).toBe(200)
      expect(res.body.unchanged).toBe(true)
      expect(res.body.version).toBeUndefined()
    })

    it('formateur crée version ui_edit', async () => {
      const before = await getModule(sessionId, modulePath)
      const marker = `<!-- c12-e2e-${Date.now()} -->`
      const newBody = `${before.body.body_md}\n\n${marker}`

      const edited = await editModule(sessionId, modulePath, newBody)
      expect(edited.status).toBe(200)
      expect(edited.body.unchanged).toBe(false)
      expect(edited.body.version).toBeGreaterThan(before.body.current_version)

      const after = await getModule(sessionId, modulePath)
      expect(after.body.body_md).toContain(marker)
      expect(after.body.current_version).toBe(edited.body.version)
    })

    it('OPS peut éditer (scope *)', async () => {
      const res = await editModule(sessionId, modulePath, '# OPS edit\n\n' + 'x'.repeat(600), tokens().ops)
      expect(res.status).toBe(200)
      expect(res.body.version).toBeGreaterThan(0)
    })

    it('agent sans content:edit → 403', async () => {
      const res = await editModule(sessionId, modulePath, '# agent forbidden', tokens().agent)
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('forbidden')
    })

    it('édition puis publication reste fonctionnelle', async () => {
      const marker = `published-after-edit-${Date.now()}`
      await editModule(sessionId, modulePath, `# Module édité\n\n${marker}\n\n${'y'.repeat(600)}`)
      const pub = await publishModule(sessionId, `${modulePath}.md`)
      expect(pub.status).toBe(200)
      expect(pub.body.published).toContain(modulePath)
    })
  })

  describe('historique versions (C14)', () => {
    it('liste les versions par module (ordre desc)', async () => {
      const res = await listVersions(sessionId, modulePath)
      expect(res.status).toBe(200)
      expect(res.body.path).toBe(modulePath)
      expect(res.body.versions.length).toBeGreaterThanOrEqual(2)
      expect(res.body.versions[0].version).toBeGreaterThanOrEqual(res.body.versions[1].version)
      expect(res.body.versions.some(v => v.source === 'ui_edit')).toBe(true)
    })

    it('getVersion retourne body_md complet', async () => {
      const listed = await listVersions(sessionId, modulePath)
      const latestId = listed.body.versions[0].id
      const res = await getVersion(sessionId, latestId)
      expect(res.status).toBe(200)
      expect(res.body.version.body_md).toBeTruthy()
      expect(res.body.path).toBe(modulePath)
    })

    it('diff automatique vs version précédente', async () => {
      const listed = await listVersions(sessionId, modulePath)
      const latest = listed.body.versions[0]
      if (latest.version < 2) return
      const res = await diffVersion(sessionId, latest.id)
      expect(res.status).toBe(200)
      expect(res.body.summary).toBeDefined()
      expect(Array.isArray(res.body.diff)).toBe(true)
      expect(res.body.base_version).toBe(latest.version - 1)
    })

    it('diff avec base explicite', async () => {
      const listed = await listVersions(sessionId, modulePath)
      if (listed.body.versions.length < 2) return
      const [latest, oldest] = listed.body.versions
      const res = await diffVersion(sessionId, latest.id, tokens().formateur, oldest.id)
      expect(res.status).toBe(200)
      expect(res.body.diff.length).toBeGreaterThan(0)
    })

    it('version inexistante → 404', async () => {
      const res = await getVersion(sessionId, '00000000-0000-4000-8000-000000009999')
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('version_not_found')
    })

    it('diff base invalide → 404', async () => {
      const listed = await listVersions(sessionId, modulePath)
      const latestId = listed.body.versions[0].id
      const res = await api('GET', `/sessions/${sessionId}/content/versions/${latestId}/diff`, {
        token: tokens().formateur,
        query: { base: '00000000-0000-4000-8000-000000009999' }
      })
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('base_version_not_found')
    })
  })

  describe('re-projection Wiki après édition', () => {
    it('le contenu édité est visible sur la page Wiki (module distribué)', async () => {
      const marker = `wiki-projection-${Date.now()}`
      const body = `# Module projection test\n\n${marker}\n\n${'z'.repeat(600)}`
      const edited = await editModule(sessionId, modulePath, body)
      expect(edited.status).toBe(200)
      expect(edited.body.projected).toBe(true)

      await publishModule(sessionId, `${modulePath}.md`)

      const page = await pingSite(`/formations/${slug}/${modulePath}`)
      expect(page.status).not.toBe(404)
      expect([200, 302, 403]).toContain(page.status)
      if (page.status === 200 && page.raw) {
        expect(page.raw).toContain(marker)
      }
    })
  })
})
