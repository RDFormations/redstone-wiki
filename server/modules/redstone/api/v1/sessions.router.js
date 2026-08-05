const express = require('express')
const { requireScope, SCOPE_READ, SCOPE_CREATE, SCOPE_SYNC } = require('../middleware/auth-scopes')
const { asyncHandler } = require('../middleware/error-handler')

const sendSession = (res, result) => {
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error })
  }
  return res.status(result.status).json(result.session ? { session: result.session } : result)
}

const createSessionsRouter = getServices => {
  const router = express.Router()
  const svc = () => getServices()

  router.post(
    '/',
    requireScope(SCOPE_CREATE),
    asyncHandler(async (req, res) => {
      const result = await svc().sessions.create(req.body)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(201).json({ session: result.session })
    })
  )

  router.post(
    '/upsert',
    requireScope(SCOPE_CREATE),
    asyncHandler(async (req, res) => {
      const result = await svc().sessions.upsert(req.body)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const status = result.created ? 201 : 200
      return res.status(status).json({
        session: result.session,
        created: Boolean(result.created)
      })
    })
  )

  router.get(
    '/',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().sessions.list(req.query)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json({
        sessions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset
      })
    })
  )

  router.get(
    '/by-slug/:slug',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().sessions.getBySlug(req.params.slug)
      return sendSession(res, result)
    })
  )

  router.post(
    '/:id/sync-monday',
    requireScope(SCOPE_SYNC),
    asyncHandler(async (req, res) => {
      const hasBody = Object.keys(req.body || {}).length > 0
      const result = await svc().mondaySync.syncFromMonday(req.params.id, {
        mode: hasBody ? 'override' : 'monday_api',
        body: req.body
      })
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      return res.status(200).json(result)
    })
  )

  router.get(
    '/:id',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().sessions.getById(req.params.id)
      return sendSession(res, result)
    })
  )

  return router
}

module.exports = { createSessionsRouter }
