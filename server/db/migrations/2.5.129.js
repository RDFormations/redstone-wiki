/* global WIKI */

/**
 * F01 — Registre sessions LMS RedStone
 */
exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('rs_sessions')
  if (hasTable) {
    return
  }

  await knex.schema.createTable('rs_sessions', table => {
    if (WIKI.config.db.type === 'mysql' || WIKI.config.db.type === 'mariadb') {
      table.charset('utf8mb4')
    }
    table.string('id', 36).primary()
    table.string('slug', 128).notNullable().unique()
    table.bigInteger('mondayItemId').notNullable().unique()
    table.string('client', 256).notNullable()
    table.string('refClient', 64)
    table.string('title', 512).notNullable()
    table.string('localeDefault', 8).notNullable().defaultTo('fr')
    table.string('state', 32).notNullable().defaultTo('draft')
    table.timestamp('startsAt', { useTz: true })
    table.timestamp('endsAt', { useTz: true })
    table.string('wikiPath', 256).notNullable()
    table.json('metadata').notNullable()
    table.timestamp('contentReadyAt', { useTz: true })
    table.timestamp('distributedAt', { useTz: true })
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    table.index(['state'], 'idx_rs_sessions_state')
    table.index(['startsAt', 'endsAt'], 'idx_rs_sessions_dates')
  })
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('rs_sessions')
}
