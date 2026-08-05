const { api, tokens } = require('./lms-client')
const { minimalCourseModules, uniqueSlug, uniqueMondayId } = require('./fixtures')

/**
 * Provisionne une session distribuée prête pour les tests rôles (E01 guest rule inclus).
 */
const provisionDistributedSession = async (options = {}) => {
  const slug = options.slug || uniqueSlug(options.prefix || 'e2e-session')
  const agentToken = options.agentToken || tokens().agent

  const created = await api('POST', '/sessions', {
    token: agentToken,
    body: {
      slug,
      monday_item_id: options.mondayItemId || uniqueMondayId(),
      client: options.client || 'RDF',
      title: options.title || `E2E ${slug}`,
      ref_client: options.refClient
    }
  })
  if (created.status !== 201) {
    throw new Error(`provision create failed ${created.status}: ${JSON.stringify(created.body)}`)
  }

  const sessionId = created.body.session.id

  const imported = await api('POST', `/sessions/${sessionId}/content/import`, {
    token: agentToken,
    body: {
      modules: options.modules || minimalCourseModules(),
      source: options.source || 'e2e-session-factory'
    }
  })
  if (imported.status !== 200 || !imported.body.ok) {
    throw new Error(`provision import failed: ${JSON.stringify(imported.body)}`)
  }

  const distributed = await api('POST', `/sessions/${sessionId}/distribute`, {
    token: agentToken,
    body: options.distributeOptions || {}
  })
  if (distributed.status !== 200 || !distributed.body.ok) {
    throw new Error(`provision distribute failed: ${JSON.stringify(distributed.body)}`)
  }

  return {
    sessionId,
    slug,
    session: distributed.body.session,
    distribute: distributed.body
  }
}

const publishModule = (sessionId, path, token = tokens().formateur) =>
  api('POST', `/sessions/${sessionId}/publish`, {
    token,
    body: { action: 'module', path }
  })

const publishExercice = (sessionId, path, token = tokens().formateur) =>
  api('POST', `/sessions/${sessionId}/publish`, {
    token,
    body: { action: 'exercice', path }
  })

const stagiaireNav = sessionId =>
  api('GET', `/sessions/${sessionId}/nav`, {
    token: tokens().agent,
    query: { audience: 'stagiaire' }
  })

module.exports = {
  provisionDistributedSession,
  publishModule,
  publishExercice,
  stagiaireNav
}
