const {
  trainerGroupName,
  trainerRedirectPath,
  buildTrainerPageRule,
  resolveTrainerEmail,
  TRAINER_PERMISSIONS,
  parsePageRules
} = require('../domain/trainer-access')

const createTrainerAccessService = ({ knex, reloadAuthGroups, logger = console }) => ({
  async findGroupBySlug(slug) {
    const name = trainerGroupName(slug)
    return knex('groups').where({ name }).first()
  },

  async ensureTrainerGroup(slug) {
    const name = trainerGroupName(slug)
    const rule = buildTrainerPageRule(slug)
    const permissions = JSON.stringify([...TRAINER_PERMISSIONS])
    const pageRulesJson = JSON.stringify([rule])
    const redirectOnLogin = trainerRedirectPath(slug)

    const existing = await knex('groups').where({ name }).first()
    if (existing) {
      const rules = parsePageRules(existing.pageRules)
      const hasRule = rules.some(r => r.id === rule.id && r.path === rule.path)
      if (!hasRule || existing.redirectOnLogin !== redirectOnLogin) {
        await knex('groups')
          .where({ id: existing.id })
          .update({
            permissions,
            pageRules: pageRulesJson,
            redirectOnLogin,
            updatedAt: new Date().toISOString()
          })
        if (reloadAuthGroups) await reloadAuthGroups()
        return { ok: true, group_id: existing.id, group_name: name, created: false, updated: true }
      }
      return { ok: true, group_id: existing.id, group_name: name, created: false, updated: false }
    }

    const row = {
      name,
      permissions,
      pageRules: pageRulesJson,
      redirectOnLogin,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const inserted = await knex('groups').insert(row).returning('id')
    const groupId = Array.isArray(inserted) ? inserted[0]?.id ?? inserted[0] : inserted

    if (reloadAuthGroups) await reloadAuthGroups()
    logger.info(`(REDSTONE/LMS) Groupe formateur créé : ${name}`)
    return { ok: true, group_id: groupId, group_name: name, created: true, updated: false }
  },

  async findUserByEmail(email) {
    if (!email) return null
    return knex('users')
      .where({ email: String(email).trim().toLowerCase(), providerKey: 'local' })
      .first()
  },

  async assignUserToGroup(userId, groupId) {
    const existing = await knex('userGroups').where({ userId, groupId }).first()
    if (existing) return { assigned: false }
    await knex('userGroups').insert({ userId, groupId })
    return { assigned: true }
  },

  async ensureSessionTrainerAccess(session, options = {}) {
    const slug = session.slug
    const group = await this.ensureTrainerGroup(slug)
    const email = options.trainer_email || resolveTrainerEmail(session)

    if (!email) {
      return {
        ...group,
        assignment: { ok: true, skipped: true, reason: 'no_trainer_email' }
      }
    }

    const user = await this.findUserByEmail(email)
    if (!user) {
      logger.warn(`(REDSTONE/LMS) Formateur introuvable pour ${slug} : ${email}`)
      return {
        ...group,
        assignment: { ok: false, skipped: false, reason: 'user_not_found', email }
      }
    }

    const { assigned } = await this.assignUserToGroup(user.id, group.group_id)
    if (assigned) {
      logger.info(`(REDSTONE/LMS) Formateur ${email} → ${group.group_name}`)
    }
    return {
      ...group,
      assignment: {
        ok: true,
        email,
        user_id: user.id,
        assigned
      }
    }
  }
})

module.exports = { createTrainerAccessService }
