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

const resolveSessionId = async (slug, res) => {
  if (!WIKI.redstone?.portal) {
    res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })
    return null
  }
  const hubResult = await WIKI.redstone.portal.getFormateurHub(slug)
  if (!hubResult.ok) {
    res.status(hubResult.status).json({ ok: false, error: hubResult.error })
    return null
  }
  return hubResult.session.id
}

router.get('/:slug/content/module', async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canAccessFormation(req, slug)) return deny(res, 403, 'Accès formateur refusé.')
  if (!WIKI.redstone?.contentEdit) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const path = req.query.path
  if (!path) return res.status(422).json({ ok: false, error: { code: 'path_required', message: 'path requis.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.contentEdit.getModule(sessionId, path)
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

router.patch('/:slug/content/module', express.json(), async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canPublishFormation(req, slug)) return deny(res, 403, 'Édition refusée.')

  if (!WIKI.redstone?.contentEdit) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.contentEdit.updateModule(sessionId, req.body || {}, {
    source: 'ui_edit',
    author: req.user.name || req.user.email || 'formateur'
  })
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

router.get('/:slug/content/versions', async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canAccessFormation(req, slug)) return deny(res, 403, 'Accès formateur refusé.')
  if (!WIKI.redstone?.contentVersions) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const path = req.query.path
  if (!path) return res.status(422).json({ ok: false, error: { code: 'path_required', message: 'path requis.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.contentVersions.listForModule(sessionId, path)
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

router.get('/:slug/content/versions/:versionId', async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canAccessFormation(req, slug)) return deny(res, 403, 'Accès formateur refusé.')
  if (!WIKI.redstone?.contentVersions) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.contentVersions.getVersion(sessionId, req.params.versionId)
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

router.get('/:slug/content/versions/:versionId/diff', async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canAccessFormation(req, slug)) return deny(res, 403, 'Accès formateur refusé.')
  if (!WIKI.redstone?.contentVersions) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.contentVersions.compareVersions(
    sessionId,
    req.params.versionId,
    req.query.base || null
  )
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

router.post('/:slug/content/versions/:versionId/restore', express.json(), async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canPublishFormation(req, slug)) return deny(res, 403, 'Restauration refusée.')
  if (!WIKI.redstone?.contentVersions) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.contentVersions.restoreVersion(sessionId, req.params.versionId, {
    author: req.user.name || req.user.email || 'formateur'
  })
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

router.post('/:slug/content/chatbot/propose', express.json(), async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canPublishFormation(req, slug)) return deny(res, 403, 'Chatbot refusé.')
  if (!WIKI.redstone?.chatbot) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.chatbot.propose(sessionId, req.body || {}, {
    author: req.user.name || req.user.email || 'formateur'
  })
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

router.post('/:slug/content/chatbot/apply', express.json(), async (req, res) => {
  if (!isAuthenticated(req)) return deny(res, 401, 'Connexion requise.')
  const slug = String(req.params.slug || '').trim().toLowerCase()
  if (!slug) return deny(res, 400, 'Slug invalide.')
  if (!canPublishFormation(req, slug)) return deny(res, 403, 'Application refusée.')
  if (!WIKI.redstone?.chatbot) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const sessionId = await resolveSessionId(slug, res)
  if (!sessionId) return undefined

  const result = await WIKI.redstone.chatbot.apply(sessionId, req.body || {}, {
    author: req.user.name || req.user.email || 'formateur'
  })
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  const { ok: _ok, status: _status, ...body } = result
  return res.status(200).json(body)
})

module.exports = router
