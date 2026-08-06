const {
  trainerGroupName,
  trainerRulePath,
  buildTrainerPageRule,
  resolveTrainerEmail
} = require('../../domain/trainer-access')
const { createTrainerAccessService } = require('../../services/trainer-access.service')

describe('trainer-access domain', () => {
  it('nomme le groupe formateurs-{slug}', () => {
    expect(trainerGroupName('quiris-m365')).toBe('formateurs-quiris-m365')
    expect(trainerRulePath('quiris-m365')).toBe('formations/quiris-m365')
  })

  it('règle page scoped START sur formations/slug', () => {
    const rule = buildTrainerPageRule('abc')
    expect(rule.path).toBe('formations/abc')
    expect(rule.match).toBe('START')
    expect(rule.deny).toBe(false)
    expect(rule.roles).toContain('write:pages')
  })

  it('resolveTrainerEmail depuis metadata', () => {
    expect(resolveTrainerEmail({ metadata: { trainer_email: 'a@b.fr' } })).toBe('a@b.fr')
    expect(resolveTrainerEmail({ metadata: { monday: { formateur: 'x@y.fr' } } })).toBe('x@y.fr')
    expect(resolveTrainerEmail({ metadata: { monday: { formateur: 'Rayan' } } })).toBeNull()
  })
})

describe('trainer-access service', () => {
  it('crée un groupe formateurs-{slug}', async () => {
    const inserts = []
    const knex = table => {
      if (table === 'groups') {
        return {
          where: () => ({
            first: async () => null,
            update: jest.fn()
          }),
          insert: row => {
            inserts.push(row)
            return { returning: async () => [{ id: 42 }] }
          }
        }
      }
      return { where: () => ({ first: async () => null }) }
    }
    const svc = createTrainerAccessService({
      knex,
      reloadAuthGroups: async () => {},
      logger: { info: () => {}, warn: () => {} }
    })
    const result = await svc.ensureTrainerGroup('test-slug')
    expect(result.ok).toBe(true)
    expect(result.created).toBe(true)
    expect(result.group_name).toBe('formateurs-test-slug')
    expect(inserts[0].pageRules).toContain('formations/test-slug')
  })

  it('assigne un utilisateur existant au groupe', async () => {
    const userGroups = []
    const knex = table => {
      if (table === 'groups') {
        return {
          where: () => ({
            first: async () => ({
              id: 10,
              name: 'formateurs-x',
              pageRules: JSON.stringify([buildTrainerPageRule('x')]),
              redirectOnLogin: '/formations/x/formateur'
            }),
            update: jest.fn()
          })
        }
      }
      if (table === 'users') {
        return {
          where: () => ({
            first: async () => ({ id: 5, email: 'trainer@test.fr' })
          })
        }
      }
      if (table === 'userGroups') {
        return {
          where: () => ({
            first: async () => null
          }),
          insert: row => {
            userGroups.push(row)
          }
        }
      }
      return { where: () => ({ first: async () => null }) }
    }
    const svc = createTrainerAccessService({
      knex,
      logger: { info: () => {}, warn: () => {} }
    })
    const result = await svc.ensureSessionTrainerAccess(
      { slug: 'x', metadata: { trainer_email: 'trainer@test.fr' } }
    )
    expect(result.assignment.ok).toBe(true)
    expect(result.assignment.assigned).toBe(true)
    expect(userGroups).toEqual([{ userId: 5, groupId: 10 }])
  })

  it('signale user_not_found sans bloquer le groupe', async () => {
    const knex = table => {
      if (table === 'groups') {
        return {
          where: () => ({
            first: async () => null
          }),
          insert: () => ({ returning: async () => [{ id: 11 }] })
        }
      }
      if (table === 'users') {
        return { where: () => ({ first: async () => null }) }
      }
      return { where: () => ({ first: async () => null }) }
    }
    const svc = createTrainerAccessService({
      knex,
      reloadAuthGroups: async () => {},
      logger: { info: () => {}, warn: () => {} }
    })
    const result = await svc.ensureSessionTrainerAccess(
      { slug: 'y', metadata: { trainer_email: 'missing@test.fr' } }
    )
    expect(result.ok).toBe(true)
    expect(result.assignment.reason).toBe('user_not_found')
  })
})
