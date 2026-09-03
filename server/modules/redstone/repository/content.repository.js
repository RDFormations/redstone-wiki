const TABLE_MODULES = 'rs_content_modules'
const TABLE_VERSIONS = 'rs_content_versions'

const rowToModule = row => {
  if (!row) return null
  return {
    id: row.id,
    session_id: row.sessionId,
    path: row.path,
    kind: row.kind,
    title: row.title,
    body_md: row.bodyMd,
    frontmatter: typeof row.frontmatter === 'string' ? JSON.parse(row.frontmatter) : (row.frontmatter || {}),
    published_stagiaire: Boolean(row.publishedStagiaire),
    content_hash: row.contentHash,
    current_version: row.currentVersion,
    page_id: row.pageId,
    locale: row.locale,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }
}

const createContentRepository = knex => ({
  async listBySession(sessionId) {
    const rows = await knex(TABLE_MODULES).where({ sessionId }).orderBy('path', 'asc')
    return rows.map(rowToModule)
  },

  async findBySessionAndPath(sessionId, path, locale = null) {
    const q = knex(TABLE_MODULES).where({ sessionId, path })
    if (locale) {
      const row = await q.clone().andWhere({ locale }).first()
      if (row) return rowToModule(row)
    }
    const row = await q.orderBy('locale', 'asc').first()
    return rowToModule(row)
  },

  async findBySessionPathLocale(sessionId, path, locale) {
    const row = await knex(TABLE_MODULES).where({ sessionId, path, locale }).first()
    return rowToModule(row)
  },

  async listBySessionLocale(sessionId, locale, { fallbackLocale = null } = {}) {
    const all = await this.listBySession(sessionId)
    if (!locale) return all
    const preferred = all.filter(m => m.locale === locale)
    if (!fallbackLocale || preferred.length === all.filter(m => ['module', 'intro', 'exercice', 'correction'].includes(m.kind)).length) {
      return preferred.length ? preferred : all.filter(m => m.locale === (fallbackLocale || 'fr'))
    }
    // Fallback per-path : locale demandée sinon fallback
    const byPath = new Map()
    for (const m of all) {
      const key = m.path
      const cur = byPath.get(key)
      if (!cur) {
        byPath.set(key, m)
        continue
      }
      if (m.locale === locale) byPath.set(key, m)
      else if (cur.locale !== locale && m.locale === fallbackLocale) byPath.set(key, m)
    }
    return [...byPath.values()]
  },

  async upsertModule(module, versionRow) {
    await knex.transaction(async trx => {
      const locale = module.locale || 'fr'
      const existing = await trx(TABLE_MODULES)
        .where({ sessionId: module.session_id, path: module.path, locale })
        .first()
      if (existing) {
        await trx(TABLE_MODULES).where({ id: existing.id }).update({
          kind: module.kind,
          title: module.title,
          bodyMd: module.body_md,
          frontmatter: JSON.stringify(module.frontmatter || {}),
          publishedStagiaire: module.published_stagiaire,
          contentHash: module.content_hash,
          currentVersion: module.current_version,
          pageId: module.page_id || existing.pageId,
          locale,
          updatedAt: trx.fn.now()
        })
        module.id = existing.id
      } else {
        await trx(TABLE_MODULES).insert({
          id: module.id,
          sessionId: module.session_id,
          path: module.path,
          kind: module.kind,
          title: module.title,
          bodyMd: module.body_md,
          frontmatter: JSON.stringify(module.frontmatter || {}),
          publishedStagiaire: module.published_stagiaire,
          contentHash: module.content_hash,
          currentVersion: module.current_version,
          pageId: module.page_id || null,
          locale,
          createdAt: trx.fn.now(),
          updatedAt: trx.fn.now()
        })
      }

      await trx(TABLE_VERSIONS).insert({
        id: versionRow.id,
        moduleId: module.id,
        version: versionRow.version,
        bodyMd: versionRow.body_md,
        frontmatter: JSON.stringify(versionRow.frontmatter || {}),
        source: versionRow.source,
        author: versionRow.author || null,
        parentVersionId: versionRow.parent_version_id || null,
        agentRunId: versionRow.agent_run_id || null,
        chatMessageId: versionRow.chat_message_id || null,
        contentHash: versionRow.content_hash,
        createdAt: trx.fn.now()
      })
    })
    return this.findBySessionAndPath(module.session_id, module.path, module.locale)
  },

  async updatePublished(moduleId, published) {
    await knex(TABLE_MODULES).where({ id: moduleId }).update({
      publishedStagiaire: published,
      updatedAt: knex.fn.now()
    })
  },

  async updatePageId(moduleId, pageId) {
    await knex(TABLE_MODULES).where({ id: moduleId }).update({
      pageId,
      updatedAt: knex.fn.now()
    })
  },

  async countPublished(sessionId) {
    const row = await knex(TABLE_MODULES)
      .where({ sessionId, publishedStagiaire: true })
      .count({ total: '*' })
      .first()
    return Number(row?.total || 0)
  },

  async moduleStatsBySessions(sessionIds = []) {
    if (!sessionIds.length) return {}
    const rows = await knex(TABLE_MODULES)
      .whereIn('sessionId', sessionIds)
      .where('kind', 'module')
      .groupBy('sessionId')
      .select('sessionId')
      .select(
        knex.raw('COUNT(*)::int as total_modules'),
        knex.raw('SUM(CASE WHEN "publishedStagiaire" = true THEN 1 ELSE 0 END)::int as published_modules')
      )
    return Object.fromEntries(
      rows.map(r => [
        r.sessionId,
        { total_modules: Number(r.total_modules || 0), published_modules: Number(r.published_modules || 0) }
      ])
    )
  },

  async listVersions(moduleId) {
    const rows = await knex(TABLE_VERSIONS)
      .where({ moduleId })
      .orderBy('version', 'desc')
    return rows.map(row => ({
      id: row.id,
      module_id: row.moduleId,
      version: row.version,
      source: row.source,
      author: row.author,
      agent_run_id: row.agentRunId,
      chat_message_id: row.chatMessageId || null,
      content_hash: row.contentHash,
      created_at: row.createdAt
    }))
  },

  async findVersion(versionId) {
    const row = await knex(TABLE_VERSIONS).where({ id: versionId }).first()
    if (!row) return null
    return {
      id: row.id,
      module_id: row.moduleId,
      version: row.version,
      body_md: row.bodyMd,
      frontmatter: typeof row.frontmatter === 'string' ? JSON.parse(row.frontmatter) : (row.frontmatter || {}),
      source: row.source,
      author: row.author,
      agent_run_id: row.agentRunId,
      chat_message_id: row.chatMessageId || null,
      content_hash: row.contentHash,
      created_at: row.createdAt
    }
  }
})

module.exports = {
  TABLE_MODULES,
  TABLE_VERSIONS,
  rowToModule,
  createContentRepository
}
