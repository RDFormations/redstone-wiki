/**
 * Tests d'intégration services LMS — exécution avec Postgres (même gate que E2E).
 * Gate : LMS_E2E_FORCE=1 + serveur Wiki.js local (voir scripts/test-redstone.sh --e2e).
 */
const { describeE2e } = require('../e2e/helpers/e2e-suite')
const { api, tokens } = require('../e2e/helpers/lms-client')
const { uniqueSlug, uniqueMondayId } = require('../e2e/helpers/fixtures')

describeE2e('LMS integration — metadata merge (repository)', () => {
  it('sync-monday ne supprime pas les metadata existantes', async () => {
    const slug = uniqueSlug('e2e-meta-merge')
    const created = await api('POST', '/sessions', {
      token: tokens().agent,
      body: {
        slug,
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Meta merge',
        metadata: { links: { emargement: 'https://emargement.test' } }
      }
    })
    expect(created.status).toBe(201)
    const sessionId = created.body.session.id

    const sync = await api('POST', `/sessions/${sessionId}/sync-monday`, {
      token: tokens().agent,
      body: {
        metadata: {
          links: { teams: 'https://teams.test' },
          monday: { etat: 'Confirmé' }
        }
      }
    })
    expect(sync.status).toBe(200)
    expect(sync.body.session.metadata.links.emargement).toBe('https://emargement.test')
    expect(sync.body.session.metadata.links.teams).toBe('https://teams.test')
    expect(sync.body.mode).toBe('override')
  })

  it('rejette un override sync-monday invalide', async () => {
    const slug = uniqueSlug('e2e-sync-invalid')
    const created = await api('POST', '/sessions', {
      token: tokens().agent,
      body: {
        slug,
        monday_item_id: uniqueMondayId(),
        client: 'RDF',
        title: 'Invalid sync'
      }
    })
    const sessionId = created.body.session.id
    const sync = await api('POST', `/sessions/${sessionId}/sync-monday`, {
      token: tokens().agent,
      body: { state: 'live' }
    })
    expect(sync.status).toBe(422)
    expect(sync.body.error.code).toBe('invalid_sync_fields')
  })
})
