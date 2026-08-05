const { isRenderedHtml, isStaleMarkdownRender, buildRenderHealthCheck } = require('../../domain/wiki-render')

describe('wiki-render domain', () => {
  it('isRenderedHtml détecte HTML vs MD brut', () => {
    expect(isRenderedHtml('<h1>Test</h1>')).toBe(true)
    expect(isRenderedHtml('# Titre')).toBe(false)
    expect(isRenderedHtml('')).toBe(false)
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
    expect(
      isStaleMarkdownRender({
        editorKey: 'markdown',
        contentType: 'markdown',
        content: '<!-- hub formateur T01 -->',
        render: ''
      })
    ).toBe(true)
  })

  it('isStaleMarkdownRender — contentType text avec MD brut', () => {
    expect(
      isStaleMarkdownRender({
        editorKey: 'markdown',
        contentType: 'text',
        content: '# Titre',
        render: '# Titre'
      })
    ).toBe(true)
  })

  it('buildRenderHealthCheck reflète verifySessionRenders', () => {
    expect(buildRenderHealthCheck({ ok: true, stale: [] })).toMatchObject({
      checkId: 'render_valid',
      level: 'ok',
      blocking: false
    })
    expect(buildRenderHealthCheck({ ok: false, stale: [{ path: 'x' }] })).toMatchObject({
      checkId: 'render_valid',
      level: 'error',
      blocking: true
    })
  })
})
