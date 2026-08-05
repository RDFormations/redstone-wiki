const TABLE = 'rs_webhook_outbox'
const MAX_ATTEMPTS = 3

const rowToEntry = row => {
  if (!row) return null
  return {
    id: row.id,
    event: row.event,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    status: row.status,
    attempts: row.attempts,
    last_error: row.lastError,
    next_retry_at: row.nextRetryAt,
    delivered_at: row.deliveredAt,
    created_at: row.createdAt
  }
}

const createWebhookOutboxRepository = knex => ({
  async enqueue({ id, event, payload }) {
    await knex(TABLE).insert({
      id,
      event,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      createdAt: knex.fn.now()
    })
    return this.findById(id)
  },

  async findById(id) {
    const row = await knex(TABLE).where({ id }).first()
    return rowToEntry(row)
  },

  async markDelivered(id) {
    await knex(TABLE).where({ id }).update({
      status: 'delivered',
      deliveredAt: knex.fn.now(),
      lastError: null
    })
    return this.findById(id)
  },

  async markRetry(id, { attempts, lastError, nextRetryAt }) {
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
    await knex(TABLE).where({ id }).update({
      status,
      attempts,
      lastError: lastError || null,
      nextRetryAt: status === 'pending' ? nextRetryAt : null
    })
    return this.findById(id)
  },

  async listPending(limit = 20) {
    const now = new Date().toISOString()
    const rows = await knex(TABLE)
      .where({ status: 'pending' })
      .andWhere(builder => {
        builder.whereNull('nextRetryAt').orWhere('nextRetryAt', '<=', now)
      })
      .orderBy('createdAt', 'asc')
      .limit(limit)
    return rows.map(rowToEntry)
  }
})

module.exports = {
  TABLE,
  MAX_ATTEMPTS,
  createWebhookOutboxRepository
}
