/* global WIKI */

/**
 * F03 / F09 / O11 — contenu session, versions, health checks
 */
exports.up = async knex => {
  const charset = () => {
    if (WIKI.config.db.type === 'mysql' || WIKI.config.db.type === 'mariadb') {
      return { charset: 'utf8mb4' }
    }
    return {}
  }

  if (!(await knex.schema.hasTable('rs_content_modules'))) {
    await knex.schema.createTable('rs_content_modules', table => {
      if (charset().charset) table.charset(charset().charset)
      table.string('id', 36).primary()
      table.string('sessionId', 36).notNullable().references('id').inTable('rs_sessions').onDelete('CASCADE')
      table.string('path', 256).notNullable()
      table.string('kind', 32).notNullable()
      table.string('title', 512)
      table.text('bodyMd').notNullable()
      table.json('frontmatter').notNullable()
      table.boolean('publishedStagiaire').notNullable().defaultTo(false)
      table.string('contentHash', 64).notNullable()
      table.integer('currentVersion').notNullable().defaultTo(1)
      table.integer('pageId').unsigned()
      table.string('locale', 8).notNullable().defaultTo('fr')
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.unique(['sessionId', 'path'], 'uq_rs_content_modules_session_path')
      table.index(['sessionId'], 'idx_rs_content_modules_session')
    })
  }

  if (!(await knex.schema.hasTable('rs_content_versions'))) {
    await knex.schema.createTable('rs_content_versions', table => {
      if (charset().charset) table.charset(charset().charset)
      table.string('id', 36).primary()
      table.string('moduleId', 36).notNullable().references('id').inTable('rs_content_modules').onDelete('CASCADE')
      table.integer('version').notNullable()
      table.text('bodyMd').notNullable()
      table.json('frontmatter').notNullable()
      table.string('source', 32).notNullable()
      table.string('author', 256)
      table.string('parentVersionId', 36)
      table.string('agentRunId', 128)
      table.string('contentHash', 64).notNullable()
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.unique(['moduleId', 'version'], 'uq_rs_content_versions_module_version')
    })
  }

  if (!(await knex.schema.hasTable('rs_session_health_checks'))) {
    await knex.schema.createTable('rs_session_health_checks', table => {
      if (charset().charset) table.charset(charset().charset)
      table.string('id', 36).primary()
      table.string('sessionId', 36).notNullable().references('id').inTable('rs_sessions').onDelete('CASCADE')
      table.string('checkId', 64).notNullable()
      table.string('level', 16).notNullable()
      table.text('message').notNullable()
      table.boolean('blocking').notNullable().defaultTo(false)
      table.timestamp('checkedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.index(['sessionId'], 'idx_rs_health_session')
    })
  }
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('rs_session_health_checks')
  await knex.schema.dropTableIfExists('rs_content_versions')
  await knex.schema.dropTableIfExists('rs_content_modules')
}
