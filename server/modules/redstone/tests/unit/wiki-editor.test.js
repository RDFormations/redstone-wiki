const { resolveContentType, resolveFromWikiEditors } = require('../../domain/wiki-editor')

describe('wiki-editor domain', () => {
  it('markdown editor → contentType markdown (pipeline markdownCore)', () => {
    expect(resolveContentType('markdown')).toBe('markdown')
  })

  it('fallback markdown pour éditeur inconnu', () => {
    expect(resolveContentType('unknown')).toBe('markdown')
  })

  it('resolveFromWikiEditors utilise WIKI.data.editors si présent', () => {
    expect(
      resolveFromWikiEditors('markdown', [{ key: 'markdown', contentType: 'markdown' }])
    ).toBe('markdown')
  })
})
