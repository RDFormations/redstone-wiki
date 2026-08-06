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

  it('chaînes vides', () => {
    expect(summarizeDiff(diffLines('', '')).unchanged).toBe(1)
    expect(summarizeDiff(diffLines('', 'nouveau')).added).toBe(1)
    expect(summarizeDiff(diffLines('ancien', '')).removed).toBe(1)
  })

  it('remplacement complet', () => {
    const summary = summarizeDiff(diffLines('a\nb\nc', 'x\ny'))
    expect(summary.removed).toBe(3)
    expect(summary.added).toBe(2)
    expect(summary.unchanged).toBe(0)
  })

  it('ajout en fin de fichier', () => {
    const hunks = diffLines('ligne 1', 'ligne 1\nligne 2')
    expect(summarizeDiff(hunks).added).toBe(1)
    expect(summarizeDiff(hunks).unchanged).toBe(1)
  })
})
