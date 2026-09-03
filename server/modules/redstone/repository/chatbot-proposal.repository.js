const TABLE = 'rs_chatbot_proposals'

const rowToProposal = row => {
  if (!row) return null
  return {
    id: row.id,
    session_id: row.sessionId,
    path: row.path,
    chat_message_id: row.chatMessageId,
    message: row.message,
    base_body_md: row.baseBodyMd,
    proposed_body_md: row.proposedBodyMd,
    status: row.status,
    author: row.author,
    created_at: row.createdAt,
    expires_at: row.expiresAt
  }
}

const createChatbotProposalRepository = knex => ({
  async create(row) {
    await knex(TABLE).insert({
      id: row.id,
      sessionId: row.session_id,
      path: row.path,
      chatMessageId: row.chat_message_id,
      message: row.message,
      baseBodyMd: row.base_body_md,
      proposedBodyMd: row.proposed_body_md,
      status: row.status || 'pending',
      author: row.author || null,
      createdAt: knex.fn.now(),
      expiresAt: row.expires_at || null
    })
    return this.findById(row.id)
  },

  async findById(id) {
    const row = await knex(TABLE).where({ id }).first()
    return rowToProposal(row)
  },

  async updateStatus(id, status) {
    await knex(TABLE).where({ id }).update({ status })
    return this.findById(id)
  }
})

module.exports = { createChatbotProposalRepository, TABLE }
