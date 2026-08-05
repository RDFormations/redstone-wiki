const TABLE = 'rs_session_health_checks'

const createHealthRepository = knex => ({
  async replaceForSession(sessionId, checks) {
    await knex.transaction(async trx => {
      await trx(TABLE).where({ sessionId }).delete()
      if (!checks.length) return
      const rows = checks.map(c => ({
        id: c.id,
        sessionId,
        checkId: c.checkId,
        level: c.level,
        message: c.message,
        blocking: c.blocking,
        checkedAt: trx.fn.now()
      }))
      await trx(TABLE).insert(rows)
    })
  },

  async listBySession(sessionId) {
    return knex(TABLE).where({ sessionId }).orderBy('checkedAt', 'desc')
  }
})

module.exports = { TABLE, createHealthRepository }
