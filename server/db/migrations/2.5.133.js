/* global WIKI */

/**
 * F08 — unique (sessionId, path, locale) pour contenu bilingue sous un slug
 */
exports.up = async knex => {
  const has = await knex.schema.hasTable('rs_content_modules')
  if (!has) return

  // Normalize null locales before unique
  await knex('rs_content_modules').whereNull('locale').update({ locale: 'fr' })

  const isPg = WIKI.config.db.type === 'postgres'
  if (isPg) {
    await knex.raw('ALTER TABLE rs_content_modules DROP CONSTRAINT IF EXISTS uq_rs_content_modules_session_path')
    await knex.raw(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_rs_content_modules_session_path_locale'
        ) THEN
          ALTER TABLE rs_content_modules
            ADD CONSTRAINT uq_rs_content_modules_session_path_locale UNIQUE ("sessionId", path, locale);
        END IF;
      END $$;
    `)
  } else {
    try {
      await knex.schema.alterTable('rs_content_modules', table => {
        table.dropUnique(['sessionId', 'path'], 'uq_rs_content_modules_session_path')
      })
    } catch (e) {
      /* ignore */
    }
    const exists = await knex.schema.hasColumn('rs_content_modules', 'locale')
    if (exists) {
      try {
        await knex.schema.alterTable('rs_content_modules', table => {
          table.unique(['sessionId', 'path', 'locale'], 'uq_rs_content_modules_session_path_locale')
        })
      } catch (e) {
        /* ignore if already present */
      }
    }
  }
}

exports.down = async knex => {
  const isPg = WIKI.config.db.type === 'postgres'
  if (isPg) {
    await knex.raw('ALTER TABLE rs_content_modules DROP CONSTRAINT IF EXISTS uq_rs_content_modules_session_path_locale')
    await knex.raw(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_rs_content_modules_session_path'
        ) THEN
          ALTER TABLE rs_content_modules
            ADD CONSTRAINT uq_rs_content_modules_session_path UNIQUE ("sessionId", path);
        END IF;
      END $$;
    `)
  }
}
