/* global WIKI */

const _ = require('lodash')

/**
 * F02 — projection rs_content_modules → table Wiki pages
 */
const createProjectionService = ({ knex, logger = console }) => {
  const getAdminUserId = async () => {
    const admin = await knex('users').where({ providerKey: 'local' }).orderBy('id', 'asc').first()
    return admin?.id || 1
  }

  const upsertWikiPage = async ({ session, mod }) => {
    const stem = mod.path.replace(/\.md$/, '')
    const { wikiPagePath } = require('../domain/publish-policy')
    const pagePath = wikiPagePath(session.slug, stem)
    const locale = mod.locale || session.locale_default || 'fr'
    const title = mod.title || stem
    const content = mod.body_md || ''
    const isPublished = Boolean(mod.published_stagiaire)

    const existing = await knex('pages')
      .where({ path: pagePath, localeCode: locale })
      .first()

    const authorId = await getAdminUserId()

    if (existing) {
      const effectivePublish = Boolean(existing.isPublished) || isPublished
      await knex('pages').where({ id: existing.id }).update({
        title,
        content,
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
        await WIKI.models.pages.renderPage(page)
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
      contentType: 'text',
      editorKey: 'markdown',
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
      await WIKI.models.pages.renderPage(page)
      await WIKI.models.pages.rebuildTree()
    }
    return created?.id || null
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
          body_md: '<!-- hub stagiaire S01 -->',
          published_stagiaire: true
        },
        {
          path: 'formateur',
          title: 'Espace formateur',
          body_md: '<!-- hub formateur T01 -->',
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
