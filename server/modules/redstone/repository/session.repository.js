const { mergeSessionMetadata } = require('../domain/monday-metadata')
const { applyDatePreset } = require('../domain/session-filters')

const TABLE = 'rs_sessions'

const rowToSession = row => {
  if (!row) {
    return null
  }
  return {
    id: row.id,
    slug: row.slug,
    monday_item_id: row.mondayItemId,
    client: row.client,
    ref_client: row.refClient,
    title: row.title,
    locale_default: row.localeDefault,
    state: row.state,
    starts_at: row.startsAt,
    ends_at: row.endsAt,
    wiki_path: row.wikiPath,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    content_ready_at: row.contentReadyAt,
    distributed_at: row.distributedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }
}

const sessionToRow = session => ({
  id: session.id,
  slug: session.slug,
  mondayItemId: session.monday_item_id,
  client: session.client,
  refClient: session.ref_client,
  title: session.title,
  localeDefault: session.locale_default,
  state: session.state,
  startsAt: session.starts_at,
  endsAt: session.ends_at,
  wikiPath: session.wiki_path,
  metadata: JSON.stringify(session.metadata || {}),
  contentReadyAt: session.content_ready_at || null,
  distributedAt: session.distributed_at || null
})

const createSessionRepository = knex => ({
  async insert(session) {
    const row = sessionToRow(session)
    row.createdAt = knex.fn.now()
    row.updatedAt = knex.fn.now()
    await knex(TABLE).insert(row)
    return this.findById(session.id)
  },

  async findById(id) {
    const row = await knex(TABLE).where({ id }).first()
    return rowToSession(row)
  },

  async findBySlug(slug) {
    const row = await knex(TABLE).where({ slug }).first()
    return rowToSession(row)
  },

  async findByMondayItemId(mondayItemId) {
    const row = await knex(TABLE).where({ mondayItemId }).first()
    return rowToSession(row)
  },

  async list(filters = {}) {
    const {
      limit = 50,
      offset = 0,
      q = null,
      state = null,
      datePreset = 'all',
      terminated = 'all',
      published = 'all',
      startsAfter = null,
      startsBefore = null
    } = filters

    let base = knex(TABLE)

    if (q && typeof q === 'string' && q.trim()) {
      const term = `%${q.trim().toLowerCase()}%`
      base = base.where(builder => {
        builder
          .whereRaw('LOWER(??) LIKE ?', ['slug', term])
          .orWhereRaw('LOWER(??) LIKE ?', ['client', term])
          .orWhereRaw('LOWER(??) LIKE ?', ['title', term])
          .orWhereRaw('LOWER(??) LIKE ?', ['refClient', term])
          .orWhereRaw('CAST(?? AS TEXT) LIKE ?', ['mondayItemId', term.replace(/%/g, '')])
      })
    }

    if (state) base = base.where({ state })

    if (terminated === 'yes') {
      const today = new Date().toISOString().split('T')[0]
      base = base.where(builder => {
        builder.where('state', 'archived').orWhere('endsAt', '<', today)
      })
    } else if (terminated === 'no') {
      const today = new Date().toISOString().split('T')[0]
      base = base.whereNot('state', 'archived').where(builder => {
        builder.whereNull('endsAt').orWhere('endsAt', '>=', today)
      })
    }

    if (datePreset && datePreset !== 'all') {
      base = applyDatePreset(base, datePreset, knex)
    }
    if (startsAfter) base = base.where('startsAt', '>=', startsAfter)
    if (startsBefore) base = base.where('startsAt', '<=', startsBefore)

    if (published !== 'all') {
      const pubSub = knex('rs_content_modules')
        .select('sessionId')
        .select(
          knex.raw('COUNT(*)::int as total_modules'),
          knex.raw('SUM(CASE WHEN "publishedStagiaire" = true THEN 1 ELSE 0 END)::int as published_modules')
        )
        .where('kind', 'module')
        .groupBy('sessionId')
        .as('pub')

      base = base.leftJoin(pubSub, 'pub.sessionId', `${TABLE}.id`)
      if (published === 'none') {
        base = base.whereRaw('COALESCE(pub.published_modules, 0) = 0')
      } else if (published === 'any') {
        base = base.whereRaw('COALESCE(pub.published_modules, 0) > 0')
      } else if (published === 'partial') {
        base = base
          .whereRaw('COALESCE(pub.published_modules, 0) > 0')
          .whereRaw('COALESCE(pub.published_modules, 0) < COALESCE(pub.total_modules, 0)')
      } else if (published === 'all_published') {
        base = base
          .whereRaw('COALESCE(pub.total_modules, 0) > 0')
          .whereRaw('COALESCE(pub.published_modules, 0) = COALESCE(pub.total_modules, 0)')
      }
    }

    const [rows, countRow] = await Promise.all([
      base
        .clone()
        .select(`${TABLE}.*`)
        .orderByRaw(`CASE WHEN ?? = 'incomplete' THEN 0 ELSE 1 END`, [`${TABLE}.state`])
        .orderBy(`${TABLE}.startsAt`, 'asc')
        .orderBy(`${TABLE}.createdAt`, 'desc')
        .limit(limit)
        .offset(offset),
      base.clone().count({ total: '*' }).first()
    ])

    return {
      items: rows.map(rowToSession),
      total: Number(countRow?.total || 0),
      limit,
      offset
    }
  },

  async update(sessionId, patch) {
    const existing = await this.findById(sessionId)
    if (!existing) {
      return null
    }

    const row = {}
    const map = {
      state: 'state',
      metadata: 'metadata',
      content_ready_at: 'contentReadyAt',
      distributed_at: 'distributedAt',
      starts_at: 'startsAt',
      ends_at: 'endsAt',
      title: 'title',
      client: 'client',
      ref_client: 'refClient'
    }
    Object.entries(map).forEach(([apiKey, dbKey]) => {
      if (patch[apiKey] === undefined) return
      if (apiKey === 'metadata') {
        row[dbKey] = JSON.stringify(mergeSessionMetadata(existing.metadata || {}, patch.metadata))
        return
      }
      row[dbKey] = patch[apiKey]
    })
    if (!Object.keys(row).length) {
      return this.findById(sessionId)
    }
    row.updatedAt = knex.fn.now()
    await knex(TABLE).where({ id: sessionId }).update(row)
    return this.findById(sessionId)
  }
})

module.exports = {
  TABLE,
  rowToSession,
  createSessionRepository
}
