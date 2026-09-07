const { parseFormationEditPath, formationEditUrl } = require('../../domain/formation-edit-path')

describe('formation-edit-path F06', () => {
  it('parse hub /formations/{slug}/edit', () => {
    expect(parseFormationEditPath('/formations/quiris-admin/edit')).toEqual({
      slug: 'quiris-admin',
      moduleStem: null,
      hubPath: 'formations/quiris-admin/edit',
      fullPath: 'formations/quiris-admin/edit'
    })
  })

  it('parse module /formations/{slug}/edit/{module}', () => {
    const parsed = parseFormationEditPath('formations/Demo/edit/module-01-a.md')
    expect(parsed.slug).toBe('demo')
    expect(parsed.moduleStem).toBe('module-01-a')
    expect(parsed.fullPath).toBe('formations/demo/edit/module-01-a')
  })

  it('rejette chemins hors edit', () => {
    expect(parseFormationEditPath('/formations/x/stagiaire')).toBeNull()
    expect(parseFormationEditPath('')).toBeNull()
  })

  it('formationEditUrl encode stem + locale', () => {
    expect(formationEditUrl('slug', 'module 01', 'en')).toBe(
      '/en/formations/slug/edit/module%2001'
    )
    expect(formationEditUrl('slug')).toBe('/fr/formations/slug/edit')
  })
})
