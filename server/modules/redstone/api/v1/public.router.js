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

  /** B02 — branding public (logo + couleurs) pour UI formation */
  router.get(
    '/sessions/by-slug/:slug/branding',
    asyncHandler(async (req, res) => {
      const result = await svc().sessions.getBranding(req.params.slug, { bySlug: true })
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      res.set('Cache-Control', 'public, max-age=120')
      return res.status(200).json({ branding: result.branding })
    })
  )

  router.get(
    '/sessions/by-slug/:slug/nav',
    asyncHandler(async (req, res) => {
      const audience = req.query.audience === 'formateur' ? 'formateur' : 'stagiaire'
      const locale = req.query.locale || null
      const result = await svc().portal.getPublicNav(req.params.slug, audience, locale)
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      res.set('Cache-Control', 'public, max-age=30')
      return res.status(200).json(result.nav)
    })
  )

  router.get(
    '/sessions/by-slug/:slug/labs/:labId/download',
    asyncHandler(async (req, res) => {
      const result = await svc().portal.downloadPublicLab(req.params.slug, req.params.labId)
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      res.setHeader('Content-Type', result.lab.content_type || 'application/zip')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.lab.filename)}"`
      )
      res.set('Cache-Control', 'private, max-age=300')
      return res.status(200).send(result.lab.data)
    })
  )

  return router
}

module.exports = { createPublicRouter }
