/** E01 — règles Guests Wiki.js pour accès stagiaire sans compte (par slug). */

const GUESTS_GROUP_ID = 2

const LEGAL_GUEST_PATHS = Object.freeze(['mentions-legales', 'politique-confidentialite'])

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

const buildGuestLegalRule = path => ({
  id: `guest-legal-${path.replace(/\//g, '-')}`,
  deny: false,
  match: 'START',
  roles: [...GUEST_FORMATION_ROLES],
  path,
  locales: []
})

const upsertGuestLegalRules = rules => {
  let next = [...rules]
  for (const path of LEGAL_GUEST_PATHS) {
    const rule = buildGuestLegalRule(path)
    next = next.filter(r => r.id !== rule.id && r.path !== path)
    next.push(rule)
  }
  return next
}

module.exports = {
  GUESTS_GROUP_ID,
  GUEST_FORMATION_ROLES,
  LEGAL_GUEST_PATHS,
  guestRulePath,
  guestRuleId,
  buildGuestFormationRule,
  buildGuestLegalRule,
  parsePageRules,
  upsertGuestRule,
  upsertGuestLegalRules
}
