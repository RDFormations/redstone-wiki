const {
  formationStemFromPath,
  allowFriendlyUnpublishedView
} = require('../../domain/formation-page-access')

describe('formation-page-access domain', () => {
  it('formationStemFromPath extrait le stem', () => {
    expect(formationStemFromPath('formations/quiris-admin-m365')).toBe('00-introduction')
    expect(formationStemFromPath('formations/quiris-admin-m365/module-01-a')).toBe('module-01-a')
  })

  it('allowFriendlyUnpublishedView pour module/exercice/correction uniquement', () => {
    expect(allowFriendlyUnpublishedView('formations/slug/module-01-a')).toBe(true)
    expect(allowFriendlyUnpublishedView('formations/slug/exercice-01-a')).toBe(true)
    expect(allowFriendlyUnpublishedView('formations/slug/stagiaire')).toBe(false)
    expect(allowFriendlyUnpublishedView('formations/slug')).toBe(false)
  })
})
