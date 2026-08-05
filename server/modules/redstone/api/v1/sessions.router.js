const express = require('express')
const { requireScope, SCOPE_READ, SCOPE_CREATE } = require('../middleware/auth-scopes')

const SCOPE_IMPORT = 'content:import'
const SCOPE_DISTRIBUTE = 'session:distribute'
const SCOPE_PUBLISH = 'content:publish'

const sendSession = (res, result) => {
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error })
  }
  return res.status(result.status).json(result.session ? { session: result.session } : result)
}

const createSessionsRouter = getServices => {
  const router = express.Router()
  const svc = () => getServices()

  router.post('/', requireScope(SCOPE_CREATE), async (req, res, next) => {
    try {
      const result = await svc().sessions.create(req.body)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(201).json({ session: result.session })
    } catch (err) {
      next(err)
    }
  })

  router.get('/', requireScope(SCOPE_READ), async (req, res, next) => {
    try {
      const result = await svc().sessions.list(req.query)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json({
        sessions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset
      })
    } catch (err) {
      next(err)
    }
  })

  router.get('/by-slug/:slug', requireScope(SCOPE_READ), async (req, res, next) => {
    try {
      const result = await svc().sessions.getBySlug(req.params.slug)
      return sendSession(res, result)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id', requireScope(SCOPE_READ), async (req, res, next) => {
    try {
      const result = await svc().sessions.getById(req.params.id)
      return sendSession(res, result)
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/content/import', requireScope(SCOPE_IMPORT), async (req, res, next) => {
    try {
      const result = await svc().import.importBulk(req.params.id, req.body, {
        source: req.body.source,
        author: req.redstoneAuth?.role,
        agent_run_id: req.body.agent_run_id
      })
      if (!result.ok) return res.status(result.status).json(result)
      return res.status(result.status).json(result)
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/distribute', requireScope(SCOPE_DISTRIBUTE), async (req, res, next) => {
    try {
      const result = await svc().distribute.distribute(req.params.id, req.body)
      if (!result.ok) return res.status(result.status).json(result)
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id/health', requireScope(SCOPE_READ), async (req, res, next) => {
    try {
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
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/publish', requireScope(SCOPE_PUBLISH), async (req, res, next) => {
    try {
      const result = await svc().publish.publish(req.params.id, req.body)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id/nav', requireScope(SCOPE_READ), async (req, res, next) => {
    try {
      const session = await svc().sessions.getById(req.params.id)
      if (!session.ok) return sendSession(res, session)
      const modules = await svc().content.listBySession(req.params.id)
      const audience = req.query.audience === 'formateur' ? 'formateur' : 'stagiaire'
      const nav = svc().nav.getNav(session.session, modules, audience)
      return res.status(200).json(nav)
    } catch (err) {
      next(err)
    }
  })

  return router
}

module.exports = {
  createSessionsRouter,
  SCOPE_IMPORT,
  SCOPE_DISTRIBUTE,
  SCOPE_PUBLISH
}
