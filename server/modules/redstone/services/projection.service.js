/* global WIKI */

const _ = require('lodash')
const { DEFAULT_EDITOR_KEY, resolveContentType, resolveFromWikiEditors } = require('../domain/wiki-editor')
const { isStaleMarkdownRender } = require('../domain/wiki-render')
const { hubBodyMarkdown } = require('../domain/hub-shell')

/**
 * F02 — projection rs_content_modules → table Wiki pages
 * Utilise le contrat Wiki.js (editorKey + contentType) pour déclencher le pipeline markdownCore.
 */
const createProjectionService = ({ knex, logger = console }) => {
  const getAdminUserId = async () => {
    const admin = await knex('users').where({ providerKey: 'local' }).orderBy('id', 'asc').first()
    return admin?.id || 1
  }

  const renderAndInvalidate = async page => {
    if (!page) return
    await WIKI.models.pages.renderPage(page)
    await WIKI.models.pages.deletePageFromCache(page.hash)
    WIKI.events.outbound.emit('deletePageFromCache', page.hash)
  }

  const fetchPageRow = async (pagePath, locale) =>
    knex('pages').where({ path: pagePath, localeCode: locale }).first()

  const assertValidRender = async (pagePath, locale) => {
    const row = await fetchPageRow(pagePath, locale)
    if (!row || isStaleMarkdownRender(row)) {
      throw new Error(`Rendu HTML invalide pour ${pagePath}`)
    }
    return row
  }

  const contentTypeForEditor = editorKey => {
    if (WIKI?.data?.editors?.length) {
      return resolveFromWikiEditors(editorKey, WIKI.data.editors)
    }
    return resolveContentType(editorKey)
  }

  const upsertWikiPage = async ({ session, mod }) => {
    const stem = mod.path.replace(/\.md$/, '')
    const { wikiPagePath } = require('../domain/publish-policy')
    const pagePath = wikiPagePath(session.slug, stem)
    const locale = mod.locale || session.locale_default || 'fr'
    const title = mod.title || stem
    const content = mod.body_md || ''
    const isPublished = Boolean(mod.published_stagiaire)
    const editorKey = mod.editor_key || DEFAULT_EDITOR_KEY
    const contentType = contentTypeForEditor(editorKey)

    const existing = await knex('pages')
      .where({ path: pagePath, localeCode: locale })
      .first()

    const authorId = await getAdminUserId()

    if (existing) {
      const effectivePublish = Boolean(existing.isPublished) || isPublished
      await knex('pages').where({ id: existing.id }).update({
        title,
        content,
        editorKey,
        contentType,
        isPublished: effectivePublish ? 1 : 0,
        updatedAt: new Date().toISOString()
      })
      const page = await WIKI.models.pages.getPageFromDb({
        path: pagePath,
        locale,
        userId: authorId,
        isPrivate: false
      })
      if (page) {
        await renderAndInvalidate(page)
        await assertValidRender(pagePath, locale)
      }
      return existing.id
    }

    await knex('pages').insert({
      authorId,
      creatorId: authorId,
      path: pagePath,
      localeCode: locale,
      title,
      content,
      description: '',
      contentType,
      editorKey,
      isPublished: isPublished ? 1 : 0,
      isPrivate: 0,
      hash: `${pagePath}:${locale}`,
      toc: '[]',
      extra: JSON.stringify({ js: '', css: '' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishStartDate: '',
      publishEndDate: ''
    })

    const created = await knex('pages').where({ path: pagePath, localeCode: locale }).first()
    const page = await WIKI.models.pages.getPageFromDb({
      path: pagePath,
      locale,
      userId: authorId,
      isPrivate: false
    })
    if (page) {
      await renderAndInvalidate(page)
      await assertValidRender(pagePath, locale)
      await WIKI.models.pages.rebuildTree()
    }
    return created?.id || null
  }

  const reRenderRow = async (row, authorId) => {
    const editorKey = row.editorKey || DEFAULT_EDITOR_KEY
    const contentType = contentTypeForEditor(editorKey)
    if (row.contentType !== contentType || row.editorKey !== editorKey) {
      await knex('pages').where({ id: row.id }).update({
        editorKey,
        contentType,
        updatedAt: new Date().toISOString()
      })
    }
    const page = await WIKI.models.pages.getPageFromDb({
      path: row.path,
      locale: row.localeCode,
      userId: authorId,
      isPrivate: false
    })
    if (!page) return false
    await renderAndInvalidate(page)
    logger.info(`(REDSTONE/LMS) Re-render ${row.path}`)
    return true
  }

  const listSessionPageRows = async session => {
    const prefix = `formations/${session.slug}`
    return knex('pages').where('path', 'like', `${prefix}%`).select('*')
  }

  const repairStaleRenders = async session => {
    const rows = await listSessionPageRows(session)
    let repaired = 0
    const authorId = await getAdminUserId()

    for (const row of rows) {
      if (!isStaleMarkdownRender(row)) continue
      if (await reRenderRow(row, authorId)) repaired += 1
    }
    return repaired
  }

  const verifySessionRenders = async session => {
    let rows = await listSessionPageRows(session)
    let stale = rows.filter(isStaleMarkdownRender)
    if (!stale.length) return { ok: true, stale: [], repaired: 0 }

    const repaired = await repairStaleRenders(session)
    rows = await listSessionPageRows(session)
    stale = rows.filter(isStaleMarkdownRender)
    return { ok: stale.length === 0, stale, repaired }
  }

  const repairAllStaleFormationRenders = async ({ limit } = {}) => {
    const authorId = await getAdminUserId()
    let query = knex('pages')
      .where('path', 'like', 'formations/%')
      .where('contentType', 'markdown')
      .whereNotNull('content')
      .where('content', '!=', '')
    if (limit) query = query.limit(limit)

    const rows = await query.select('*')
    const stale = rows.filter(isStaleMarkdownRender)
    let repaired = 0
    for (const row of stale) {
      if (await reRenderRow(row, authorId)) repaired += 1
    }
    if (repaired) {
      logger.info(`(REDSTONE/LMS) ${repaired} page(s) formation re-rendues (total stale: ${stale.length})`)
    }
    return { repaired, stale: stale.length }
  }

  return {
    async projectSession(session, modules, { onlyChanged = true } = {}) {
      const results = []
      for (const mod of modules) {
        try {
          const pageId = await upsertWikiPage({ session, mod })
          results.push({ path: mod.path, page_id: pageId, ok: true })
        } catch (err) {
          logger.error(`(REDSTONE/LMS) Projection échec ${mod.path}: ${err.message}`)
          results.push({ path: mod.path, ok: false, error: err.message })
        }
      }
      return results
    },

    repairStaleRenders,
    verifySessionRenders,
    repairAllStaleFormationRenders,

    async setPagePublished(session, mod, published) {
      const stem = mod.path.replace(/\.md$/, '')
      const { wikiPagePath } = require('../domain/publish-policy')
      const pagePath = wikiPagePath(session.slug, stem)
      const locale = mod.locale || session.locale_default || 'fr'
      await knex('pages')
        .where({ path: pagePath, localeCode: locale })
        .update({ isPublished: published ? 1 : 0, updatedAt: new Date().toISOString() })
    },

    /** S01/T01 — pages hub natives (stagiaire public, formateur brouillon). */
    async ensureHubPages(session) {
      const locale = session.locale_default || 'fr'
      const hubs = [
        {
          path: 'stagiaire',
          title: 'Liens session',
          body_md: hubBodyMarkdown('stagiaire', session),
          published_stagiaire: true
        },
        {
          path: 'formateur',
          title: 'Espace formateur',
          body_md: hubBodyMarkdown('formateur', session),
          published_stagiaire: false
        }
      ]
      const results = []
      for (const hub of hubs) {
        const pageId = await upsertWikiPage({
          session,
          mod: { ...hub, kind: 'hub', locale }
        })
        results.push({ path: hub.path, page_id: pageId, ok: Boolean(pageId) })
      }
      return results
    }
  }
}

module.exports = { createProjectionService }
