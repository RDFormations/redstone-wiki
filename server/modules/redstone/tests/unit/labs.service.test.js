const { createLabsService } = require('../../services/labs.service')

describe('labs.service C05', () => {
  const sessionRepo = {
    findById: async id => (id === 's1' ? { id: 's1', slug: 'demo' } : null)
  }

  const makeRepo = () => {
    const store = new Map()
    return {
      listBySession: async sessionId =>
        [...store.values()].filter(l => l.session_id === sessionId).map(({ data, ...meta }) => meta),
      findMeta: async (sessionId, labId) => {
        const row = store.get(labId)
        if (!row || row.session_id !== sessionId) return null
        const { data, ...meta } = row
        return meta
      },
      findWithData: async (sessionId, labId) => {
        const row = store.get(labId)
        if (!row || row.session_id !== sessionId) return null
        return row
      },
      upsert: async (sessionId, payload) => {
        const id = payload.id || 'lab-1'
        const data = Buffer.isBuffer(payload.data)
          ? payload.data
          : Buffer.from(payload.data || '', payload.encoding === 'base64' ? 'base64' : 'utf8')
        const row = {
          id,
          session_id: sessionId,
          filename: payload.filename,
          label: payload.label || payload.filename,
          content_type: payload.content_type || 'application/zip',
          size_bytes: data.length,
          published_stagiaire: Boolean(payload.published_stagiaire),
          labs_from: payload.labs_from || null,
          data
        }
        store.set(id, row)
        const { data: _d, ...meta } = row
        return meta
      },
      setPublished: async (sessionId, labId, published) => {
        const row = store.get(labId)
        if (!row || row.session_id !== sessionId) return null
        row.published_stagiaire = Boolean(published)
        const { data, ...meta } = row
        return meta
      }
    }
  }

  it('upload + list + download', async () => {
    const labsRepo = makeRepo()
    const svc = createLabsService({ sessionRepo, labsRepo })
    const up = await svc.upload('s1', {
      filename: 'lab.zip',
      data: Buffer.from('PK').toString('base64'),
      encoding: 'base64',
      published_stagiaire: true
    })
    expect(up.ok).toBe(true)
    expect(up.lab.filename).toBe('lab.zip')

    const listed = await svc.list('s1', { stagiaireOnly: true })
    expect(listed.labs).toHaveLength(1)

    const dl = await svc.download('s1', up.lab.id, { requirePublished: true })
    expect(dl.ok).toBe(true)
    expect(Buffer.isBuffer(dl.lab.data)).toBe(true)
  })

  it('403 si lab non publié et requirePublished', async () => {
    const labsRepo = makeRepo()
    const svc = createLabsService({ sessionRepo, labsRepo })
    const up = await svc.upload('s1', {
      filename: 'secret.zip',
      data: 'x',
      encoding: 'utf8',
      published_stagiaire: false
    })
    const dl = await svc.download('s1', up.lab.id, { requirePublished: true })
    expect(dl.ok).toBe(false)
    expect(dl.status).toBe(403)
  })

  it('422 sans filename', async () => {
    const svc = createLabsService({ sessionRepo, labsRepo: makeRepo() })
    const result = await svc.upload('s1', { data: 'x' })
    expect(result.status).toBe(422)
  })
})
