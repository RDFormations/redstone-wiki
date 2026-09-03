const express = require('express')
const {
  requireScope,
  SCOPE_READ,
  SCOPE_IMPORT,
  SCOPE_DISTRIBUTE,
  SCOPE_PUBLISH,
  SCOPE_EDIT
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

  router.get(
    '/:id/content/versions',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const path = req.query.path
      if (!path) {
        return res.status(422).json({
          error: { code: 'path_required', message: 'Query path requis (ex. module-01-a.md).' }
        })
      }
      const result = await svc().contentVersions.listForModule(req.params.id, path)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.get(
    '/:id/content/versions/:versionId',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().contentVersions.getVersion(req.params.id, req.params.versionId)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.get(
    '/:id/content/versions/:versionId/diff',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().contentVersions.compareVersions(
        req.params.id,
        req.params.versionId,
        req.query.base || null
      )
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.get(
    '/:id/content/module',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const path = req.query.path
      if (!path) {
        return res.status(422).json({
          error: { code: 'path_required', message: 'Query path requis.' }
        })
      }
      const result = await svc().contentEdit.getModule(req.params.id, path)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.patch(
    '/:id/content/module',
    requireScope(SCOPE_EDIT),
    asyncHandler(async (req, res) => {
      const result = await svc().contentEdit.updateModule(req.params.id, req.body, {
        source: req.body.source || 'ui_edit',
        author: req.redstoneAuth?.role || req.body.author,
        chat_message_id: req.body.chat_message_id
      })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.post(
    '/:id/content/chatbot/propose',
    requireScope(SCOPE_EDIT),
    asyncHandler(async (req, res) => {
      const result = await svc().chatbot.propose(req.params.id, req.body, {
        author: req.redstoneAuth?.role || req.body.author
      })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.post(
    '/:id/content/chatbot/apply',
    requireScope(SCOPE_EDIT),
    asyncHandler(async (req, res) => {
      const result = await svc().chatbot.apply(req.params.id, req.body, {
        author: req.redstoneAuth?.role || req.body.author
      })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.post(
    '/:id/content/chatbot/:proposalId/discard',
    requireScope(SCOPE_EDIT),
    asyncHandler(async (req, res) => {
      const result = await svc().chatbot.discard(req.params.id, req.params.proposalId)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.post(
    '/:id/content/versions/:versionId/restore',
    requireScope(SCOPE_EDIT),
    asyncHandler(async (req, res) => {
      const result = await svc().contentVersions.restoreVersion(req.params.id, req.params.versionId, {
        author: req.redstoneAuth?.role || req.body?.author
      })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.get(
    '/:id/pdc',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().pdc.list(req.params.id)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json({ items: result.items })
    })
  )

  router.put(
    '/:id/pdc',
    requireScope(SCOPE_IMPORT),
    asyncHandler(async (req, res) => {
      const result = await svc().pdc.upsert(req.params.id, req.body, {
        author: req.redstoneAuth?.role
      })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json({ pdc: result.pdc })
    })
  )

  router.get(
    '/:id/pdc/diff',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().pdc.diff(req.params.id)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  router.get(
    '/:id/labs',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().labs.list(req.params.id)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json({ labs: result.labs })
    })
  )

  router.post(
    '/:id/labs',
    requireScope(SCOPE_IMPORT),
    asyncHandler(async (req, res) => {
      const result = await svc().labs.upload(req.params.id, req.body)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json({ lab: result.lab })
    })
  )

  router.get(
    '/:id/labs/:labId/download',
    requireScope(SCOPE_READ),
    asyncHandler(async (req, res) => {
      const result = await svc().labs.download(req.params.id, req.params.labId)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      res.setHeader('Content-Type', result.lab.content_type || 'application/zip')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.lab.filename)}"`
      )
      return res.status(200).send(result.lab.data)
    })
  )

  router.post(
    '/:id/labs/:labId/publish',
    requireScope(SCOPE_PUBLISH),
    asyncHandler(async (req, res) => {
      const published = req.body?.published !== false
      const result = await svc().labs.publish(req.params.id, req.params.labId, published)
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      return res.status(200).json({ lab: result.lab })
    })
  )

  router.post(
    '/:id/export-git',
    requireScope(SCOPE_DISTRIBUTE),
    asyncHandler(async (req, res) => {
      const result = await svc().exportGit.exportSession(req.params.id, {
        trigger: req.body?.trigger || 'manual'
      })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
      const { ok: _ok, status: _status, ...body } = result
      return res.status(200).json(body)
    })
  )

  return router
}

module.exports = { createContentRouter }
