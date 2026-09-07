const {
  isNavItemVisible,
  isModuleBlockVisible,
  filterNavItemsForAudience
} = require('../../domain/nav-visibility')

describe('nav-visibility — sidebar stagiaire', () => {
  const pub = { path: 'formations/x/module-01-a', isPublished: true, title: 'M1' }
  const draft = { path: 'formations/x/module-02-b', isPublished: false, title: 'M2' }

  it('stagiaire : item publié visible, brouillon caché', () => {
    expect(isNavItemVisible(pub, { canSeeUnpublished: false })).toBe(true)
    expect(isNavItemVisible(draft, { canSeeUnpublished: false })).toBe(false)
  })

  it('formateur : brouillon visible', () => {
    expect(isNavItemVisible(draft, { canSeeUnpublished: true })).toBe(true)
  })

  it('filtre la liste sans placeholders', () => {
    const filtered = filterNavItemsForAudience([pub, draft], { canSeeUnpublished: false })
    expect(filtered).toEqual([pub])
  })

  it('bloc module : exo/corr publiés séparément sans module', () => {
    const block = {
      module: draft,
      practice: {
        exercice: { ...pub, path: 'formations/x/exercice-02-b', isPublished: true },
        correction: { path: 'formations/x/correction-02-b', isPublished: false, title: 'C' }
      }
    }
    expect(isModuleBlockVisible(block, { canSeeUnpublished: false })).toBe(true)
    const onlyDraft = {
      module: draft,
      practice: {
        exercice: { path: 'formations/x/exercice-02-b', isPublished: false },
        correction: { path: 'formations/x/correction-02-b', isPublished: false }
      }
    }
    expect(isModuleBlockVisible(onlyDraft, { canSeeUnpublished: false })).toBe(false)
  })
})
