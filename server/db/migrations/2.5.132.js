/* global WIKI */

/**
 * C13 / C04 / C05 — chat_message_id, PDC, labs session
 */
exports.up = async knex => {
  const charset = () => {
    if (WIKI.config.db.type === 'mysql' || WIKI.config.db.type === 'mariadb') {
      return { charset: 'utf8mb4' }
    }
    return {}
  }

  if (await knex.schema.hasTable('rs_content_versions')) {
    const hasChat = await knex.schema.hasColumn('rs_content_versions', 'chatMessageId')
    if (!hasChat) {
      await knex.schema.alterTable('rs_content_versions', table => {
        table.string('chatMessageId', 128)
      })
    }
  }

  if (!(await knex.schema.hasTable('rs_session_pdc'))) {
    await knex.schema.createTable('rs_session_pdc', table => {
      if (charset().charset) table.charset(charset().charset)
      table.string('id', 36).primary()
      table.string('sessionId', 36).notNullable().references('id').inTable('rs_sessions').onDelete('CASCADE')
      table.string('kind', 32).notNullable() // client | improved
      table.string('title', 512)
      table.text('bodyMd').notNullable()
      table.string('contentHash', 64).notNullable()
      table.string('source', 32).notNullable().defaultTo('import_pdc')
      table.string('author', 256)
      table.integer('version').notNullable().defaultTo(1)
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.unique(['sessionId', 'kind'], 'uq_rs_session_pdc_session_kind')
      table.index(['sessionId'], 'idx_rs_session_pdc_session')
    })
  }

  if (!(await knex.schema.hasTable('rs_session_labs'))) {
    await knex.schema.createTable('rs_session_labs', table => {
      if (charset().charset) table.charset(charset().charset)
      table.string('id', 36).primary()
      table.string('sessionId', 36).notNullable().references('id').inTable('rs_sessions').onDelete('CASCADE')
      table.string('filename', 256).notNullable()
      table.string('label', 512)
      table.string('contentType', 128).notNullable().defaultTo('application/zip')
      table.binary('data').notNullable()
      table.integer('sizeBytes').notNullable().defaultTo(0)
      table.boolean('publishedStagiaire').notNullable().defaultTo(false)
      table.string('labsFrom', 256)
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.index(['sessionId'], 'idx_rs_session_labs_session')
    })
  }

  if (!(await knex.schema.hasTable('rs_chatbot_proposals'))) {
    await knex.schema.createTable('rs_chatbot_proposals', table => {
      if (charset().charset) table.charset(charset().charset)
      table.string('id', 36).primary()
      table.string('sessionId', 36).notNullable().references('id').inTable('rs_sessions').onDelete('CASCADE')
      table.string('path', 256).notNullable()
      table.string('chatMessageId', 128).notNullable()
      table.text('message').notNullable()
      table.text('baseBodyMd').notNullable()
      table.text('proposedBodyMd').notNullable()
      table.string('status', 32).notNullable().defaultTo('pending') // pending | applied | discarded
      table.string('author', 256)
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('expiresAt', { useTz: true })
      table.index(['sessionId', 'path'], 'idx_rs_chatbot_proposals_session_path')
    })
  }
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('rs_chatbot_proposals')
  await knex.schema.dropTableIfExists('rs_session_labs')
  await knex.schema.dropTableIfExists('rs_session_pdc')
  if (await knex.schema.hasTable('rs_content_versions')) {
    const hasChat = await knex.schema.hasColumn('rs_content_versions', 'chatMessageId')
    if (hasChat) {
      await knex.schema.alterTable('rs_content_versions', table => {
        table.dropColumn('chatMessageId')
      })
    }
  }
}
