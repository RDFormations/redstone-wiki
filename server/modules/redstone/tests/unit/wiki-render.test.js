const { isRenderedHtml, isStaleMarkdownRender } = require('../../domain/wiki-render')

describe('wiki-render domain', () => {
  it('isRenderedHtml détecte HTML vs MD brut', () => {
    expect(isRenderedHtml('<h1>Test</h1>')).toBe(true)
    expect(isRenderedHtml('# Titre')).toBe(false)
    expect(isRenderedHtml('')).toBe(true)
  })

  it('isStaleMarkdownRender — page markdown non rendue', () => {
    expect(
      isStaleMarkdownRender({
        editorKey: 'markdown',
        contentType: 'markdown',
        content: '# Titre',
        render: '# Titre'
      })
    ).toBe(true)
    expect(
      isStaleMarkdownRender({
        editorKey: 'markdown',
        contentType: 'markdown',
        content: '# Titre',
        render: '<h1>Titre</h1>'
      })
    ).toBe(false)
  })
})
