const express = require('express')
const { requireScope, SCOPE_READ } = require('../middleware/auth-scopes')
const { asyncHandler } = require('../middleware/error-handler')

const SCOPE_IMPORT = 'content:import'
const SCOPE_DISTRIBUTE = 'session:distribute'
const SCOPE_PUBLISH = 'content:publish'

const sendSession = (res, result) => {
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error })
  }
  return res.status(result.status).json(result.session ? { session: result.session } : result)
}

const createContentRouter = getServices => {
  const router = express.Router({ mergeParams: true })
  const svc = () => getServices()

  router.post(
    '/:id/content/import',
    requireScope(SCOPE_IMPORT),
    asyncHandler(async (req, res) => {
      const result = await svc().import.importBulk(req.params.id, req.body, {
        source: req.body.source,
        author: req.redstoneAuth?.role,
        agent_run_id: req.body.agent_run_id
      })
      if (!result.ok) return res.status(result.status).json(result)
      return res.status(result.status).json(result)
    })
  )

  router.post(
    '/:id/distribute',
    requireScope(SCOPE_DISTRIBUTE),
    asyncHandler(async (req, res) => {
      const result = await svc().distribute.distribute(req.params.id, req.body)
      if (!result.ok) return res.status(result.status).json(result)
      return res.status(200).json(result)
    })
  )

  router.get(
    '/:id/health',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const session = await svc().sessions.getById(req.params.id)
      if (!session.ok) return sendSession(res, session)
      const modules = await svc().content.listBySession(req.params.id)
      const { runHealthChecks } = require('../../domain/health-checks')
      const health = runHealthChecks(session.session, modules)
      const stored = await svc().health.listBySession(req.params.id)
      return res.status(200).json({
        session_id: req.params.id,
        ok: health.ok,
        checks: health.checks,
        stored_checks: stored,
        content_ready: Boolean(session.session.content_ready_at),
        distributed: Boolean(session.session.distributed_at)
      })
    })
  )

  router.post(
    '/:id/publish',
    requireScope(SCOPE_PUBLISH),
    asyncHandler(async (req, res) => {
      const result = await svc().publish.publish(req.params.id, {
        ...req.body,
        by: req.redstoneAuth?.role
      })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json(result)
    })
  )

  router.get(
    '/:id/nav',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const session = await svc().sessions.getById(req.params.id)
      if (!session.ok) return sendSession(res, session)
      const modules = await svc().content.listBySession(req.params.id)
      const audience = req.query.audience === 'formateur' ? 'formateur' : 'stagiaire'
      const nav = svc().nav.getNav(session.session, modules, audience)
      return res.status(200).json(nav)
    })
  )

  return router
}

module.exports = {
  createContentRouter,
  SCOPE_IMPORT,
  SCOPE_DISTRIBUTE,
  SCOPE_PUBLISH
}
