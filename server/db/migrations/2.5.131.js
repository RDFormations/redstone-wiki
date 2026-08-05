/* global WIKI */

/**
 * O02 — file d'attente webhooks sortants (livraison durable)
 */
exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('rs_webhook_outbox')
  if (hasTable) {
    return
  }

  await knex.schema.createTable('rs_webhook_outbox', table => {
    if (WIKI.config.db.type === 'mysql' || WIKI.config.db.type === 'mariadb') {
      table.charset('utf8mb4')
    }
    table.string('id', 36).primary()
    table.string('event', 64).notNullable()
    table.json('payload').notNullable()
    table.string('status', 16).notNullable().defaultTo('pending')
    table.integer('attempts').notNullable().defaultTo(0)
    table.text('lastError')
    table.timestamp('nextRetryAt', { useTz: true })
    table.timestamp('deliveredAt', { useTz: true })
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    table.index(['status', 'nextRetryAt'], 'idx_rs_webhook_outbox_pending')
    table.index(['createdAt'], 'idx_rs_webhook_outbox_created')
  })
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('rs_webhook_outbox')
}
