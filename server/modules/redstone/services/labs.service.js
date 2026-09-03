const crypto = require('crypto')
const { sessionNotFound, fail } = require('../domain/api-result')

const TABLE = 'rs_session_labs'

const rowToLabMeta = row => {
  if (!row) return null
  return {
    id: row.id,
    session_id: row.sessionId,
    filename: row.filename,
    label: row.label,
    content_type: row.contentType,
    size_bytes: row.sizeBytes,
    published_stagiaire: Boolean(row.publishedStagiaire),
    labs_from: row.labsFrom,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }
}

const createLabsRepository = knex => ({
  async listBySession(sessionId) {
    const rows = await knex(TABLE)
      .where({ sessionId })
      .select(
        'id',
        'sessionId',
        'filename',
        'label',
        'contentType',
        'sizeBytes',
        'publishedStagiaire',
        'labsFrom',
        'createdAt',
        'updatedAt'
      )
      .orderBy('filename', 'asc')
    return rows.map(rowToLabMeta)
  },

  async findMeta(sessionId, labId) {
    const row = await knex(TABLE)
      .where({ sessionId, id: labId })
      .select(
        'id',
        'sessionId',
        'filename',
        'label',
        'contentType',
        'sizeBytes',
        'publishedStagiaire',
        'labsFrom',
        'createdAt',
        'updatedAt'
      )
      .first()
    return rowToLabMeta(row)
  },

  async findWithData(sessionId, labId) {
    const row = await knex(TABLE).where({ sessionId, id: labId }).first()
    if (!row) return null
    return { ...rowToLabMeta(row), data: row.data }
  },

  async upsert(sessionId, payload) {
    const id = payload.id || crypto.randomUUID()
    const existing = payload.id
      ? await knex(TABLE).where({ id: payload.id, sessionId }).first()
      : null
    const data = Buffer.isBuffer(payload.data)
      ? payload.data
      : Buffer.from(payload.data || '', payload.encoding === 'base64' ? 'base64' : 'utf8')
    const record = {
      filename: payload.filename,
      label: payload.label || payload.filename,
      contentType: payload.content_type || 'application/zip',
      data,
      sizeBytes: data.length,
      publishedStagiaire: Boolean(payload.published_stagiaire),
      labsFrom: payload.labs_from || null,
      updatedAt: knex.fn.now()
    }
    if (existing) {
      await knex(TABLE).where({ id: existing.id }).update(record)
      return this.findMeta(sessionId, existing.id)
    }
    await knex(TABLE).insert({
      id,
      sessionId,
      ...record,
      createdAt: knex.fn.now()
    })
    return this.findMeta(sessionId, id)
  },

  async setPublished(sessionId, labId, published) {
    await knex(TABLE)
      .where({ sessionId, id: labId })
      .update({ publishedStagiaire: Boolean(published), updatedAt: knex.fn.now() })
    return this.findMeta(sessionId, labId)
  }
})

const createLabsService = ({ sessionRepo, labsRepo }) => ({
  async list(sessionId, { stagiaireOnly = false } = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()
    let labs = await labsRepo.listBySession(sessionId)
    if (stagiaireOnly) labs = labs.filter(l => l.published_stagiaire)
    return { ok: true, status: 200, labs }
  },

  async upload(sessionId, payload = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()
    if (!payload.filename) return fail(422, 'filename_required', 'filename requis.')
    if (payload.data == null) return fail(422, 'data_required', 'data requis (base64).')
    const lab = await labsRepo.upsert(sessionId, {
      ...payload,
      encoding: payload.encoding || 'base64'
    })
    return { ok: true, status: 200, lab }
  },

  async download(sessionId, labId, { requirePublished = false } = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()
    const lab = await labsRepo.findWithData(sessionId, labId)
    if (!lab) return fail(404, 'lab_not_found', 'Lab introuvable.')
    if (requirePublished && !lab.published_stagiaire) {
      return fail(403, 'lab_not_published', 'Lab non publié pour les stagiaires.')
    }
    return { ok: true, status: 200, lab }
  },

  async publish(sessionId, labId, published = true) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()
    const lab = await labsRepo.setPublished(sessionId, labId, published)
    if (!lab) return fail(404, 'lab_not_found', 'Lab introuvable.')
    return { ok: true, status: 200, lab }
  }
})

module.exports = { createLabsRepository, createLabsService, TABLE }
