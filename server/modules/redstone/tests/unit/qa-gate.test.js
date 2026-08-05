const { runQaGate } = require('../../domain/qa-gate')

const longBody = 'x'.repeat(900)

const baseTriplet = suffix => ([
  { path: `module-${suffix}`, body_md: longBody, frontmatter: {} },
  { path: `exercice-${suffix}`, body_md: 'x'.repeat(250), frontmatter: { paired: `correction-${suffix}` } },
  { path: `correction-${suffix}`, body_md: 'x'.repeat(350), frontmatter: { paired: `exercice-${suffix}` } }
])

describe('qa-gate', () => {
  it('vert sur triplet valide', () => {
    const modules = [
      { path: '00-introduction', body_md: longBody, frontmatter: {} },
      ...baseTriplet('01-test')
    ]
    const report = runQaGate('test-slug', modules)
    expect(report.status).toBe('green')
    expect(report.score).toBeGreaterThanOrEqual(90)
  })

  it('rouge si published true sur module', () => {
    const modules = [
      { path: 'module-01-a', body_md: longBody, frontmatter: { published: true } },
      { path: 'exercice-01-a', body_md: 'x'.repeat(250), frontmatter: {} },
      { path: 'correction-01-a', body_md: 'x'.repeat(350), frontmatter: {} }
    ]
    const report = runQaGate('test-slug', modules)
    expect(report.status).toBe('red')
    expect(report.issues.some(i => i.code === 'PUBLISHED_SHOULD_BE_FALSE')).toBe(true)
  })

  it('rouge si TODO présent', () => {
    const modules = [
      { path: 'module-01-a', body_md: longBody + '\nTODO fix', frontmatter: {} }
    ]
    const report = runQaGate('test-slug', modules)
    expect(report.status).toBe('red')
  })
})
