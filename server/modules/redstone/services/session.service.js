const crypto = require('crypto')
const { validateCreatePayload, buildWikiPath } = require('../domain/session-validation')
const { INITIAL_STATE } = require('../domain/session-state')

const DUPLICATE_MESSAGES = {
  slug: 'Une session avec ce slug existe déjà.',
  monday_item_id: 'Une session avec ce monday_item_id existe déjà.'
}

const createSessionService = ({ repo, logger = console }) => ({
  async create(payload) {
    const validation = validateCreatePayload(payload)
    if (!validation.ok) {
      return { ok: false, status: 422, error: validation }
    }

    const data = validation.value
    const existingSlug = await repo.findBySlug(data.slug)
    if (existingSlug) {
      return {
        ok: false,
        status: 409,
        error: { code: 'slug_exists', message: DUPLICATE_MESSAGES.slug }
      }
    }

    const existingMonday = await repo.findByMondayItemId(data.mondayItemId)
    if (existingMonday) {
      return {
        ok: false,
        status: 409,
        error: { code: 'monday_item_id_exists', message: DUPLICATE_MESSAGES.monday_item_id }
      }
    }

    const session = {
      id: crypto.randomUUID(),
      slug: data.slug,
      monday_item_id: data.mondayItemId,
      client: data.client,
      ref_client: data.refClient,
      title: data.title,
      locale_default: data.localeDefault,
      state: INITIAL_STATE,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      wiki_path: buildWikiPath(data.slug),
      metadata: data.metadata,
      content_ready_at: null,
      distributed_at: null
    }

    const created = await repo.insert(session)
    logger.info(`(REDSTONE/LMS) Session créée: ${created.slug} (${created.id})`)
    return { ok: true, status: 201, session: created }
  },

  async upsert(payload) {
    const validation = validateCreatePayload(payload)
    if (!validation.ok) {
      return { ok: false, status: 422, error: validation }
    }

    const data = validation.value
    const existingMonday = await repo.findByMondayItemId(data.mondayItemId)
    if (existingMonday) {
      return {
        ok: true,
        status: 200,
        session: existingMonday,
        created: false
      }
    }

    const created = await this.create(payload)
    if (!created.ok) {
      return created
    }
    return { ...created, created: true }
  },

  async getById(id) {
    const session = await repo.findById(id)
    if (!session) {
      return {
        ok: false,
        status: 404,
        error: { code: 'session_not_found', message: 'Session introuvable.' }
      }
    }
    return { ok: true, status: 200, session }
  },

  async getBySlug(slug) {
    const normalized = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
    const session = await repo.findBySlug(normalized)
    if (!session) {
      return {
        ok: false,
        status: 404,
        error: { code: 'session_not_found', message: 'Session introuvable.' }
      }
    }
    return { ok: true, status: 200, session }
  },

  async list(query = {}) {
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 100)
    const offset = Math.max(Number.parseInt(query.offset, 10) || 0, 0)
    const result = await repo.list({ limit, offset, q: query.q })
    return { ok: true, status: 200, ...result }
  }
})

module.exports = {
  createSessionService,
  DUPLICATE_MESSAGES
}
