const { TRAINER_GROUP_PREFIX } = require('../domain/trainer-access')
const {
  buildTrainerSessionCard,
  sortTrainerSessionCards,
  sessionMatchesTrainerEmail,
  MES_SESSIONS_WIKI_PAGE
} = require('../domain/formateur-sessions')
const { DEFAULT_EDITOR_KEY, resolveContentType } = require('../domain/wiki-editor')

const slugsFromTrainerGroups = groupNames =>
  groupNames
    .map(name => String(name || '').trim())
    .filter(name => name.startsWith(TRAINER_GROUP_PREFIX))
    .map(name => name.slice(TRAINER_GROUP_PREFIX.length))
    .filter(Boolean)

const mergeSessions = (...lists) => {
  const map = new Map()
  for (const list of lists) {
    for (const session of list || []) {
      if (session?.id && !map.has(session.id)) map.set(session.id, session)
    }
  }
  return [...map.values()]
}

const createTrainerSessionsService = ({
  sessionRepo,
  contentRepo,
  knex,
  checkFormationAccess = null,
  logger = console
}) => {
  const listTrainerGroupNames = async userId => {
    if (!userId) return []
    const rows = await knex('userGroups')
      .join('groups', 'userGroups.groupId', 'groups.id')
      .where('userGroups.userId', userId)
      .where('groups.name', 'like', `${TRAINER_GROUP_PREFIX}%`)
      .select('groups.name')
    return rows.map(r => r.name)
  }

  const filterAccessible = (user, sessions, locale) => {
    if (!checkFormationAccess) return sessions
    return sessions.filter(session => checkFormationAccess(user, session.slug, locale))
  }

  return {
    async listForUser(user, options = {}) {
      const locale = options.locale || 'fr'
      const email = String(user?.email || '').trim().toLowerCase()
      const userId = user?.id

      const groupNames = await listTrainerGroupNames(userId)
      const slugs = slugsFromTrainerGroups(groupNames)

      const [byEmail, bySlug] = await Promise.all([
        email ? sessionRepo.listByTrainerEmail(email) : [],
        slugs.length ? sessionRepo.findBySlugs(slugs) : []
      ])

      let sessions = mergeSessions(byEmail, bySlug)
      sessions = filterAccessible(user, sessions, locale)

      const cards = await Promise.all(
        sessions.map(async session => {
          const modules = await contentRepo.listBySession(session.id)
          return buildTrainerSessionCard(session, modules, { locale })
        })
      )

      return {
        ok: true,
        status: 200,
        dashboard: {
          locale,
          email,
          total: cards.length,
          sessions: sortTrainerSessionCards(cards)
        }
      }
    },

    async ensureMesSessionsPage(locales = ['fr']) {
      /* global WIKI */
      const admin = await knex('users').where({ providerKey: 'local' }).orderBy('id', 'asc').first()
      const authorId = admin?.id || 1
      const editorKey = DEFAULT_EDITOR_KEY
      const contentType = resolveContentType(editorKey)
      const results = []

      for (const locale of locales) {
        const { path, title, body_md } = MES_SESSIONS_WIKI_PAGE
        const existing = await knex('pages').where({ path, localeCode: locale }).first()

        if (existing) {
          if (existing.content === body_md && existing.title === title) {
            results.push({ locale, path, updated: false })
            continue
          }
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

        if (WIKI?.models?.pages) {
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
        }

        results.push({ locale, path, updated: true })
      }

      return { ok: true, results }
    }
  }
}

module.exports = { createTrainerSessionsService, slugsFromTrainerGroups, mergeSessions }
