const express = require('express')
const { asyncHandler } = require('../middleware/error-handler')

const createPublicRouter = getServices => {
  const router = express.Router()
  const svc = () => getServices()

  router.get(
    '/sessions/by-slug/:slug/hub',
    asyncHandler(async (req, res) => {
      const result = await svc().portal.getStagiaireHub(req.params.slug)
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      res.set('Cache-Control', 'public, max-age=60')
      return res.status(200).json({ hub: result.hub })
    })
  )

  router.get(
    '/sessions/by-slug/:slug/nav',
    asyncHandler(async (req, res) => {
      const audience = req.query.audience === 'formateur' ? 'formateur' : 'stagiaire'
      const result = await svc().portal.getPublicNav(req.params.slug, audience)
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      res.set('Cache-Control', 'public, max-age=30')
      return res.status(200).json(result.nav)
    })
  )

  return router
}

module.exports = { createPublicRouter }
