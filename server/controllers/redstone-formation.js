/**
 * T01/T03 — API Wiki.js authentifiée pour cockpit formateur (session cookie).
 * Proxy vers services LMS internes — pas de token Bearer côté navigateur.
 */
const express = require('express')

/* global WIKI */

const router = express.Router()

const isAuthenticated = req => req.user && req.user.id > 0 && req.user.id !== 2

const canAccessFormation = (req, slug) =>
  WIKI.auth.checkAccess(req.user, ['read:pages', 'write:pages', 'manage:pages'], {
    path: `formations/${slug}`,
    locale: req.locale?.code || 'fr'
  })

const canPublishFormation = (req, slug) =>
  WIKI.auth.checkAccess(req.user, ['write:pages', 'manage:pages'], {
    path: `formations/${slug}`,
    locale: req.locale?.code || 'fr'
  })

const deny = (res, status, message) =>
  res.status(status).json({ ok: false, error: { code: status === 401 ? 'unauthorized' : 'forbidden', message } })

router.get('/:slug/formateur', async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canAccessFormation(req, slug)) return deny(res, 403, 'Accès formateur refusé.')

  if (!WIKI.redstone?.portal) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const result = await WIKI.redstone.portal.getFormateurHub(slug)
  if (!result.ok) {
    return res.status(result.status).json({ ok: false, error: result.error })
  }
  return res.status(200).json(result.hub)
})

router.post('/:slug/publish', express.json(), async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canPublishFormation(req, slug)) return deny(res, 403, 'Publication refusée.')

  if (!WIKI.redstone?.portal || !WIKI.redstone?.publish) {
    return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })
  }

  const hubResult = await WIKI.redstone.portal.getFormateurHub(slug)
  if (!hubResult.ok) {
    return res.status(hubResult.status).json({ ok: false, error: hubResult.error })
  }

  const sessionId = hubResult.session.id
  const body = req.body || {}
  const result = await WIKI.redstone.publish.publish(sessionId, {
    ...body,
    by: req.user.name || req.user.email || 'formateur'
  })

  if (!result.ok) {
    return res.status(result.status).json({ ok: false, error: result.error })
  }
  return res.status(200).json({ ok: true, ...result })
})

module.exports = router
