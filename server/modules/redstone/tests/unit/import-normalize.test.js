const { normalizeModuleInput } = require('../../domain/import-normalize')

describe('import-normalize', () => {
  it('parse content markdown avec frontmatter', () => {
    const result = normalizeModuleInput({
      path: 'module-01-a.md',
      content: '---\ntitle: Mon module\npaired: exercice-01-a\n---\nCorps du module.'
    })
    expect(result.path).toBe('module-01-a')
    expect(result.body_md).toContain('Corps du module')
    expect(result.frontmatter.title).toBe('Mon module')
    expect(result.title).toBe('Mon module')
  })

  it('accepte body_md explicite (pipeline agent)', () => {
    const result = normalizeModuleInput({
      path: '00-introduction.md',
      body_md: '# Intro',
      frontmatter: { title: 'Introduction' },
      title: 'Intro custom'
    })
    expect(result.path).toBe('00-introduction')
    expect(result.body_md).toBe('# Intro')
    expect(result.title).toBe('Intro custom')
  })

  it('dérive le titre depuis le path si absent', () => {
    const result = normalizeModuleInput({
      filename: 'exercice-02-b.md',
      content: '---\n---\nContenu exercice.'
    })
    expect(result.path).toBe('exercice-02-b')
    expect(result.title).toBe('exercice-02-b')
  })
})
