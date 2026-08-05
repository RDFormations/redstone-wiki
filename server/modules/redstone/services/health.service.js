const { sessionNotFound } = require('../domain/api-result')
const { runHealthChecks } = require('../domain/health-checks')

const createHealthService = ({ sessionRepo, contentRepo, healthRepo }) => ({
  async getForSession(sessionId) {
    const session = await sessionRepo.findById(sessionId)
    if (!session) return sessionNotFound()

    const modules = await contentRepo.listBySession(sessionId)
    const health = runHealthChecks(session, modules)
    const stored = await healthRepo.listBySession(sessionId)

    return {
      ok: true,
      status: 200,
      body: {
        session_id: sessionId,
        ok: health.ok,
        checks: health.checks,
        stored_checks: stored,
        content_ready: Boolean(session.content_ready_at),
        distributed: Boolean(session.distributed_at),
        renders_ok: Boolean(session.metadata?.lms?.renders_ok)
      }
    }
  }
})

module.exports = { createHealthService }
