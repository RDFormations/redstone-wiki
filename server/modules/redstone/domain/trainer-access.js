/** T02 — RBAC formateur scoped par session (groupe formateurs-{slug}). */

const { parsePageRules } = require('./guest-access')

const TRAINER_GROUP_PREFIX = 'formateurs-'

const TRAINER_PERMISSIONS = Object.freeze([
  'read:pages',
  'read:assets',
  'write:pages',
  'write:assets',
  'read:comments',
  'write:comments',
  'read:history',
  'read:source'
])

const trainerGroupName = slug => `${TRAINER_GROUP_PREFIX}${String(slug || '').trim().replace(/^\/+/, '')}`

const trainerRulePath = slug => `formations/${String(slug || '').trim().replace(/^\/+/, '')}`

const trainerRedirectPath = slug => `/formations/${String(slug || '').trim().replace(/^\/+/, '')}/formateur`

const buildTrainerPageRule = slug => ({
  id: trainerGroupName(slug),
  deny: false,
  match: 'START',
  roles: [...TRAINER_PERMISSIONS],
  path: trainerRulePath(slug),
  locales: []
})

const resolveTrainerEmail = (session = {}) => {
  const meta = session.metadata || {}
  const candidates = [
    meta.trainer_email,
    meta.formateur_email,
    meta.trainer?.email,
    meta.monday?.formateur_email,
    meta.monday?.trainer_email
  ]
  const mondayFormateur = meta.monday?.formateur
  if (mondayFormateur && String(mondayFormateur).includes('@')) {
    candidates.push(mondayFormateur)
  }
  const found = candidates.find(v => v && String(v).includes('@'))
  return found ? String(found).trim().toLowerCase() : null
}

module.exports = {
  TRAINER_GROUP_PREFIX,
  TRAINER_PERMISSIONS,
  trainerGroupName,
  trainerRulePath,
  trainerRedirectPath,
  buildTrainerPageRule,
  resolveTrainerEmail,
  parsePageRules
}
