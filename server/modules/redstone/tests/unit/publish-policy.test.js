const {
  pageKind,
  defaultPublishedStagiaire,
  agentMaySetPublished,
  wikiPagePath,
  pairedStem
} = require('../../domain/publish-policy')

describe('publish-policy', () => {
  it('détecte les kinds', () => {
    expect(pageKind('module-01-intro')).toBe('module')
    expect(pageKind('exercice-01-intro')).toBe('exercice')
    expect(pageKind('00-introduction')).toBe('intro')
  })

  it('intro publiée par défaut', () => {
    expect(defaultPublishedStagiaire('00-introduction', {})).toBe(true)
    expect(defaultPublishedStagiaire('module-01-x', {})).toBe(false)
  })

  it('agent ne peut pas publier module restreint', () => {
    expect(agentMaySetPublished('module-01-x', {})).toBe(false)
  })

  it('wikiPagePath', () => {
    expect(wikiPagePath('my-slug', '00-introduction')).toBe('formations/my-slug')
    expect(wikiPagePath('my-slug', 'module-01')).toBe('formations/my-slug/module-01')
  })

  it('pairedStem exercice/correction', () => {
    expect(pairedStem('exercice-01-lab', {})).toBe('correction-01-lab')
    expect(pairedStem('correction-01-lab', {})).toBe('exercice-01-lab')
  })
})
