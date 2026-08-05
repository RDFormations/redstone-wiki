/** E01 — règles Guests Wiki.js pour accès stagiaire sans compte (par slug). */

const GUESTS_GROUP_ID = 2

const GUEST_FORMATION_ROLES = Object.freeze([
  'read:pages',
  'read:assets',
  'read:comments',
  'write:comments'
])

const guestRulePath = slug => `formations/${String(slug).trim().replace(/^\/+/, '')}`

const guestRuleId = slug => `guest-public-${guestRulePath(slug).replace(/\//g, '-')}`

const buildGuestFormationRule = slug => ({
  id: guestRuleId(slug),
  deny: false,
  match: 'START',
  roles: [...GUEST_FORMATION_ROLES],
  path: guestRulePath(slug),
  locales: []
})

const parsePageRules = raw => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const upsertGuestRule = (rules, slug) => {
  const rule = buildGuestFormationRule(slug)
  const without = rules.filter(r => r.id !== rule.id && r.path !== rule.path)
  return [...without, rule]
}

module.exports = {
  GUESTS_GROUP_ID,
  GUEST_FORMATION_ROLES,
  guestRulePath,
  guestRuleId,
  buildGuestFormationRule,
  parsePageRules,
  upsertGuestRule
}
