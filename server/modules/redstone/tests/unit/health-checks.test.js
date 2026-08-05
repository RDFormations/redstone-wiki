const { runHealthChecks, FORBIDDEN_PLACEHOLDER } = require('../../domain/health-checks')

const long = n => 'x'.repeat(n)

const baseSession = { slug: 'test', metadata: {} }

describe('health-checks', () => {
  it('passe si intro + triplets + longueurs OK', () => {
    const modules = [
      { path: '00-introduction', body_md: long(900), kind: 'intro' },
      { path: 'module-01-a', body_md: long(900), kind: 'module' },
      { path: 'exercice-01-a', body_md: long(250), kind: 'exercice', frontmatter: { paired: 'correction-01-a' } },
      { path: 'correction-01-a', body_md: long(350), kind: 'correction', frontmatter: { paired: 'exercice-01-a' } }
    ]
    const result = runHealthChecks(baseSession, modules)
    expect(result.ok).toBe(true)
    expect(result.checks.some(c => c.checkId === 'intro_present' && c.level === 'ok')).toBe(true)
  })

  it('bloque si intro manquante', () => {
    const modules = [{ path: 'module-01-a', body_md: long(900), kind: 'module' }]
    const result = runHealthChecks(baseSession, modules)
    expect(result.ok).toBe(false)
    expect(result.checks.find(c => c.checkId === 'intro_present').blocking).toBe(true)
  })

  it('bloque sur placeholder interdit', () => {
    const modules = [
      { path: '00-introduction', body_md: long(900) },
      { path: 'module-01-a', body_md: `# Module\n\n${long(800)} TODO à compléter`, kind: 'module' }
    ]
    const result = runHealthChecks(baseSession, modules)
    expect(result.ok).toBe(false)
    expect(result.checks.some(c => c.checkId === 'forbidden_placeholder')).toBe(true)
    expect(FORBIDDEN_PLACEHOLDER.test('TODO')).toBe(true)
  })

  it('avertit si liens Teams/émargement absents (non bloquant)', () => {
    const modules = [{ path: '00-introduction', body_md: long(900) }]
    const result = runHealthChecks(baseSession, modules)
    const teams = result.checks.find(c => c.checkId === 'teams_link')
    const emarg = result.checks.find(c => c.checkId === 'emargement_link')
    expect(teams.level).toBe('warning')
    expect(teams.blocking).toBe(false)
    expect(emarg.level).toBe('warning')
  })

  it('bloque published agent sur module si agentImport', () => {
    const modules = [
      { path: '00-introduction', body_md: long(900) },
      { path: 'module-01-a', body_md: long(900), kind: 'module', published_stagiaire: true }
    ]
    const result = runHealthChecks(baseSession, modules, { agentImport: true })
    expect(result.ok).toBe(false)
    expect(result.checks.some(c => c.checkId === 'published_forbidden_agent')).toBe(true)
  })
})
