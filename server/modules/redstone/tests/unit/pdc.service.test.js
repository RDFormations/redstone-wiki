const { createPdcService } = require('../../services/pdc.service')

describe('pdc.service C04', () => {
  const clientBody = 'ligne A\nligne B\nligne C'
  const improvedBody = 'ligne A\nligne B++\nligne C\nligne D'

  const make = () => {
    const store = new Map()
    const sessionRepo = {
      findById: async id => (id === 's1' ? { id: 's1', slug: 'demo' } : null)
    }
    const pdcRepo = {
      listBySession: async sessionId => [...store.values()].filter(r => r.session_id === sessionId),
      findBySessionAndKind: async (sessionId, kind) =>
        store.get(`${sessionId}:${kind}`) || null,
      upsert: async (sessionId, payload) => {
        const key = `${sessionId}:${payload.kind}`
        const prev = store.get(key)
        const row = {
          id: prev?.id || `id-${payload.kind}`,
          session_id: sessionId,
          kind: payload.kind,
          title: payload.title || payload.kind,
          body_md: payload.body_md,
          content_hash: `h-${payload.body_md.length}`,
          source: payload.source,
          author: payload.author,
          version: (prev?.version || 0) + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        store.set(key, row)
        return row
      }
    }
    return createPdcService({ sessionRepo, pdcRepo })
  }

  it('diff client vs improved', async () => {
    const svc = make()
    await svc.upsert('s1', { kind: 'client', body_md: clientBody })
    await svc.upsert('s1', { kind: 'improved', body_md: improvedBody })
    const result = await svc.diff('s1')
    expect(result.ok).toBe(true)
    expect(result.summary.added).toBeGreaterThan(0)
    expect(result.diff.some(h => h.type === 'add')).toBe(true)
  })

  it('404 si couple incomplet', async () => {
    const svc = make()
    await svc.upsert('s1', { kind: 'client', body_md: clientBody })
    const result = await svc.diff('s1')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('session introuvable', async () => {
    const svc = make()
    const result = await svc.diff('missing')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })
})
