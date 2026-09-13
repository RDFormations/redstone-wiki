const {
  buildTrainerSessionCard,
  sortTrainerSessionCards,
  sessionMatchesTrainerEmail,
  stateLabel
} = require('../../domain/formateur-sessions')

const session = (overrides = {}) => ({
  id: 's1',
  slug: 'demo-a',
  title: 'Formation A',
  client: 'RDF',
  state: 'distributed',
  ref_client: 'REF-A',
  starts_at: '2026-09-20T09:00:00Z',
  ends_at: '2026-09-22T17:00:00Z',
  content_ready_at: '2026-09-01T00:00:00Z',
  distributed_at: '2026-09-02T00:00:00Z',
  locale_default: 'fr',
  metadata: {
    trainer_email: 'formateur@example.com',
    links: { teams: 'https://teams.example', emargement: '' }
  },
  ...overrides
})

const modules = () => [
  { path: '00-introduction.md', kind: 'intro', title: 'Intro', published_stagiaire: true },
  { path: 'module-01-a.md', kind: 'module', title: 'Module 1', published_stagiaire: false }
]

describe('formateur-sessions domain (T06)', () => {
  it('stateLabel retourne un libellé français', () => {
    expect(stateLabel('distributed')).toBe('Distribué')
    expect(stateLabel('incomplete')).toBe('Incomplet')
  })

  it('sessionMatchesTrainerEmail résout les métadonnées Monday', () => {
    expect(sessionMatchesTrainerEmail(session(), 'formateur@example.com')).toBe(true)
    expect(sessionMatchesTrainerEmail(session(), 'autre@example.com')).toBe(false)
  })

  it('buildTrainerSessionCard expose cockpit, dates et indicateurs T10′', () => {
    const card = buildTrainerSessionCard(session(), modules(), { locale: 'fr' })
    expect(card.slug).toBe('demo-a')
    expect(card.dates.label).toContain('2026')
    expect(card.cockpit_href).toBe('/fr/formations/demo-a/formateur')
    expect(card.publication_percent).toBe(0)
    expect(card.indicators.teams.ok).toBe(true)
    expect(card.indicators.emargement.ok).toBe(false)
  })

  it('sortTrainerSessionCards place incomplete avant distributed puis par date', () => {
    const cards = sortTrainerSessionCards([
      buildTrainerSessionCard(session({ slug: 'late', starts_at: '2026-10-01T09:00:00Z' }), modules()),
      buildTrainerSessionCard(session({ slug: 'soon', starts_at: '2026-09-10T09:00:00Z', state: 'incomplete' }), modules()),
      buildTrainerSessionCard(session({ slug: 'mid', starts_at: '2026-09-15T09:00:00Z' }), modules())
    ])
    expect(cards.map(c => c.slug)).toEqual(['soon', 'mid', 'late'])
  })
})
