/**
 * F13 — API admin Wiki.js (session cookie) pour volet Sessions OPS.
 */
const express = require('express')

/* global WIKI */

const router = express.Router()

const isOps = req =>
  req.user &&
  req.user.id > 0 &&
  req.user.id !== 2 &&
  WIKI.auth.checkAccess(req.user, ['manage:system'], { path: 'admin', locale: 'fr' })

const deny = (res, status, message) =>
  res.status(status).json({ ok: false, error: { code: status === 401 ? 'unauthorized' : 'forbidden', message } })

router.get('/sessions', async (req, res) => {
  if (!isOps(req)) return deny(res, 403, 'Accès OPS requis.')
  if (!WIKI.redstone?.adminSessions) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const result = await WIKI.redstone.adminSessions.list(req.query)
  return res.status(200).json(result)
})

router.get('/sessions/:id', async (req, res) => {
  if (!isOps(req)) return deny(res, 403, 'Accès OPS requis.')
  if (!WIKI.redstone?.adminSessions) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const result = await WIKI.redstone.adminSessions.getDetail(req.params.id)
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  return res.status(200).json(result)
})

router.post('/sessions/:id/push-monday', async (req, res) => {
  if (!isOps(req)) return deny(res, 403, 'Accès OPS requis.')
  if (!WIKI.redstone?.mondayPush) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const result = await WIKI.redstone.mondayPush.pushSession(req.params.id)
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error })
  return res.status(200).json({ ok: true, ...result })
})

router.post('/sessions/:id/distribute', async (req, res) => {
  if (!isOps(req)) return deny(res, 403, 'Accès OPS requis.')
  if (!WIKI.redstone?.distribute) return res.status(503).json({ ok: false, error: { message: 'LMS indisponible.' } })

  const result = await WIKI.redstone.distribute.distribute(req.params.id, req.body || {})
  if (!result.ok) {
    return res.status(result.status).json({
      ok: false,
      error: result.error,
      state: result.state,
      checks: result.checks
    })
  }
  return res.status(200).json({ ok: true, ...result })
})

module.exports = router
