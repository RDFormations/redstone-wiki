const crypto = require('crypto')
const bcrypt = require('bcryptjs-then')
const {
  trainerGroupName,
  trainerRedirectPath,
  buildTrainerPageRule,
  resolveTrainerEmail,
  TRAINER_PERMISSIONS,
  parsePageRules
} = require('../domain/trainer-access')

const randomPassword = () =>
  crypto.randomBytes(18).toString('base64url')

const nameFromEmail = email => {
  const local = String(email).split('@')[0] || 'Formateur'
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 255) || 'Formateur'
}

/**
 * T02 + M05 — groupe scoped + provision compte local si email Monday inconnu.
 */
const createTrainerAccessService = ({
  knex,
  reloadAuthGroups,
  createLocalUser,
  logger = console
}) => {
  const defaultCreateLocalUser = async ({ email, name, passwordRaw }) => {
    const password = await bcrypt.hash(passwordRaw, 12)
    const now = new Date().toISOString()
    const inserted = await knex('users')
      .insert({
        email: String(email).trim().toLowerCase(),
        name: name || nameFromEmail(email),
        providerKey: 'local',
        password,
        localeCode: 'fr',
        defaultEditor: 'markdown',
        timezone: 'Europe/Paris',
        tfaIsActive: false,
        isSystem: false,
        isActive: true,
        isVerified: true,
        mustChangePwd: true,
        createdAt: now,
        updatedAt: now
      })
      .returning('id')
    const id = Array.isArray(inserted) ? inserted[0]?.id ?? inserted[0] : inserted
    return { id, email: String(email).trim().toLowerCase(), created: true }
  }

  const provisionUser = createLocalUser || defaultCreateLocalUser

  return {
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
      const autoProvision = options.auto_provision !== false &&
        process.env.REDSTONE_LMS_TRAINER_AUTO_PROVISION !== '0'

      if (!email) {
        return {
          ...group,
          assignment: { ok: true, skipped: true, reason: 'no_trainer_email' }
        }
      }

      let user = await this.findUserByEmail(email)
      let provisioned = false
      let tempPassword = null

      if (!user && autoProvision) {
        try {
          tempPassword = randomPassword()
          const created = await provisionUser({
            email,
            name: options.trainer_name || nameFromEmail(email),
            passwordRaw: tempPassword
          })
          user = { id: created.id, email }
          provisioned = true
          logger.info(`(REDSTONE/LMS) M05 compte formateur créé : ${email} (${slug})`)
        } catch (err) {
          logger.warn(`(REDSTONE/LMS) M05 échec provision ${email}: ${err.message}`)
          return {
            ...group,
            assignment: {
              ok: false,
              skipped: false,
              reason: 'provision_failed',
              email,
              error: err.message
            },
            incomplete: true
          }
        }
      }

      if (!user) {
        logger.warn(`(REDSTONE/LMS) Formateur introuvable pour ${slug} : ${email}`)
        return {
          ...group,
          assignment: { ok: false, skipped: false, reason: 'user_not_found', email },
          incomplete: true
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
          assigned,
          provisioned,
          /** Mot de passe temporaire uniquement à la création — à transmettre hors bande. */
          temporary_password: provisioned ? tempPassword : undefined,
          must_change_password: provisioned
        }
      }
    }
  }
}

module.exports = { createTrainerAccessService, nameFromEmail, randomPassword }
