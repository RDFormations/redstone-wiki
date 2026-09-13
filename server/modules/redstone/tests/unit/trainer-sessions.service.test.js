const { createTrainerSessionsService, slugsFromTrainerGroups, mergeSessions } = require('../../services/trainer-sessions.service')

describe('trainer-sessions.service (T06)', () => {
  it('slugsFromTrainerGroups extrait les slugs', () => {
    expect(slugsFromTrainerGroups(['formateurs-demo-a', 'formateurs-demo-b', 'admins'])).toEqual([
      'demo-a',
      'demo-b'
    ])
  })

  it('mergeSessions déduplique par id', () => {
    const merged = mergeSessions(
      [{ id: '1', slug: 'a' }, { id: '2', slug: 'b' }],
      [{ id: '2', slug: 'b' }, { id: '3', slug: 'c' }]
    )
    expect(merged.map(s => s.id).sort()).toEqual(['1', '2', '3'])
  })

  it('listForUser agrège email + groupes formateurs', async () => {
    const sessionRepo = {
      listByTrainerEmail: jest.fn().mockResolvedValue([
        {
          id: 's-email',
          slug: 'email-slug',
          title: 'Email session',
          client: 'RDF',
          state: 'distributed',
          locale_default: 'fr',
          metadata: { trainer_email: 'trainer@example.com' }
        }
      ]),
      findBySlugs: jest.fn().mockResolvedValue([
        {
          id: 's-group',
          slug: 'group-slug',
          title: 'Group session',
          client: 'M2i',
          state: 'live',
          locale_default: 'fr',
          metadata: {}
        }
      ])
    }
    const contentRepo = {
      listBySession: jest.fn().mockResolvedValue([
        { path: '00-introduction.md', kind: 'intro', published_stagiaire: true },
        { path: 'module-01.md', kind: 'module', published_stagiaire: true }
      ])
    }
    const queryBuilder = {
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([{ name: 'formateurs-group-slug' }])
    }
    const knex = jest.fn(() => queryBuilder)
    const service = createTrainerSessionsService({ sessionRepo, contentRepo, knex })

    const result = await service.listForUser({ id: 7, email: 'trainer@example.com' }, { locale: 'fr' })
    expect(result.ok).toBe(true)
    expect(result.dashboard.total).toBe(2)
    expect(result.dashboard.sessions.map(s => s.slug).sort()).toEqual(['email-slug', 'group-slug'])
    expect(result.dashboard.sessions[0].cockpit_href).toContain('/formateur')
  })
})
