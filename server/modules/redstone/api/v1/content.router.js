const express = require('express')
const {
  requireScope,
  SCOPE_READ,
  SCOPE_IMPORT,
  SCOPE_DISTRIBUTE,
  SCOPE_PUBLISH
} = require('../middleware/auth-scopes')
const { asyncHandler } = require('../middleware/error-handler')
const { sendSession, sendResult } = require('../helpers/response')

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
      return sendResult(res, result)
    })
  )

  router.post(
    '/:id/distribute',
    requireScope(SCOPE_DISTRIBUTE),
    asyncHandler(async (req, res) => {
      const result = await svc().distribute.distribute(req.params.id, req.body)
      return sendResult(res, result)
    })
  )

  router.get(
    '/:id/health',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().health.getForSession(req.params.id)
      if (!result.ok) return sendSession(res, result)
      return res.status(200).json(result.body)
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
      const audience = req.query.audience === 'formateur' ? 'formateur' : 'stagiaire'
      const result = await svc().contentNav.getNavForSession(req.params.id, audience)
      if (!result.ok) return sendSession(res, result)
      const { ok: _ok, status: _status, ...nav } = result
      return res.status(200).json(nav)
    })
  )

  return router
}

module.exports = { createContentRouter }
