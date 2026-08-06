const {
  formationStemFromPath,
  allowFriendlyUnpublishedView,
  stripPageForFriendlyView,
  resolveFormationPageView
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

  it('stripPageForFriendlyView retire render et content', () => {
    const page = stripPageForFriendlyView({ render: '<p>secret</p>', content: '# Secret' })
    expect(page.render).toBe('')
    expect(page.content).toBe('')
  })

  it('resolveFormationPageView refuse hors whitelist', () => {
    const result = resolveFormationPageView({
      page: { render: '<p>x</p>', content: 'x' },
      pagePath: 'formations/slug/stagiaire',
      pageIsPublished: false,
      canWrite: false
    })
    expect(result.denied).toBe(true)
  })

  it('resolveFormationPageView strip friendly pour invité', () => {
    const result = resolveFormationPageView({
      page: { render: '<p>secret</p>', content: '# Secret' },
      pagePath: 'formations/slug/module-01-a',
      pageIsPublished: false,
      canWrite: false
    })
    expect(result.formationUnpublishedFriendly).toBe(true)
    expect(result.page.render).toBe('')
    expect(result.page.content).toBe('')
  })
})
