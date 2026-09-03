const crypto = require('crypto')
const {
  pageKind,
  agentMaySetPublished,
  defaultPublishedStagiaire
} = require('../domain/publish-policy')
const { normalizeModuleInput } = require('../domain/import-normalize')
const { isLmsOwnedHubStem } = require('../domain/hub-shell')
const { hashContent } = require('../domain/content-hash')
const { runQaGate } = require('../domain/qa-gate')
const { runHealthChecks } = require('../domain/health-checks')
const { toHealthRows } = require('../domain/health-rows')
const { transition } = require('../domain/session-state')
const { sessionNotFound, fail } = require('../domain/api-result')
const { WEBHOOK_EVENTS } = require('../domain/webhook-events')

const createImportService = ({
  sessionRepo,
  contentRepo,
  healthRepo,
  webhooks,
  mondayPush,
  logger = console
}) => ({
  async importBulk(sessionId, payload, options = {}) {
    const sessionResult = await sessionRepo.findById(sessionId)
    if (!sessionResult) return sessionNotFound()
    const session = sessionResult

    const rawModules = payload.modules || payload.files || []
    if (!Array.isArray(rawModules) || !rawModules.length) {
      return fail(422, 'modules_required', 'Au moins un module est requis.')
    }

    const source = options.source || payload.source || 'agent_pipeline'
    const isAgent = ['agent_pipeline', 'import_file'].includes(source)
    const imported = []

    for (const raw of rawModules) {
      const mod = normalizeModuleInput(raw)
      const stem = mod.path
      if (isLmsOwnedHubStem(stem)) {
        logger.info(`(REDSTONE/LMS) Hub ${stem} ignoré à l'import — créé par distribute (ensureHubPages).`)
        continue
      }
      const kind = pageKind(stem)

      let published = defaultPublishedStagiaire(stem, mod.frontmatter)
      if (mod.frontmatter.published !== undefined) {
        published = ['true', '1', 'yes', 'on'].includes(String(mod.frontmatter.published).toLowerCase())
      }

      if (isAgent && published && !agentMaySetPublished(stem, mod.frontmatter)) {
        return {
          ok: false,
          status: 422,
          error: {
            code: 'published_forbidden',
            message: `Publication stagiaire interdite à l'import agent pour ${stem} (E02).`
          }
        }
      }

      const contentHash = hashContent(mod.body_md, mod.frontmatter)
      const existing = await contentRepo.findBySessionAndPath(sessionId, mod.path)

      if (existing && existing.content_hash === contentHash) {
        imported.push(existing)
        continue
      }

      const moduleId = existing?.id || crypto.randomUUID()
      const version = (existing?.current_version || 0) + 1

      const record = {
        id: moduleId,
        session_id: sessionId,
        path: mod.path,
        kind,
        title: mod.title,
        body_md: mod.body_md,
        frontmatter: mod.frontmatter,
        published_stagiaire: isAgent ? false : published,
        content_hash: contentHash,
        current_version: version,
        page_id: existing?.page_id || null,
        locale: mod.locale || session.locale_default || 'fr'
      }

      const versionRow = {
        id: crypto.randomUUID(),
        version,
        body_md: mod.body_md,
        frontmatter: mod.frontmatter,
        source,
        author: options.author || payload.author || source,
        parent_version_id: existing ? existing.id : null,
        agent_run_id: options.agent_run_id || payload.agent_run_id || null,
        content_hash: contentHash
      }

      const saved = await contentRepo.upsertModule(record, versionRow)
      imported.push(saved)
    }

    const qa = runQaGate(session.slug, imported, {
      modulesExpected: payload.modules_expected
    })

    const health = runHealthChecks(session, imported, { agentImport: isAgent })
    const healthRows = toHealthRows(health.checks)
    await healthRepo.replaceForSession(sessionId, healthRows)

    const qaGreen = qa.status === 'green'
    const event = qaGreen ? 'import_qa_green' : 'import_qa_red'
    const nextState = transition(session.state, event) || (qaGreen ? 'draft_ready' : 'incomplete')

    const patch = {
      state: nextState,
      content_ready_at: qaGreen ? new Date().toISOString() : session.content_ready_at,
      metadata: {
        lms: {
          content_ready: qaGreen,
          distributed: Boolean(session.distributed_at),
          support_ready: false,
          updated_at: new Date().toISOString()
        }
      }
    }
    const updated = await sessionRepo.update(sessionId, patch)

    logger.info(`(REDSTONE/LMS) Import ${session.slug}: ${imported.length} modules, QA=${qa.status}`)

    if (webhooks) {
      if (qaGreen) {
        webhooks.emit(WEBHOOK_EVENTS.CONTENT_DRAFT_READY, {
          session_id: sessionId,
          slug: updated.slug,
          qa_score: qa.score,
          state: updated.state
        })
      } else {
        webhooks.emit(WEBHOOK_EVENTS.SESSION_INCOMPLETE, {
          session_id: sessionId,
          slug: updated.slug,
          errors: qa.issues?.filter(i => i.severity === 'blocking').map(i => i.code) || []
        })
      }
    }

    if (mondayPush) mondayPush.schedulePush(sessionId)

    return {
      ok: true,
      status: 200,
      session: updated,
      qa,
      health,
      modules_imported: imported.length,
      content_ready: qaGreen,
      distributed: false
    }
  }
})

module.exports = { createImportService }
