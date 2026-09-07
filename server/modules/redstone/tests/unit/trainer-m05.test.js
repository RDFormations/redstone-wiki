const { createTrainerAccessService, nameFromEmail } = require('../../services/trainer-access.service')
const { buildTrainerPageRule } = require('../../domain/trainer-access')

describe('trainer-access M05 provision', () => {
  it('nameFromEmail dérive un nom', () => {
    expect(nameFromEmail('jean.dupont@example.fr')).toContain('Jean')
  })

  it('crée un compte local si email inconnu', async () => {
    const userGroups = []
    let userInserted = null
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
            first: async () => null
          }),
          insert: row => {
            userInserted = row
            return { returning: async () => [{ id: 99 }] }
          }
        }
      }
      if (table === 'userGroups') {
        return {
          where: () => ({ first: async () => null }),
          insert: row => { userGroups.push(row) }
        }
      }
      return { where: () => ({ first: async () => null }) }
    }

    const svc = createTrainerAccessService({
      knex,
      createLocalUser: async ({ email }) => ({ id: 99, email, created: true }),
      logger: { info: () => {}, warn: () => {} }
    })

    const result = await svc.ensureSessionTrainerAccess({
      slug: 'x',
      metadata: { trainer_email: 'nouveau@test.fr' }
    })

    expect(result.assignment.ok).toBe(true)
    expect(result.assignment.provisioned).toBe(true)
    expect(result.assignment.user_id).toBe(99)
    expect(userGroups).toHaveLength(1)
    expect(userInserted).toBeNull() // createLocalUser injecté
  })
})
