const { checkTriplets } = require('../../domain/pair-rules')

describe('pair-rules', () => {
  it('détecte triplet complet', () => {
    const modules = [
      { path: 'module-01-a' },
      { path: 'exercice-01-a' },
      { path: 'correction-01-a' }
    ]
    const result = checkTriplets(modules)
    expect(result.complete).toBe(1)
    expect(result.incomplete).toBe(0)
    expect(result.issues).toHaveLength(0)
  })

  it('détecte triplet incomplet', () => {
    const modules = [{ path: 'module-01-a' }, { path: 'exercice-01-a' }]
    const result = checkTriplets(modules)
    expect(result.incomplete).toBe(1)
    expect(result.issues[0].checkId).toBe('triplet_incomplete')
  })
})
