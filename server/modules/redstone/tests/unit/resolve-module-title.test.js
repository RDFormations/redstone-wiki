const { resolveModuleTitle } = require('../../domain/resolve-module-title')

describe('resolveModuleTitle', () => {
  it('intro : titre lisible au lieu du stem', () => {
    expect(resolveModuleTitle({
      path: '00-introduction',
      title: '00-introduction',
      body_md: ''
    })).toBe('Introduction')
  })

  it('conserve un titre frontmatter explicite', () => {
    expect(resolveModuleTitle({
      path: '00-introduction',
      title: '00-introduction',
      frontmatter: { title: 'Bienvenue' },
      body_md: ''
    })).toBe('Bienvenue')
  })
})
