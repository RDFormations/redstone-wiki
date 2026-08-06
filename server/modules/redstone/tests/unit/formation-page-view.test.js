const { isPagePublished, applyFormationPageView } = require('../../api/middleware/formation-page-view')

describe('formation-page-view middleware', () => {
  it('isPagePublished respecte publishStartDate', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isPagePublished({ isPublished: true, publishStartDate: future })).toBe(false)
  })

  it('applyFormationPageView strip le contenu pour invité S02', () => {
    const result = applyFormationPageView({
      page: { render: '<p>secret</p>', content: '# Secret', isPublished: false },
      pagePath: 'formations/slug/module-01-a',
      canWrite: false
    })
    expect(result.denied).toBeUndefined()
    expect(result.formationUnpublishedFriendly).toBe(true)
    expect(result.page.render).toBe('')
    expect(result.page.content).toBe('')
  })

  it('applyFormationPageView laisse passer formateur', () => {
    const page = { render: '<p>x</p>', content: 'x', isPublished: false }
    const result = applyFormationPageView({
      page,
      pagePath: 'formations/slug/module-01-a',
      canWrite: true
    })
    expect(result.formationUnpublishedFriendly).toBe(false)
    expect(result.page.render).toBe('<p>x</p>')
  })
})
