const crypto = require('crypto')
const { hashContent } = require('../domain/content-hash')
const { sessionNotFound, fail } = require('../domain/api-result')
const { diffLines, summarizeDiff } = require('../domain/text-diff')

const TABLE = 'rs_session_pdc'

const rowToPdc = row => {
  if (!row) return null
  return {
    id: row.id,
    session_id: row.sessionId,
    kind: row.kind,
    title: row.title,
    body_md: row.bodyMd,
    content_hash: row.contentHash,
    source: row.source,
    author: row.author,
    version: row.version,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }
}

const createPdcRepository = knex => ({
  async listBySession(sessionId) {
    const rows = await knex(TABLE).where({ sessionId }).orderBy('kind', 'asc')
    return rows.map(rowToPdc)
  },

  async findBySessionAndKind(sessionId, kind) {
    const row = await knex(TABLE).where({ sessionId, kind }).first()
    return rowToPdc(row)
  },

  async upsert(sessionId, { kind, title, body_md, source, author }) {
    const existing = await this.findBySessionAndKind(sessionId, kind)
    const contentHash = hashContent(body_md, { kind })
    if (existing && existing.content_hash === contentHash) {
      return { ...existing, unchanged: true }
    }
    const version = (existing?.version || 0) + 1
    if (existing) {
      await knex(TABLE).where({ id: existing.id }).update({
        title: title || existing.title,
        bodyMd: body_md,
        contentHash,
        source: source || existing.source,
        author: author || existing.author,
        version,
        updatedAt: knex.fn.now()
      })
      return this.findBySessionAndKind(sessionId, kind)
    }
    await knex(TABLE).insert({
      id: crypto.randomUUID(),
      sessionId,
      kind,
      title: title || kind,
      bodyMd: body_md,
      contentHash,
      source: source || 'import_pdc',
      author: author || null,
      version: 1,
      createdAt: knex.fn.now(),
      updatedAt: knex.fn.now()
    })
    return this.findBySessionAndKind(sessionId, kind)
  }
})

const createPdcService = ({ sessionRepo, pdcRepo }) => ({
  async list(sessionId) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()
    const items = await pdcRepo.listBySession(sessionId)
    return { ok: true, status: 200, items }
  },

  async upsert(sessionId, payload = {}, options = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()
    const kind = payload.kind === 'improved' ? 'improved' : 'client'
    if (payload.body_md == null) return fail(422, 'body_required', 'body_md requis.')
    const saved = await pdcRepo.upsert(sessionId, {
      kind,
      title: payload.title,
      body_md: String(payload.body_md),
      source: payload.source || 'import_pdc',
      author: options.author || payload.author
    })
    return { ok: true, status: 200, pdc: saved }
  },

  async diff(sessionId) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()
    const client = await pdcRepo.findBySessionAndKind(sessionId, 'client')
    const improved = await pdcRepo.findBySessionAndKind(sessionId, 'improved')
    if (!client || !improved) {
      return fail(404, 'pdc_incomplete', 'PDC client et improved requis pour le diff.')
    }
    const hunks = diffLines(client.body_md || '', improved.body_md || '')
    return {
      ok: true,
      status: 200,
      client,
      improved,
      diff: hunks,
      summary: summarizeDiff(hunks)
    }
  }
})

module.exports = { createPdcRepository, createPdcService, TABLE }
