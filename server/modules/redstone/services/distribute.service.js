const { runHealthChecks } = require('../domain/health-checks')
const { toHealthRows } = require('../domain/health-rows')
const { transition } = require('../domain/session-state')
const { sessionNotFound, fail } = require('../domain/api-result')
const { buildIncompleteOutcome } = require('../domain/distribute-outcome')
const { WEBHOOK_EVENTS } = require('../domain/webhook-events')

const createDistributeService = ({
  sessionRepo,
  contentRepo,
  healthRepo,
  projectionService,
  guestAccess,
  webhooks,
  logger = console
}) => ({
  async distribute(sessionId, options = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const modules = await contentRepo.listBySession(sessionId)
    if (!modules.length) {
      return fail(422, 'no_content', 'Aucun contenu à distribuer — importer d\'abord.')
    }

    const health = runHealthChecks(session, modules, { agentImport: false })
    const blocking = health.checks.filter(c => c.blocking)
    if (blocking.length && !options.force) {
      const healthRows = toHealthRows(health.checks)
      await healthRepo.replaceForSession(sessionId, healthRows)
      const updated = await sessionRepo.update(sessionId, {
        state: transition(session.state, 'distribute_fail') || 'incomplete'
      })
      if (webhooks) {
        webhooks.emit(WEBHOOK_EVENTS.SESSION_INCOMPLETE, {
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
      return buildIncompleteOutcome({
        sessionRepo,
        sessionId,
        session,
        webhooks,
        errors: failed.map(p => p.path),
        projection,
        errorCode: 'projection_failed',
        errorMessage: 'Échec projection vers Wiki.js.'
      })
    }

    const hubProjection = await projectionService.ensureHubPages(session)
    const hubFailed = hubProjection.filter(p => !p.ok)
    if (hubFailed.length) {
      return buildIncompleteOutcome({
        sessionRepo,
        sessionId,
        session,
        webhooks,
        errors: hubFailed.map(p => p.path),
        projection: [...projection, ...hubProjection],
        errorCode: 'hub_projection_failed',
        errorMessage: 'Échec projection hubs stagiaire/formateur.'
      })
    }

    const healthRows = toHealthRows(health.checks)
    await healthRepo.replaceForSession(sessionId, healthRows)

    const nextState = transition(session.state, 'distribute_ok') || 'distributed'
    const updated = await sessionRepo.update(sessionId, {
      state: nextState,
      distributed_at: new Date().toISOString(),
      metadata: {
        lms: {
          content_ready: Boolean(session.content_ready_at),
          distributed: true,
          support_ready: true,
          updated_at: new Date().toISOString()
        }
      }
    })

    let guest_access = null
    if (guestAccess) {
      guest_access = await guestAccess.ensureGuestFormationAccess(updated.slug)
    }

    logger.info(`(REDSTONE/LMS) Distribute OK: ${session.slug}`)

    if (webhooks) {
      webhooks.emit(WEBHOOK_EVENTS.SESSION_DISTRIBUTED, {
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
      guest_access,
      stagiaire_url: `https://formation.redstoneformations.fr/formations/${session.slug}/stagiaire`
    }
  }
})

module.exports = { createDistributeService }
