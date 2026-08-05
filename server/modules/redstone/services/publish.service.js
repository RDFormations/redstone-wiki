const { publishPairPaths } = require('../domain/pair-rules')
const { tripletStems } = require('../domain/formateur-hub')
const { WEBHOOK_EVENTS } = require('../domain/webhook-events')

const stemFromPath = path => String(path || '').replace(/\.md$/, '')

/** Module → module + exercice + correction existants (aligné UI formateur). */
const expandModulePublishStems = (stem, modules) => {
  const stems = stem.startsWith('module-') ? tripletStems(stem) : [stem]
  const byStem = new Set(modules.map(m => stemFromPath(m.path)))
  return stems.filter(s => byStem.has(s))
}

const expandPublishPaths = (paths, modules) => {
  const seen = new Set()
  const result = []
  for (const raw of paths) {
    const stem = stemFromPath(raw)
    const expanded = stem.startsWith('module-') ? expandModulePublishStems(stem, modules) : [stem]
    for (const s of expanded) {
      if (!seen.has(s)) {
        seen.add(s)
        result.push(s)
      }
    }
  }
  return result
}

const createPublishService = ({
  sessionRepo,
  contentRepo,
  projectionService,
  webhooks,
  logger = console
}) => ({
  async publish(sessionId, payload) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) {
      return { ok: false, status: 404, error: { code: 'session_not_found', message: 'Session introuvable.' } }
    }

    const modules = await contentRepo.listBySession(sessionId)
    const action = payload.action || 'module'
    let paths = []

    if (action === 'module' && payload.path) {
      paths = expandModulePublishStems(stemFromPath(payload.path), modules)
    } else if (action === 'exercice' && payload.path) {
      paths = publishPairPaths(stemFromPath(payload.path), modules)
    } else if (action === 'day' && payload.day != null) {
      const planning = session.metadata?.planning || []
      const dayEntry = planning.find(d => Number(d.day) === Number(payload.day))
      paths = expandPublishPaths(dayEntry?.modules || [], modules)
    } else if (action === 'all_restricted') {
      paths = modules
        .filter(m => ['module', 'exercice', 'correction'].includes(m.kind))
        .map(m => m.path)
    } else {
      return {
        ok: false,
        status: 422,
        error: { code: 'invalid_publish_action', message: 'Action de publication invalide.' }
      }
    }

    const published = []
    for (const path of paths) {
      const mod = modules.find(m => m.path === path || m.path === `${path}.md`)
      if (!mod) continue

      if (action === 'exercice' && mod.kind === 'exercice') {
        const pairPaths = publishPairPaths(mod.path, modules)
        for (const pp of pairPaths) {
          const pairMod = modules.find(m => m.path === pp)
          if (pairMod) {
            await contentRepo.updatePublished(pairMod.id, true)
            await projectionService.setPagePublished(session, pairMod, true)
            published.push(pairMod.path)
          }
        }
        continue
      }

      await contentRepo.updatePublished(mod.id, true)
      await projectionService.setPagePublished(session, mod, true)
      published.push(mod.path)
    }

    logger.info(`(REDSTONE/LMS) Publish ${session.slug}: ${published.length} modules`)

    if (webhooks && published.length) {
      webhooks.emit(WEBHOOK_EVENTS.MODULE_PUBLISHED, {
        session_id: sessionId,
        slug: session.slug,
        published,
        count: published.length,
        by: payload.by || 'formateur'
      })
    }

    return {
      ok: true,
      status: 200,
      published,
      count: published.length
    }
  }
})

module.exports = { createPublishService }
