const { sessionNotFound, fail } = require('../domain/api-result')
const { normalizePath } = require('./content-versions.service')
const { diffLines, summarizeDiff } = require('../domain/text-diff')
const {
  proposeHeuristic,
  proposeViaHttp,
  buildChatMessageId,
  buildProposalId,
  REDSTONE_RULES
} = require('../domain/chatbot-propose')

const createChatbotService = ({
  sessionRepo,
  contentRepo,
  contentEdit,
  proposalRepo,
  fetchImpl,
  logger = console
}) => {
  const loadContext = async (session, path) => {
    const modules = await contentRepo.listBySession(session.id)
    const current = modules.find(m => normalizePath(m.path) === path)
    const adjacent = modules
      .filter(m => m.kind === 'module' && normalizePath(m.path) !== path)
      .slice(0, 6)
      .map(m => ({ path: m.path, title: m.title }))
    return {
      session: {
        id: session.id,
        slug: session.slug,
        client: session.client,
        title: session.title,
        state: session.state
      },
      module: current
        ? { path: current.path, title: current.title, kind: current.kind }
        : { path },
      adjacent,
      rules: REDSTONE_RULES
    }
  }

  return {
    async propose(sessionId, payload = {}, options = {}) {
      const session = await sessionRepo.findById(sessionId)
      if (!session) return sessionNotFound()

      const path = normalizePath(payload.path)
      if (!path) return fail(422, 'path_required', 'path requis.')
      const message = String(payload.message || '').trim()
      if (!message) return fail(422, 'message_required', 'message requis.')

      const mod = await contentRepo.findBySessionAndPath(sessionId, path)
      if (!mod) {
        return fail(404, 'module_not_found', `Module introuvable : ${path}`)
      }

      const context = await loadContext(session, path)
      let proposal
      try {
        proposal = await proposeViaHttp(
          { body_md: mod.body_md, message, context },
          fetchImpl
        )
      } catch (err) {
        logger.warn(`(REDSTONE/LMS) Chatbot HTTP fallback: ${err.message}`)
        proposal = null
      }
      if (!proposal) {
        proposal = proposeHeuristic({ body_md: mod.body_md, message })
      }

      if (payload.proposed_body_md != null) {
        proposal = {
          proposed_body_md: String(payload.proposed_body_md),
          provider: 'agent',
          summary: payload.summary || 'Proposition agent fournie.'
        }
      }

      const chatMessageId = payload.chat_message_id || buildChatMessageId()
      const proposalId = buildProposalId()
      const hunks = diffLines(mod.body_md || '', proposal.proposed_body_md)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await proposalRepo.create({
        id: proposalId,
        session_id: sessionId,
        path,
        chat_message_id: chatMessageId,
        message,
        base_body_md: mod.body_md || '',
        proposed_body_md: proposal.proposed_body_md,
        status: 'pending',
        author: options.author || payload.author || 'formateur',
        expires_at: expiresAt
      })

      return {
        ok: true,
        status: 200,
        proposal_id: proposalId,
        chat_message_id: chatMessageId,
        path,
        provider: proposal.provider,
        summary: proposal.summary,
        base_body_md: mod.body_md || '',
        proposed_body_md: proposal.proposed_body_md,
        diff: hunks,
        summary_diff: summarizeDiff(hunks),
        applied: false
      }
    },

    async apply(sessionId, payload = {}, options = {}) {
      const session = await sessionRepo.findById(sessionId)
      if (!session) return sessionNotFound()

      const proposalId = payload.proposal_id
      if (!proposalId) return fail(422, 'proposal_required', 'proposal_id requis.')

      const proposal = await proposalRepo.findById(proposalId)
      if (!proposal || proposal.session_id !== sessionId) {
        return fail(404, 'proposal_not_found', 'Proposition introuvable.')
      }
      if (proposal.status === 'applied') {
        return fail(409, 'proposal_already_applied', 'Proposition déjà appliquée.')
      }
      if (proposal.status === 'discarded') {
        return fail(409, 'proposal_discarded', 'Proposition annulée.')
      }

      const result = await contentEdit.updateModule(
        sessionId,
        {
          path: proposal.path,
          body_md: proposal.proposed_body_md
        },
        {
          source: 'chatbot',
          author: options.author || proposal.author || 'formateur',
          chat_message_id: proposal.chat_message_id,
          agent_run_id: options.agent_run_id || null
        }
      )

      if (!result.ok) return result

      await proposalRepo.updateStatus(proposalId, 'applied')
      return {
        ...result,
        proposal_id: proposalId,
        chat_message_id: proposal.chat_message_id,
        applied: true
      }
    },

    async discard(sessionId, proposalId) {
      const session = await sessionRepo.findById(sessionId)
      if (!session) return sessionNotFound()
      const proposal = await proposalRepo.findById(proposalId)
      if (!proposal || proposal.session_id !== sessionId) {
        return fail(404, 'proposal_not_found', 'Proposition introuvable.')
      }
      await proposalRepo.updateStatus(proposalId, 'discarded')
      return { ok: true, status: 200, proposal_id: proposalId, status_label: 'discarded' }
    }
  }
}

module.exports = { createChatbotService }
