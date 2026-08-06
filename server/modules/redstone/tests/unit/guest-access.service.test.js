const {
  buildGuestFormationRule,
  upsertGuestRule,
  upsertGuestLegalRules,
  parsePageRules,
  guestRulePath
} = require('../../domain/guest-access')
const { createGuestAccessService } = require('../../services/guest-access.service')

describe('guest-access domain', () => {
  it('construit le chemin formations/slug', () => {
    expect(guestRulePath('fr-test')).toBe('formations/fr-test')
    expect(guestRulePath('/fr-test')).toBe('formations/fr-test')
  })

  it('upsert idempotent sur les règles', () => {
    const first = upsertGuestRule([], 'abc')
    expect(first).toHaveLength(1)
    const second = upsertGuestRule(first, 'abc')
    expect(second).toHaveLength(1)
    expect(second[0].id).toBe(buildGuestFormationRule('abc').id)
  })

  it('parse pageRules string JSON', () => {
    const rules = parsePageRules('[{"id":"x","path":"a"}]')
    expect(rules[0].path).toBe('a')
  })

  it('upsertGuestLegalRules ajoute mentions-legales et politique', () => {
    const rules = upsertGuestLegalRules([])
    expect(rules.map(r => r.path)).toEqual(
      expect.arrayContaining(['mentions-legales', 'politique-confidentialite'])
    )
  })
})

describe('guest-access service', () => {
  it('ajoute une règle Guests si absente', async () => {
    const updates = []
    const knex = table => ({
      where: () => ({
        first: async () =>
          table === 'groups'
            ? { id: 2, pageRules: JSON.stringify([]) }
            : null,
        update: async patch => {
          updates.push(patch)
        }
      })
    })
    const svc = createGuestAccessService({
      knex,
      reloadAuthGroups: async () => {},
      logger: { info: () => {}, warn: () => {} }
    })
    const result = await svc.ensureGuestFormationAccess('e2e-slug')
    expect(result.ok).toBe(true)
    expect(result.created).toBe(true)
    expect(updates[0].pageRules).toContain('formations/e2e-slug')
  })

  it('ne réécrit pas si règle déjà présente', async () => {
    const existing = upsertGuestRule([], 'already')
    let updated = false
    const knex = () => ({
      where: () => ({
        first: async () => ({ id: 2, pageRules: JSON.stringify(existing) }),
        update: async () => {
          updated = true
        }
      })
    })
    const svc = createGuestAccessService({ knex, logger: { info: () => {}, warn: () => {} } })
    const result = await svc.ensureGuestFormationAccess('already')
    expect(result.ok).toBe(true)
    expect(result.created).toBe(false)
    expect(updated).toBe(false)
  })
})
