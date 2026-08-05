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

  async list({ limit = 50, offset = 0, q = null } = {}) {
    let base = knex(TABLE)

    if (q && typeof q === 'string' && q.trim()) {
      const term = `%${q.trim().toLowerCase()}%`
      base = base.where(builder => {
        builder
          .whereRaw('LOWER(??) LIKE ?', ['slug', term])
          .orWhereRaw('LOWER(??) LIKE ?', ['client', term])
          .orWhereRaw('LOWER(??) LIKE ?', ['title', term])
      })
    }

    const [rows, countRow] = await Promise.all([
      base.clone().orderBy('startsAt', 'asc').orderBy('createdAt', 'desc').limit(limit).offset(offset),
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
      if (patch[apiKey] !== undefined) {
        row[dbKey] = apiKey === 'metadata' ? JSON.stringify(patch[apiKey]) : patch[apiKey]
      }
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
