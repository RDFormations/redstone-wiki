const {
  buildFormateurHub,
  isModulePublished,
  publicationSummary
} = require('../../domain/formateur-hub')

const long = n => 'x'.repeat(n)

const baseSession = {
  id: 'sess-1',
  slug: 'fr-test',
  title: 'Formation test',
  client: 'RDF',
  state: 'distributed',
  locale_default: 'fr',
  ref_client: 'REF-1',
  monday_item_id: 12345678,
  starts_at: '2026-08-10T09:00:00Z',
  ends_at: '2026-08-12T17:00:00Z',
  content_ready_at: '2026-08-01T00:00:00Z',
  distributed_at: '2026-08-02T00:00:00Z',
  metadata: {
    links: { teams: 'https://teams.example/join', emargement: 'https://emarg.example' },
    formateur: 'Rayan Mechety',
    planning: [{ day: 1, date: '2026-08-10', modules: ['module-01-a'] }]
  }
}

const modules = () => [
  { path: '00-introduction', kind: 'intro', title: 'Intro', body_md: long(900), published_stagiaire: true },
  { path: 'module-01-a', kind: 'module', title: 'Module 1', body_md: long(900), published_stagiaire: false },
  { path: 'exercice-01-a', kind: 'exercice', title: 'Exo 1', body_md: long(250), published_stagiaire: false },
  { path: 'correction-01-a', kind: 'correction', title: 'Corr 1', body_md: long(350), published_stagiaire: false }
]

describe('formateur-hub domain', () => {
  it('construit le hub formateur depuis session LMS', () => {
    const hub = buildFormateurHub(baseSession, modules(), { siteHost: 'http://localhost:3000' })
    expect(hub.slug).toBe('fr-test')
    expect(hub.sessionId).toBe('sess-1')
    expect(hub.content_ready).toBe(true)
    expect(hub.distributed).toBe(true)
    expect(hub.schedule).toHaveLength(1)
    expect(hub.schedule[0].modules[0].stem).toBe('module-01-a')
    expect(hub.monday.url).toContain('12345678')
    expect(hub.stagiaireQrSvg).toContain('<svg')
    expect(JSON.stringify(hub)).not.toContain('monday_item_id')
  })

  it('isModulePublished reflète uniquement le module', () => {
    const mods = modules().map(m => ({ ...m, published_stagiaire: true }))
    mods.find(m => m.path === 'exercice-01-a').published_stagiaire = false
    expect(isModulePublished('module-01-a', mods)).toBe(true)
    mods.find(m => m.path === 'module-01-a').published_stagiaire = false
    expect(isModulePublished('module-01-a', mods)).toBe(false)
  })

  it('publicationSummary compte les modules', () => {
    const summary = publicationSummary(modules())
    expect(summary.total).toBe(1)
    expect(summary.published).toBe(0)
    expect(summary.draft).toBe(1)
  })
})
