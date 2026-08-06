const { diffLines, summarizeDiff } = require('../../domain/text-diff')

describe('text-diff', () => {
  it('détecte ajouts et suppressions', () => {
    const hunks = diffLines('ligne 1\nligne 2', 'ligne 1\nligne 3')
    const summary = summarizeDiff(hunks)
    expect(summary.added).toBe(1)
    expect(summary.removed).toBe(1)
    expect(summary.unchanged).toBe(1)
  })

  it('contenu identique → tout unchanged', () => {
    const hunks = diffLines('a\nb', 'a\nb')
    expect(summarizeDiff(hunks).unchanged).toBe(2)
    expect(summarizeDiff(hunks).added).toBe(0)
  })
})
