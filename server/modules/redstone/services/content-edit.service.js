const crypto = require('crypto')
const { normalizePath } = require('./content-versions.service')
const { isLmsOwnedHubStem } = require('../domain/hub-shell')
const { hashContent } = require('../domain/content-hash')
const { sessionNotFound, fail } = require('../domain/api-result')

const createContentEditService = ({
  sessionRepo,
  contentRepo,
  projectionService,
  logger = console
}) => ({
  async getModule(sessionId, rawPath) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const path = normalizePath(rawPath)
    const mod = await contentRepo.findBySessionAndPath(sessionId, path)
    if (!mod) {
      return {
        ok: false,
        status: 404,
        error: { code: 'module_not_found', message: `Module introuvable : ${path}` }
      }
    }

    return {
      ok: true,
      status: 200,
      path: mod.path,
      module_id: mod.id,
      title: mod.title,
      body_md: mod.body_md,
      frontmatter: mod.frontmatter || {},
      published_stagiaire: mod.published_stagiaire,
      current_version: mod.current_version,
      kind: mod.kind
    }
  },

  async updateModule(sessionId, payload, options = {}) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const path = normalizePath(payload.path)
    const stem = path.replace(/\.md$/, '')
    if (isLmsOwnedHubStem(stem)) {
      return fail(422, 'hub_not_editable', 'Les hubs stagiaire/formateur ne sont pas éditables.')
    }

    const existing = await contentRepo.findBySessionAndPath(sessionId, path)
    if (!existing) {
      return {
        ok: false,
        status: 404,
        error: { code: 'module_not_found', message: `Module introuvable : ${path}` }
      }
    }

    if (payload.body_md === undefined || payload.body_md === null) {
      return fail(422, 'body_required', 'body_md requis.')
    }

    const body_md = String(payload.body_md)
    const frontmatter = payload.frontmatter !== undefined ? payload.frontmatter : (existing.frontmatter || {})
    const title = payload.title !== undefined ? String(payload.title) : existing.title
    const contentHash = hashContent(body_md, frontmatter)

    if (existing.content_hash === contentHash) {
      return {
        ok: true,
        status: 200,
        unchanged: true,
        path,
        module_id: existing.id,
        current_version: existing.current_version
      }
    }

    const version = (existing.current_version || 0) + 1
    const record = {
      id: existing.id,
      session_id: sessionId,
      path,
      kind: existing.kind,
      title,
      body_md,
      frontmatter,
      published_stagiaire: existing.published_stagiaire,
      content_hash: contentHash,
      current_version: version,
      page_id: existing.page_id,
      locale: existing.locale || session.locale_default || 'fr'
    }

    const versionRow = {
      id: crypto.randomUUID(),
      version,
      body_md,
      frontmatter,
      source: options.source || payload.source || 'ui_edit',
      author: options.author || payload.author || 'formateur',
      parent_version_id: existing.id,
      agent_run_id: options.agent_run_id || payload.agent_run_id || null,
      chat_message_id: options.chat_message_id || payload.chat_message_id || null,
      content_hash: contentHash
    }

    const saved = await contentRepo.upsertModule(record, versionRow)

    let projected = { ok: true, skipped: true }
    if (existing.page_id && projectionService?.projectModule) {
      projected = await projectionService.projectModule(session, saved)
      if (projected.page_id) {
        await contentRepo.updatePageId(saved.id, projected.page_id)
      }
      if (!projected.ok) {
        logger.warn(`(REDSTONE/LMS) Edit ${session.slug}/${path}: projection échouée — ${projected.error}`)
        return {
          ok: true,
          status: 200,
          path,
          module_id: saved.id,
          version,
          projected: false,
          projection_error: projected.error || 'projection_failed',
          unchanged: false
        }
      }
    }

    logger.info(`(REDSTONE/LMS) Edit ${session.slug}/${path} → v${version} (${versionRow.source})`)

    return {
      ok: true,
      status: 200,
      path,
      module_id: saved.id,
      version,
      projected: projected.ok && !projected.skipped,
      unchanged: false
    }
  }
})

module.exports = { createContentEditService }
