const {
  GUESTS_GROUP_ID,
  parsePageRules,
  upsertGuestRule,
  upsertGuestLegalRules,
  guestRulePath
} = require('../domain/guest-access')

const createGuestAccessService = ({ knex, reloadAuthGroups, logger = console }) => ({
  async ensureGuestFormationAccess(slug) {
    const path = guestRulePath(slug)
    const group = await knex('groups').where({ id: GUESTS_GROUP_ID }).first()
    if (!group) {
      logger.warn(`(REDSTONE/LMS) Groupe Guests (${GUESTS_GROUP_ID}) introuvable — accès stagiaire non provisionné.`)
      return { ok: false, reason: 'guests_group_missing' }
    }

    const rules = parsePageRules(group.pageRules)
    const hasRule = rules.some(r => !r.deny && r.match === 'START' && r.path === path)
    if (hasRule) {
      return { ok: true, path, created: false }
    }

    const nextRules = upsertGuestRule(rules, slug)
    await knex('groups')
      .where({ id: GUESTS_GROUP_ID })
      .update({
        pageRules: JSON.stringify(nextRules),
        updatedAt: new Date().toISOString()
      })

    if (reloadAuthGroups) {
      await reloadAuthGroups()
    }

    logger.info(`(REDSTONE/LMS) Accès Guests provisionné : ${path}`)
    return { ok: true, path, created: true, rule_id: nextRules[nextRules.length - 1].id }
  },

  async ensureGuestLegalPagesAccess() {
    const group = await knex('groups').where({ id: GUESTS_GROUP_ID }).first()
    if (!group) {
      logger.warn(`(REDSTONE/LMS) Groupe Guests (${GUESTS_GROUP_ID}) introuvable — pages légales non accessibles.`)
      return { ok: false, reason: 'guests_group_missing' }
    }

    const rules = parsePageRules(group.pageRules)
    const nextRules = upsertGuestLegalRules(rules)
    const changed = JSON.stringify(rules) !== JSON.stringify(nextRules)
    if (changed) {
      await knex('groups')
        .where({ id: GUESTS_GROUP_ID })
        .update({
          pageRules: JSON.stringify(nextRules),
          updatedAt: new Date().toISOString()
        })
      if (reloadAuthGroups) await reloadAuthGroups()
      logger.info('(REDSTONE/LMS) Accès Guests pages légales provisionné')
    }
    return { ok: true, created: changed }
  }
})

module.exports = { createGuestAccessService }
