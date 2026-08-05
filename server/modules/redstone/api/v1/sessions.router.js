const express = require('express')
const { requireScope, SCOPE_READ, SCOPE_CREATE } = require('../middleware/auth-scopes')

const sendResult = (res, result) => {
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error })
  }
  return res.status(result.status).json(result.session ? { session: result.session } : result)
}

const createSessionsRouter = getService => {
  const router = express.Router()

  router.post('/', requireScope(SCOPE_CREATE), async (req, res, next) => {
    try {
      const result = await getService().create(req.body)
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      return res.status(201).json({ session: result.session })
    } catch (err) {
      next(err)
    }
  })

  router.get('/', requireScope(SCOPE_READ), async (req, res, next) => {
    try {
      const result = await getService().list(req.query)
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
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
      const result = await getService().getBySlug(req.params.slug)
      return sendResult(res, result)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id', requireScope(SCOPE_READ), async (req, res, next) => {
    try {
      const result = await getService().getById(req.params.id)
      return sendResult(res, result)
    } catch (err) {
      next(err)
    }
  })

  return router
}

module.exports = {
  createSessionsRouter
}
