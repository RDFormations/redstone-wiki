const crypto = require('crypto')
const { runHealthChecks } = require('../domain/health-checks')
const { transition } = require('../domain/session-state')

const createDistributeService = ({
  sessionRepo,
  contentRepo,
  healthRepo,
  projectionService,
  webhooks,
  logger = console
}) => ({
  async distribute(sessionId, options = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) {
      return { ok: false, status: 404, error: { code: 'session_not_found', message: 'Session introuvable.' } }
    }

    const modules = await contentRepo.listBySession(sessionId)
    if (!modules.length) {
      return {
        ok: false,
        status: 422,
        error: { code: 'no_content', message: 'Aucun contenu à distribuer — importer d\'abord.' }
      }
    }

    const health = runHealthChecks(session, modules, { agentImport: false })
    const blocking = health.checks.filter(c => c.blocking)
    if (blocking.length && !options.force) {
      const healthRows = health.checks.map(c => ({ id: crypto.randomUUID(), ...c }))
      await healthRepo.replaceForSession(sessionId, healthRows)
      const updated = await sessionRepo.update(sessionId, {
        state: transition(session.state, 'distribute_fail') || 'incomplete'
      })
      if (webhooks) {
        webhooks.emit('session.incomplete', {
          session_id: sessionId,
          slug: session.slug,
          errors: blocking.map(c => c.checkId)
        })
      }
      return {
        ok: false,
        status: 422,
        state: 'incomplete',
        session: updated,
        checks: health.checks,
        error: { code: 'health_failed', message: health.summary }
      }
    }

    const projection = await projectionService.projectSession(session, modules)
    const failed = projection.filter(p => !p.ok)

    for (const p of projection.filter(x => x.ok && x.page_id)) {
      const mod = modules.find(m => m.path === p.path)
      if (mod) {
        await contentRepo.updatePageId(mod.id, p.page_id)
      }
    }

    if (failed.length) {
      const updated = await sessionRepo.update(sessionId, {
        state: 'incomplete'
      })
      if (webhooks) {
        webhooks.emit('session.incomplete', {
          session_id: sessionId,
          slug: session.slug,
          errors: failed.map(p => p.path)
        })
      }
      return {
        ok: false,
        status: 422,
        state: 'incomplete',
        session: updated,
        projection,
        error: { code: 'projection_failed', message: 'Échec projection vers Wiki.js.' }
      }
    }

    const healthRows = health.checks.map(c => ({ id: crypto.randomUUID(), ...c }))
    await healthRepo.replaceForSession(sessionId, healthRows)

    const nextState = transition(session.state, 'distribute_ok') || 'distributed'
    const updated = await sessionRepo.update(sessionId, {
      state: nextState,
      distributed_at: new Date().toISOString()
    })

    logger.info(`(REDSTONE/LMS) Distribute OK: ${session.slug}`)

    if (webhooks) {
      webhooks.emit('session.distributed', {
        session_id: sessionId,
        slug: updated.slug,
        checks_ok: health.ok,
        content_ready: Boolean(updated.content_ready_at),
        distributed: true
      })
    }

    return {
      ok: true,
      status: 200,
      state: nextState,
      session: updated,
      checks: health.checks,
      projection,
      content_ready: Boolean(updated.content_ready_at),
      distributed: true,
      stagiaire_url: `https://formation.redstoneformations.fr/formations/${session.slug}/stagiaire`
    }
  }
})

module.exports = { createDistributeService }
