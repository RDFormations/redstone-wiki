const {
  evaluateCourseReady,
  evaluateSessionIndicators,
  hoursUntilStart
} = require('../../domain/session-readiness')

const long = n => 'x'.repeat(n)

const baseSession = {
  state: 'distributed',
  content_ready_at: '2026-08-01T00:00:00Z',
  starts_at: '2026-08-10T09:00:00Z',
  metadata: {
    planning: [{ day: 1, modules: ['module-01-a'] }],
    links: { teams: 'https://teams.example', emargement: '' }
  }
}

const baseModules = () => [
  { path: '00-introduction', kind: 'intro', body_md: long(900) },
  { path: 'module-01-a', kind: 'module', body_md: long(900) }
]

describe('session-readiness domain', () => {
  it('evaluateCourseReady valide intro + modules jour 1', () => {
    const ready = evaluateCourseReady(baseSession, baseModules())
    expect(ready.ready).toBe(true)
    expect(ready.issues).toHaveLength(0)
  })

  it('evaluateCourseReady ne exige pas publication stagiaire J1 (CDC §7.4)', () => {
    const modules = baseModules().map(m => ({ ...m, published_stagiaire: false }))
    const ready = evaluateCourseReady(baseSession, modules)
    expect(ready.ready).toBe(true)
    expect(ready.issues).toHaveLength(0)
  })

  it('evaluateCourseReady échoue si module jour 1 absent', () => {
    const modules = baseModules().filter(m => m.path !== 'module-01-a')
    const ready = evaluateCourseReady(baseSession, modules)
    expect(ready.ready).toBe(false)
    expect(ready.issues).toContain('missing:module-01-a')
  })

  it('evaluateCourseReady échoue si QA absente', () => {
    const ready = evaluateCourseReady(
      { ...baseSession, content_ready_at: null },
      baseModules()
    )
    expect(ready.ready).toBe(false)
    expect(ready.issues).toContain('qa')
  })

  it('evaluateSessionIndicators signale Teams/émargement et alerte J-48 h', () => {
    const starts = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const indicators = evaluateSessionIndicators(
      { ...baseSession, starts_at: starts, content_ready_at: null },
      baseModules()
    )
    expect(indicators.teams.ok).toBe(true)
    expect(indicators.emargement.ok).toBe(false)
    expect(indicators.readiness.within_j48).toBe(true)
    expect(indicators.readiness.alert).toBe(true)
    expect(hoursUntilStart(starts)).toBeLessThanOrEqual(48)
  })
})
