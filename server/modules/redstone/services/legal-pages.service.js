/* global WIKI */

const { LEGAL_PAGES } = require('../domain/legal-pages')
const { DEFAULT_EDITOR_KEY, resolveContentType } = require('../domain/wiki-editor')

const createLegalPagesService = ({ knex, logger = console }) => {
  const getAdminUserId = async () => {
    const admin = await knex('users').where({ providerKey: 'local' }).orderBy('id', 'asc').first()
    return admin?.id || 1
  }

  const upsertPage = async ({ path, title, body_md, locale }) => {
    const authorId = await getAdminUserId()
    const editorKey = DEFAULT_EDITOR_KEY
    const contentType = resolveContentType(editorKey)
    const existing = await knex('pages').where({ path, localeCode: locale }).first()

    if (existing) {
      if (existing.content === body_md && existing.title === title) return { path, updated: false }
      await knex('pages').where({ id: existing.id }).update({
        title,
        content: body_md,
        editorKey,
        contentType,
        isPublished: 1,
        updatedAt: new Date().toISOString()
      })
    } else {
      await knex('pages').insert({
        authorId,
        creatorId: authorId,
        path,
        localeCode: locale,
        title,
        content: body_md,
        description: '',
        contentType,
        editorKey,
        isPublished: 1,
        isPrivate: 0,
        hash: `${path}:${locale}`,
        toc: '[]',
        extra: JSON.stringify({ js: '', css: '' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishStartDate: '',
        publishEndDate: ''
      })
    }

    const page = await WIKI.models.pages.getPageFromDb({
      path,
      locale,
      userId: authorId,
      isPrivate: false
    })
    if (page) {
      await WIKI.models.pages.renderPage(page)
      await WIKI.models.pages.deletePageFromCache(page.hash)
      WIKI.events.outbound.emit('deletePageFromCache', page.hash)
    }
    return { path, updated: true }
  }

  return {
    async ensureSiteLegalPages(locales = ['fr']) {
      const results = []
      for (const locale of locales) {
        for (const [path, spec] of Object.entries(LEGAL_PAGES)) {
          try {
            const result = await upsertPage({
              path,
              title: spec.title,
              body_md: spec.body_md,
              locale
            })
            results.push({ locale, ...result })
          } catch (err) {
            logger.warn(`(REDSTONE/LMS) Page légale ${path} (${locale}): ${err.message}`)
            results.push({ locale, path, error: err.message })
          }
        }
      }
      const updated = results.filter(r => r.updated).length
      if (updated) logger.info(`(REDSTONE/LMS) ${updated} page(s) légale(s) provisionnée(s)`)
      return { ok: true, results }
    }
  }
}

module.exports = { createLegalPagesService }
