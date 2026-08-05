const { pageKind } = require('../domain/publish-policy')
const { publishPairPaths } = require('../domain/pair-rules')
const { WEBHOOK_EVENTS } = require('../domain/webhook-events')

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
      paths = [payload.path.replace(/\.md$/, '')]
    } else if (action === 'exercice' && payload.path) {
      paths = publishPairPaths(payload.path.replace(/\.md$/, ''), modules)
    } else if (action === 'day' && payload.day) {
      const planning = session.metadata?.planning || []
      const dayEntry = planning.find(d => d.day === payload.day)
      paths = dayEntry?.modules || []
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
