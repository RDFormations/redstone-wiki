const { WEBHOOK_EVENTS } = require('../domain/webhook-events')

const stemFromPath = path => String(path || '').replace(/\.md$/, '')

const PATH_ACTIONS = new Set(['module', 'exercice', 'correction'])

const resolveExistingStems = (stems, modules) => {
  const byStem = new Set(modules.map(m => stemFromPath(m.path)))
  const seen = new Set()
  const result = []
  for (const raw of stems) {
    const stem = stemFromPath(raw)
    if (!byStem.has(stem) || seen.has(stem)) continue
    seen.add(stem)
    result.push(stem)
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

    if (PATH_ACTIONS.has(action) && payload.path) {
      paths = resolveExistingStems([payload.path], modules)
    } else if (action === 'day' && payload.day != null) {
      const planning = session.metadata?.planning || []
      const dayEntry = planning.find(d => Number(d.day) === Number(payload.day))
      paths = resolveExistingStems(dayEntry?.modules || [], modules)
    } else if (action === 'all_restricted') {
      paths = modules
        .filter(m => ['module', 'exercice', 'correction'].includes(m.kind))
        .map(m => stemFromPath(m.path))
    } else {
      return {
        ok: false,
        status: 422,
        error: { code: 'invalid_publish_action', message: 'Action de publication invalide.' }
      }
    }

    const published = []
    const failed = []
    const publishOne = async path => {
      const mod = modules.find(m => m.path === path || m.path === `${path}.md`)
      if (!mod) return null

      await contentRepo.updatePublished(mod.id, true)

      if (projectionService.projectModule) {
        const projection = await projectionService.projectModule(session, {
          ...mod,
          published_stagiaire: true
        })
        if (!projection.ok) {
          return { path: mod.path, error: projection.error || 'projection_failed' }
        }
        if (projection.page_id) {
          await contentRepo.updatePageId(mod.id, projection.page_id)
        }
      } else {
        await projectionService.setPagePublished(session, mod, true)
      }

      return { path: mod.path, ok: true }
    }

    const outcomes = await Promise.all(paths.map(publishOne))
    for (const outcome of outcomes) {
      if (!outcome) continue
      if (outcome.error) {
        failed.push(outcome)
      } else {
        published.push(outcome.path)
      }
    }

    if (failed.length) {
      logger.warn(`(REDSTONE/LMS) Publish ${session.slug}: ${failed.length} échec(s) projection/render`)
      return {
        ok: false,
        status: 422,
        published,
        failed,
        error: {
          code: 'render_failed',
          message: `${failed.length} module(s) non publiés — rendu HTML invalide après projection.`
        }
      }
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

module.exports = { createPublishService, resolveExistingStems }
