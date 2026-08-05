const { buildStagiaireHub, isPublicHubVisible } = require('../../domain/portal-hub')
const { buildNavBundle } = require('../../domain/nav-bundle')

describe('portal-hub domain', () => {
  const session = {
    slug: 'fr-test',
    title: 'Formation test',
    client: 'RDF',
    state: 'distributed',
    locale_default: 'fr',
    ref_client: 'REF-1',
    starts_at: '2026-08-10T09:00:00Z',
    ends_at: '2026-08-12T17:00:00Z',
    metadata: {
      links: { teams: 'https://teams.example/join' },
      formateur: 'Rayan Mechety'
    }
  }

  it('expose le hub stagiaire sans données Monday sensibles', () => {
    const hub = buildStagiaireHub(session, { siteHost: 'http://localhost:3000' })
    expect(hub.slug).toBe('fr-test')
    expect(hub.stagiaireUrl).toContain('/fr/formations/fr-test/stagiaire')
    expect(hub.links.some(l => l.id === 'teams' && l.url.includes('teams.example'))).toBe(true)
    expect(hub.links.some(l => l.id === 'legal')).toBe(true)
    expect(hub.welcome).toContain('disponible')
    expect(JSON.stringify(hub)).not.toContain('monday_item_id')
  })

  it('masque le support si pas encore distribué', () => {
    const hub = buildStagiaireHub({ ...session, state: 'draft_ready' }, { siteHost: 'http://x' })
    const support = hub.links.find(l => l.id === 'support')
    expect(support.url).toBe('')
  })

  it('isPublicHubVisible filtre draft/incomplete', () => {
    expect(isPublicHubVisible('distributed')).toBe(true)
    expect(isPublicHubVisible('draft')).toBe(false)
    expect(isPublicHubVisible('incomplete')).toBe(false)
  })
})

describe('nav-bundle domain', () => {
  it('mappe les items nav vers le format sidebar', () => {
    const session = { slug: 'abc', title: 'ABC', locale_default: 'fr', wiki_path: '/formations/abc' }
    const nav = {
      audience: 'stagiaire',
      items: [
        { path: '00-introduction', title: 'Intro', published: true, href: '/formations/abc' },
        { path: 'module-01-a', title: 'M1', published: true, href: '/formations/abc/module-01-a' }
      ],
      progress: { published_modules: 1, total_modules: 1, label: '1/1' }
    }
    const bundle = buildNavBundle(session, nav)
    expect(bundle.items[0].path).toBe('formations/abc')
    expect(bundle.items[1].path).toBe('formations/abc/module-01-a')
    expect(bundle.items[1].isPublished).toBe(true)
  })
})
